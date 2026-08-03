const request = require('supertest');
const express = require('express');

const proposalsRouter = require('./proposals');
const supabase = require('../lib/supabase');
const supabaseAdmin = require('../lib/supabaseAdmin');

const app = express();
app.use(express.json());
app.use('/api/proposals', proposalsRouter);

jest.mock('../lib/supabase', () => ({
  auth: {
    getUser: jest.fn(),
  },
}));

jest.mock('../lib/supabaseAdmin', () => ({
  from: jest.fn(),
}));

describe('Proposals API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/proposals saves selected related ridings', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const single = jest.fn().mockResolvedValue({
      data: {
        id: 'proposal-123',
        body: 'Boundary rationale',
        related_ridings: [3],
      },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    const mapData = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: [-79.38, 43.65] },
      }],
    };

    supabaseAdmin.from.mockReturnValue({ insert });

    const response = await request(app)
      .post('/api/proposals')
      .set('Authorization', 'Bearer valid-token')
      .send({
        body: 'Boundary rationale',
        relatedRidings: [3],
        mapData,
      });

    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      submission_type: 'counter_proposal',
      related_ridings: [3],
      map_data: mapData,
      body: 'Boundary rationale',
    });
    expect(response.body.related_ridings).toEqual([3]);
  });

  test('rejects a counter-proposal without boundary data', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const response = await request(app)
      .post('/api/proposals')
      .set('Authorization', 'Bearer valid-token')
      .send({
        body: 'Boundary rationale',
        relatedRidings: [3],
        mapData: { type: 'FeatureCollection', features: [] },
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      'Counter-proposals require a non-empty GeoJSON FeatureCollection.'
    );
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  });

  test('does not store an unauthenticated counter-proposal', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    const response = await request(app)
      .post('/api/proposals')
      .send({
        body: 'Boundary rationale',
        relatedRidings: [3],
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
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  });
});
