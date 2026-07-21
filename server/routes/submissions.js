const express = require('express');
const { Submission } = require('../models/index.js');
const { isAuthenticated } = require('../middleware/auth.js');

const submissionsRouter = express.Router();

function isFeatureCollection(value) {
  return (
    value &&
    value.type === 'FeatureCollection' &&
    Array.isArray(value.features)
  );
}

function emitToOwner(req, eventName, submission) {
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${req.user.authUserId}`).emit(eventName, submission.toJSON());
  }
}

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
    if (mapData != null && !isFeatureCollection(mapData)) {
      return res.status(400).json({ error: 'mapData must be a GeoJSON FeatureCollection' });
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

    emitToOwner(req, 'submission:created', submission);

    res.status(201).json(submission);
  } catch (error) {
    console.error('[CREATE SUBMISSION ERROR]', error);
    res.status(500).json({ error: 'Failed to create submission' });
  }
});

/**
 * PATCH /api/users/me/submissions/:id/map
 * Updates only a map owned by the authenticated user.
 */
submissionsRouter.patch('/me/submissions/:id/map', isAuthenticated, async (req, res) => {
  try {
    if (!isFeatureCollection(req.body.mapData)) {
      return res.status(400).json({ error: 'mapData must be a GeoJSON FeatureCollection' });
    }

    const submission = await Submission.findOne({
      where: {
        id: req.params.id,
        userId: req.user.authUserId,
      },
    });
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    await submission.update({ mapData: req.body.mapData });
    emitToOwner(req, 'map:updated', submission);
    return res.json(submission);
  } catch (error) {
    console.error('[UPDATE SUBMISSION MAP ERROR]', error);
    return res.status(500).json({ error: 'Failed to update submission map' });
  }
});

module.exports = submissionsRouter;
