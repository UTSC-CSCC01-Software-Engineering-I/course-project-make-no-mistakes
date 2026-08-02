const express = require('express');

const { Comment } = require('../models/index.js');
const { addCommentToQueue } = require('../worker/commentWorker.js');
const supabase = require('../lib/supabase');

const commentsRouter = express.Router();

/**
 * Verifies the Supabase access token provided by the frontend.
 */
const isAuthenticated = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'You must be logged in to perform this action.',
        code: 'AUTH_REQUIRED',
      });
    }

    const token = authHeader.slice('Bearer '.length).trim();

    if (!token) {
      return res.status(401).json({
        error: 'You must be logged in to perform this action.',
        code: 'AUTH_REQUIRED',
      });
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      console.error('[AUTH VALIDATION ERROR]', {
        message: error?.message,
        status: error?.status,
        code: error?.code,
      });

      return res.status(401).json({
        error: 'Your session has expired. Please log in again.',
        code: 'SESSION_EXPIRED',
      });
    }

    req.user = {
      id: data.user.id,
      email: data.user.email,
      metadata: data.user.user_metadata || {},
    };

    return next();
  } catch (error) {
    console.error('[AUTH ERROR]', error);

    return res.status(500).json({
      error: 'Unable to verify authentication.',
      code: 'AUTH_SERVICE_ERROR',
    });
  }
};

/**
 * GET /api/comments?proposalId=...
 *
 * Public route. Anyone can read approved comments.
 */
commentsRouter.get('/', async (req, res) => {
  const { proposalId } = req.query;

  if (!proposalId) {
    return res.status(400).json({
      error: 'proposalId is required.',
      code: 'PROPOSAL_ID_REQUIRED',
    });
  }

  try {
    const comments = await Comment.findAll({
      where: {
        proposalId,
        status: 'approved',
      },
    });

    return res.status(200).json(comments);
  } catch (error) {
    console.error('[GET COMMENTS ERROR]', error);

    return res.status(500).json({
      error: 'Failed to fetch comments.',
      code: 'COMMENTS_FETCH_FAILED',
    });
  }
});

/**
 * POST /api/comments
 *
 * Protected route. Only authenticated users can submit comments.
 */
commentsRouter.post('/', isAuthenticated, async (req, res) => {
  const content =
    typeof req.body.content === 'string'
      ? req.body.content.trim()
      : '';

  const { proposalId } = req.body;

  if (!content) {
    return res.status(400).json({
      error: 'Comment content is required.',
      code: 'COMMENT_CONTENT_REQUIRED',
    });
  }

  if (!proposalId) {
    return res.status(400).json({
      error: 'proposalId is required.',
      code: 'PROPOSAL_ID_REQUIRED',
    });
  }

  try {
    /*
     * Do not accept authorName from the request body.
     * Get the display name from the verified Supabase user instead.
     */
    const authorName =
      req.user.metadata.full_name ||
      req.user.metadata.name ||
      req.user.email ||
      'Anonymous';

    const comment = await Comment.create({
      content,
      proposalId,
      userId: req.user.id,
      authorName,
      status: 'pending',
    });

    /*
     * Submit the comment to the worker without delaying the HTTP response.
     * A queue error will not incorrectly report that the database insert failed.
     */
    Promise.resolve()
      .then(() => addCommentToQueue(comment.id))
      .catch((error) => {
        console.error('[COMMENT QUEUE ERROR]', {
          commentId: comment.id,
          error,
        });
      });

    return res.status(202).json({
      message: 'Comment submitted for AI review',
      id: comment.id,
    });
  } catch (error) {
    console.error('[CREATE COMMENT ERROR]', error);

    return res.status(500).json({
      error: 'Failed to post comment.',
      code: 'COMMENT_CREATE_FAILED',
    });
  }
});

/**
 * DELETE /api/comments/:id
 *
 * Protected route. A user can delete only their own comments.
 */
commentsRouter.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.id);

    if (!comment) {
      return res.status(404).json({
        error: 'Comment not found.',
        code: 'COMMENT_NOT_FOUND',
      });
    }

    if (String(comment.userId) !== String(req.user.id)) {
      return res.status(403).json({
        error: 'Forbidden. You can only delete your own comments.',
        code: 'COMMENT_DELETE_FORBIDDEN',
      });
    }

    await comment.destroy();

    return res.status(204).end();
  } catch (error) {
    console.error('[DELETE COMMENT ERROR]', error);

    return res.status(500).json({
      error: 'Failed to delete comment.',
      code: 'COMMENT_DELETE_FAILED',
    });
  }
});

/**
 * PATCH /api/comments/:id/vote
 *
 * Protected route. Only authenticated users can vote.
 */
commentsRouter.patch('/:id/vote', isAuthenticated, async (req, res) => {
  const { action } = req.body;

  if (action !== 'upvote' && action !== 'downvote') {
    return res.status(400).json({
      error: 'Invalid vote action.',
      code: 'INVALID_VOTE_ACTION',
    });
  }

  try {
    const comment = await Comment.findByPk(req.params.id);

    if (!comment) {
      return res.status(404).json({
        error: 'Comment not found.',
        code: 'COMMENT_NOT_FOUND',
      });
    }

    const field = action === 'upvote' ? 'upvotes' : 'downvotes';

    await comment.increment(field);
    await comment.reload();

    return res.status(200).json(comment);
  } catch (error) {
    console.error('[VOTE ERROR]', error);

    return res.status(500).json({
      error: 'Voting failed.',
      code: 'VOTE_FAILED',
    });
  }
});

module.exports = commentsRouter;
