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
});
