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

    supabaseAdmin.from.mockReturnValue({ insert });

    const response = await request(app)
      .post('/api/proposals')
      .set('Authorization', 'Bearer valid-token')
      .send({
        body: 'Boundary rationale',
        relatedRidings: [3],
      });

    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      submission_type: 'counter_proposal',
      related_ridings: [3],
      body: 'Boundary rationale',
    });
    expect(response.body.related_ridings).toEqual([3]);
  });
});
