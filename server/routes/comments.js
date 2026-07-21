const express = require('express');
const { Op } = require('sequelize');
const { Comment, Vote } = require('../models/index.js');
const { addCommentToQueue } = require('../worker/commentWorker.js');
const { isAuthenticated, resolveAuthUser } = require('../middleware/auth.js');
const { parseVoteValue, castVote } = require('../services/voteService.js');

const commentsRouter = express.Router();

function serializeComment(comment) {
  return typeof comment.toJSON === 'function' ? comment.toJSON() : comment;
}

async function addCurrentUserVote(req, comments) {
  const authUser = await resolveAuthUser(req);
  if (!authUser || comments.length === 0) {
    return comments.map((comment) => ({
      ...serializeComment(comment),
      currentUserVote: null,
    }));
  }

  const votes = await Vote.findAll({
    where: {
      UserId: authUser.id,
      CommentId: { [Op.in]: comments.map((comment) => comment.id) },
    },
  });
  const voteByCommentId = new Map(votes.map((vote) => [String(vote.CommentId), vote.value]));

  return comments.map((comment) => ({
    ...serializeComment(comment),
    currentUserVote: voteByCommentId.get(String(comment.id)) ?? null,
  }));
}

commentsRouter.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

commentsRouter.get('/', async (req, res) => {
  try {
    const { proposalId } = req.query;
    if (!proposalId) {
      return res.status(400).json({ error: 'proposalId is required' });
    }

    const comments = await Comment.findAll({
      where: { proposalId: String(proposalId), status: 'approved' },
      order: [['createdAt', 'ASC']],
    });
    res.json(await addCurrentUserVote(req, comments));
  } catch (error) {
    console.error('[ROUTE ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

commentsRouter.post('/', isAuthenticated, async (req, res) => {
  try {
    const content = (req.body.content || '').trim();
    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }
    if (!req.body.proposalId) {
      return res.status(400).json({ error: 'proposalId is required' });
    }

    const comment = await Comment.create({
      content,
      proposalId: String(req.body.proposalId),
      userId: req.user.authUserId,
      authorName: req.body.authorName || req.user.email || 'Anonymous',
      relatedRidings: req.body.relatedRidings || [],
      status: 'pending',
    });

    addCommentToQueue(comment.id);

    const io = req.app.get('io');
    if (io) {
      io.to(`proposal:${comment.proposalId}`).emit('comment:created', {
        id: comment.id,
        proposalId: comment.proposalId,
        status: comment.status,
      });
    }

    res.status(202).json({
      message: 'Comment submitted for AI review',
      id: comment.id,
    });
  } catch (error) {
    console.error('[ROUTE ERROR]', error);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

commentsRouter.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    if (String(comment.userId) !== String(req.user.authUserId)) {
      return res.status(403).json({
        error: 'Forbidden. You can only delete your own comments.',
      });
    }

    await comment.destroy();

    const io = req.app.get('io');
    if (io) {
      io.to(`proposal:${comment.proposalId}`).emit('comment:deleted', {
        id: comment.id,
        proposalId: comment.proposalId,
      });
    }

    res.status(204).end();
  } catch (error) {
    console.error('[DELETE ERROR]', error);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

/**
 * PATCH /api/comments/:id/vote
 * Body: { "value": 1 } or { "value": -1 }
 * Also accepts legacy { "action": "upvote"|"downvote" }
 */
commentsRouter.patch('/:id/vote', isAuthenticated, async (req, res) => {
  try {
    const value = parseVoteValue(req.body);
    if (value !== 1 && value !== -1) {
      return res.status(400).json({ error: 'value must be 1 or -1' });
    }

    const comment = await Comment.findByPk(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const result = await castVote({
      localUserId: req.user.id,
      proposalId: null,
      commentId: comment.id,
      value,
      target: comment,
      upvoteField: 'upvotes',
      downvoteField: 'downvotes',
    });

    const payload = {
      id: comment.id,
      proposalId: comment.proposalId,
      upvotes: result.upvotes,
      downvotes: result.downvotes,
      currentUserVote: result.currentUserVote,
    };

    const io = req.app.get('io');
    if (io) {
      io.to(`proposal:${comment.proposalId}`).emit('comment:voteUpdated', payload);
    }

    res.json(payload);
  } catch (error) {
    if (error.status === 409) {
      return res.status(409).json({ error: error.message });
    }
    console.error('[VOTE ERROR]', error);
    res.status(500).json({ error: 'Voting failed' });
  }
});

module.exports = commentsRouter;
