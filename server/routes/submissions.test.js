const request = require('supertest');
const express = require('express');

const submissionsRouter = require('./submissions');
const { Submission, findOrCreateLocalUser } = require('../models/index.js');
const supabase = require('../lib/supabase');

jest.mock('../models/index.js', () => ({
  Submission: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
  findOrCreateLocalUser: jest.fn(),
}));

jest.mock('../lib/supabase', () => ({
  auth: { getUser: jest.fn() },
}));

const app = express();
app.use(express.json());
app.use('/api/users', submissionsRouter);

describe('User-owned map submissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-user-1', email: 'mapper@example.com' } },
      error: null,
    });
    findOrCreateLocalUser.mockResolvedValue({
      id: 1,
      authUserId: 'auth-user-1',
      email: 'mapper@example.com',
      role: 'citizen',
    });
  });

  test('updates a map only through the authenticated owner query', async () => {
    const mapData = { type: 'FeatureCollection', features: [] };
    const submission = {
      id: 7,
      userId: 'auth-user-1',
      update: jest.fn().mockImplementation(async ({ mapData: nextMap }) => {
        submission.mapData = nextMap;
      }),
      toJSON: jest.fn().mockImplementation(() => ({
        id: submission.id,
        userId: submission.userId,
        mapData: submission.mapData,
      })),
    };
    Submission.findOne.mockResolvedValue(submission);

    const response = await request(app)
      .patch('/api/users/me/submissions/7/map')
      .set('Authorization', 'Bearer valid-token')
      .send({ mapData });

    expect(response.status).toBe(200);
    expect(Submission.findOne).toHaveBeenCalledWith({
      where: { id: '7', userId: 'auth-user-1' },
    });
    expect(submission.update).toHaveBeenCalledWith({ mapData });
  });

  test('rejects invalid map data', async () => {
    const response = await request(app)
      .patch('/api/users/me/submissions/7/map')
      .set('Authorization', 'Bearer valid-token')
      .send({ mapData: { features: [] } });

    expect(response.status).toBe(400);
    expect(Submission.findOne).not.toHaveBeenCalled();
  });

  test('requires authentication before updating a map', async () => {
    const response = await request(app)
      .patch('/api/users/me/submissions/7/map')
      .send({ mapData: { type: 'FeatureCollection', features: [] } });

    expect(response.status).toBe(401);
    expect(Submission.findOne).not.toHaveBeenCalled();
  });

  test('stores counter-proposal geometry under the authenticated Supabase user', async () => {
    const mapData = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { riding: 'Toronto Centre' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-79.4, 43.64],
            [-79.36, 43.64],
            [-79.36, 43.68],
            [-79.4, 43.64],
          ]],
        },
      }],
    };
    Submission.create.mockImplementation(async (values) => ({ id: 12, ...values }));

    const response = await request(app)
      .post('/api/users/me/submissions')
      .set('Authorization', 'Bearer valid-token')
      .send({
        type: 'counterproposal',
        content: 'Keep the neighbourhood within one district.',
        riding: 'Toronto Centre',
        proposalId: '42',
        mapData,
        userId: 'spoofed-user',
      });

    expect(response.status).toBe(201);
    expect(Submission.create).toHaveBeenCalledWith(expect.objectContaining({
      type: 'counterproposal',
      content: 'Keep the neighbourhood within one district.',
      riding: 'Toronto Centre',
      proposalId: '42',
      mapData,
      userId: 'auth-user-1',
    }));
  });

  test('rejects a counter-proposal without stored boundary geometry', async () => {
    const response = await request(app)
      .post('/api/users/me/submissions')
      .set('Authorization', 'Bearer valid-token')
      .send({
        type: 'counterproposal',
        content: 'This submission has no drawing.',
        proposalId: '42',
        mapData: { type: 'FeatureCollection', features: [] },
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      'Counter-proposals require a non-empty GeoJSON FeatureCollection'
    );
    expect(Submission.create).not.toHaveBeenCalled();
  });

  test('does not store an unauthenticated counter-proposal', async () => {
    const response = await request(app)
      .post('/api/users/me/submissions')
      .send({
        type: 'counterproposal',
        content: 'Unauthenticated submission.',
        proposalId: '42',
        mapData: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {},
            geometry: { type: 'Point', coordinates: [-79.38, 43.65] },
          }],
        },
      });

    expect(response.status).toBe(401);
    expect(Submission.create).not.toHaveBeenCalled();
  });
});
