const express = require('express');
const { Op } = require('sequelize');
const { Proposal, Comment, Vote } = require('../models/index.js');
const { isAuthenticated, resolveAuthUser } = require('../middleware/auth.js');
const { addCommentToQueue } = require('../worker/commentWorker.js');
const { parseVoteValue, castVote } = require('../services/voteService.js');

const proposalsRouter = express.Router();

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

proposalsRouter.get('/', async (req, res) => {
  try {
    const sort = String(req.query.sort || 'newest').toLowerCase();
    const minVotes = parsePositiveInt(req.query.minVotes, 0);
    const page = parsePositiveInt(req.query.page, 0);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20) || 20, 100);
    const offset = page * limit;

    const where = {};
    if (minVotes > 0) {
      where.postLikes = { [Op.gte]: minVotes };
    }

    let order;
    switch (sort) {
      case 'oldest':
        order = [['createdAt', 'ASC']];
        break;
      case 'popular':
        order = [['postLikes', 'DESC'], ['id', 'DESC']];
        break;
      case 'rating':
        order = [['postRating', 'DESC'], ['id', 'DESC']];
        break;
      case 'id':
        order = [['id', 'ASC']];
        break;
      case 'newest':
      default:
        order = [['createdAt', 'DESC']];
        break;
    }

    const { rows, count } = await Proposal.findAndCountAll({
      where,
      order,
      limit,
      offset,
    });

    res.set('Cache-Control', 'no-store');
    res.json({
      proposals: rows,
      total: count,
      page,
      limit,
      sort,
      minVotes,
    });
  } catch (error) {
    console.error('[PROPOSALS LIST ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

proposalsRouter.get('/:id', async (req, res) => {
  try {
    const proposal = await Proposal.findByPk(req.params.id);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const payload = proposal.toJSON();
    payload.currentUserVote = null;

    const authUser = await resolveAuthUser(req);
    if (authUser) {
      const vote = await Vote.findOne({
        where: { UserId: authUser.id, ProposalId: proposal.id },
      });
      payload.currentUserVote = vote ? vote.value : null;
    }

    res.set('Cache-Control', 'no-store');
    res.json(payload);
  } catch (error) {
    console.error('[PROPOSAL GET ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch proposal' });
  }
});

proposalsRouter.get('/:proposalId/comments', async (req, res) => {
  try {
    const comments = await Comment.findAll({
      where: {
        proposalId: String(req.params.proposalId),
        status: 'approved',
      },
      order: [['createdAt', 'ASC']],
    });
    res.set('Cache-Control', 'no-store');
    res.json(comments);
  } catch (error) {
    console.error('[PROPOSAL COMMENTS GET ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

proposalsRouter.post('/:proposalId/comments', isAuthenticated, async (req, res) => {
  try {
    const content = (req.body.content || '').trim();
    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    const proposalId = String(req.params.proposalId);
    const proposal = await Proposal.findByPk(proposalId);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const comment = await Comment.create({
      content,
      proposalId,
      userId: req.user.authUserId,
      authorName: req.body.authorName || req.user.email || 'Anonymous',
      relatedRidings: req.body.relatedRidings || [],
      status: 'pending',
    });

    addCommentToQueue(comment.id);

    const io = req.app.get('io');
    if (io) {
      io.emit('comment:created', {
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
    console.error('[PROPOSAL COMMENT POST ERROR]', error);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

/**
 * PATCH /api/proposals/:id/vote
 * Body: { "value": 1 } or { "value": -1 }
 * One vote per authenticated local User.
 */
proposalsRouter.patch('/:id/vote', isAuthenticated, async (req, res) => {
  try {
    const value = parseVoteValue(req.body);
    if (value !== 1 && value !== -1) {
      return res.status(400).json({ error: 'value must be 1 or -1' });
    }

    const proposal = await Proposal.findByPk(req.params.id);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const result = await castVote({
      localUserId: req.user.id,
      proposalId: proposal.id,
      commentId: null,
      value,
      target: proposal,
      upvoteField: 'postLikes',
      downvoteField: 'postDownvotes',
    });

    const payload = {
      id: proposal.id,
      upvotes: result.upvotes,
      downvotes: result.downvotes,
      postLikes: result.upvotes,
      postDownvotes: result.downvotes,
      currentUserVote: result.currentUserVote,
    };

    const io = req.app.get('io');
    if (io) {
      io.emit('proposal:voteUpdated', payload);
    }

    res.json(payload);
  } catch (error) {
    if (error.status === 409) {
      return res.status(409).json({ error: error.message });
    }
    console.error('[PROPOSAL VOTE ERROR]', error);
    res.status(500).json({ error: 'Voting failed' });
  }
});

module.exports = proposalsRouter;
