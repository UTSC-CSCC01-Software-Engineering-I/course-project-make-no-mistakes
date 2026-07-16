const express = require('express');
const { Submission } = require('../models/index.js');
const { isAuthenticated } = require('../middleware/auth.js');

const submissionsRouter = express.Router();

/**
 * GET /api/users/me/submissions
 * Returns only submissions belonging to the authenticated user.
 */
submissionsRouter.get('/me/submissions', isAuthenticated, async (req, res) => {
  try {
    const type = req.query.type ? String(req.query.type) : null;
    const where = { userId: req.user.authUserId };
    if (type) {
      where.type = type;
    }

    const submissions = await Submission.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    res.set('Cache-Control', 'no-store');
    res.json(submissions);
  } catch (error) {
    console.error('[USER SUBMISSIONS ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

/**
 * POST /api/users/me/submissions
 * Auth required — create a submission owned by the current user.
 */
submissionsRouter.post('/me/submissions', isAuthenticated, async (req, res) => {
  try {
    const {
      type,
      content,
      riding,
      previewURL,
      mapData,
      proposalId,
      postRating,
      postVotes,
      postComments,
    } = req.body;

    if (!type || !content) {
      return res.status(400).json({ error: 'type and content are required' });
    }

    const allowed = ['comment', 'objection', 'counterproposal'];
    if (!allowed.includes(type)) {
      return res.status(400).json({ error: 'Invalid submission type' });
    }

    const now = new Date();
    const date = now.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
    const referenceNumber = `CRMP-${now.getFullYear()}-${String(Date.now()).slice(-6)}`;

    const submission = await Submission.create({
      referenceNumber,
      type,
      status: 'Received',
      date,
      riding: riding || null,
      content,
      previewURL: previewURL || null,
      postRating: postRating ?? null,
      postVotes: postVotes ?? null,
      postComments: postComments ?? null,
      userId: req.user.authUserId,
      mapData: mapData || null,
      proposalId: proposalId ? String(proposalId) : null,
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('submission:created', {
        id: submission.id,
        userId: submission.userId,
        type: submission.type,
      });
    }

    res.status(201).json(submission);
  } catch (error) {
    console.error('[CREATE SUBMISSION ERROR]', error);
    res.status(500).json({ error: 'Failed to create submission' });
  }
});

module.exports = submissionsRouter;
