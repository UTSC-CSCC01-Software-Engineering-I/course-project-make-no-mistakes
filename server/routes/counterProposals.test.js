const request = require('supertest');
const express = require('express');

jest.mock('../models/index.js', () => ({
  CounterProposal: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
}));

jest.mock('../lib/supabase', () => ({
  auth: { getUser: jest.fn() },
}));

const { CounterProposal } = require('../models/index.js');
const supabase = require('../lib/supabase');
const counterProposalsRouter = require('./counterProposals.js');

const app = express();
app.use(express.json());
app.use('/api/counter-proposals', counterProposalsRouter);

const boundaryGeometry = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { riding: 'A' },
    geometry: {
      type: 'Polygon',
      coordinates: [[[-79.4, 43.6], [-79.3, 43.6], [-79.3, 43.7], [-79.4, 43.6]]],
    },
  }],
};

describe('Counter-proposals API routes', () => {
  beforeEach(() => jest.clearAllMocks());

  test('creates a counter-proposal for the authenticated user', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'user@example.com' } },
      error: null,
    });
    CounterProposal.create.mockImplementation(async (values) => ({ id: 7, ...values }));

    const response = await request(app)
      .post('/api/counter-proposals')
      .set('Authorization', 'Bearer valid-token')
      .send({ sourceProposalId: '1', rationale: 'Keep this community together.', boundaryGeometry });

    expect(response.status).toBe(201);
    expect(CounterProposal.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-123',
      authorName: 'user@example.com',
      sourceProposalId: '1',
      boundaryGeometry,
    }));
  });

  test('rejects unauthenticated submissions', async () => {
    const response = await request(app)
      .post('/api/counter-proposals')
      .send({ sourceProposalId: '1', rationale: 'Test', boundaryGeometry });

    expect(response.status).toBe(401);
    expect(CounterProposal.create).not.toHaveBeenCalled();
  });

  test('rejects malformed boundary geometry', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'user@example.com' } },
      error: null,
    });

    const response = await request(app)
      .post('/api/counter-proposals')
      .set('Authorization', 'Bearer valid-token')
      .send({
        sourceProposalId: '1',
        rationale: 'Test',
        boundaryGeometry: { type: 'FeatureCollection', features: [] },
      });

    expect(response.status).toBe(400);
    expect(CounterProposal.create).not.toHaveBeenCalled();
  });

  test('returns only the authenticated user submissions', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'user@example.com' } },
      error: null,
    });
    CounterProposal.findAll.mockResolvedValue([{ id: 7 }]);

    const response = await request(app)
      .get('/api/counter-proposals/mine')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(CounterProposal.findAll).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      order: [['createdAt', 'DESC']],
    });
  });
});
