const express = require('express');
const { CounterProposal } = require('../models/index.js');
const authenticate = require('../middleware/authenticate.js');

const counterProposalsRouter = express.Router();

function isCoordinate(position) {
  return Array.isArray(position)
    && position.length === 2
    && position.every(Number.isFinite);
}

function isValidGeometry(geometry) {
  if (geometry?.type !== 'FeatureCollection' || !Array.isArray(geometry.features)) {
    return false;
  }

  if (geometry.features.length === 0) return false;

  return geometry.features.every((feature) => {
    const ring = feature?.geometry?.coordinates?.[0];
    if (feature?.type !== 'Feature' || feature?.geometry?.type !== 'Polygon') return false;
    if (!Array.isArray(ring) || ring.length < 4 || !ring.every(isCoordinate)) return false;

    const first = ring[0];
    const last = ring[ring.length - 1];
    return first[0] === last[0] && first[1] === last[1];
  });
}

counterProposalsRouter.post('/', authenticate, async (req, res) => {
  const { sourceProposalId, rationale, boundaryGeometry } = req.body;

  if (!sourceProposalId || typeof rationale !== 'string' || !rationale.trim()) {
    return res.status(400).json({ error: 'Source proposal and rationale are required' });
  }

  if (!isValidGeometry(boundaryGeometry)) {
    return res.status(400).json({ error: 'At least one closed district boundary is required' });
  }

  try {
    const counterProposal = await CounterProposal.create({
      sourceProposalId: String(sourceProposalId),
      userId: req.user.id,
      authorName: req.user.email || 'Anonymous',
      rationale: rationale.trim(),
      boundaryGeometry,
      status: 'received',
    });

    return res.status(201).json(counterProposal);
  } catch (error) {
    console.error('[COUNTER PROPOSAL CREATE ERROR]', error);
    return res.status(500).json({ error: 'Failed to save counter-proposal' });
  }
});

counterProposalsRouter.get('/mine', authenticate, async (req, res) => {
  try {
    const counterProposals = await CounterProposal.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    return res.json(counterProposals);
  } catch (error) {
    console.error('[COUNTER PROPOSAL LIST ERROR]', error);
    return res.status(500).json({ error: 'Failed to fetch counter-proposals' });
  }
});

counterProposalsRouter.get('/', async (req, res) => {
  try {
    const options = { order: [['createdAt', 'DESC']] };
    if (req.query.proposalId) {
      options.where = { sourceProposalId: String(req.query.proposalId) };
    }
    return res.json(await CounterProposal.findAll(options));
  } catch (error) {
    console.error('[COUNTER PROPOSAL LIST ERROR]', error);
    return res.status(500).json({ error: 'Failed to fetch counter-proposals' });
  }
});

counterProposalsRouter.get('/:id', async (req, res) => {
  try {
    const counterProposal = await CounterProposal.findByPk(req.params.id);
    if (!counterProposal) return res.status(404).json({ error: 'Counter-proposal not found' });
    return res.json(counterProposal);
  } catch (error) {
    console.error('[COUNTER PROPOSAL GET ERROR]', error);
    return res.status(500).json({ error: 'Failed to fetch counter-proposal' });
  }
});

counterProposalsRouter.delete('/:id', authenticate, async (req, res) => {
  try {
    const counterProposal = await CounterProposal.findByPk(req.params.id);
    if (!counterProposal) return res.status(404).json({ error: 'Counter-proposal not found' });
    if (String(counterProposal.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'You can only delete your own counter-proposals' });
    }

    await counterProposal.destroy();
    return res.status(204).end();
  } catch (error) {
    console.error('[COUNTER PROPOSAL DELETE ERROR]', error);
    return res.status(500).json({ error: 'Failed to delete counter-proposal' });
  }
});

module.exports = counterProposalsRouter;
