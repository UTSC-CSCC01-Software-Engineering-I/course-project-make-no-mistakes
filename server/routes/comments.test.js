const request = require('supertest');
const express = require('express');

const commentsRouter = require('./comments');
const { Comment, findOrCreateLocalUser } = require('../models/index.js');
const supabase = require('../lib/supabase');
const { castVote, parseVoteValue } = require('../services/voteService.js');

jest.mock('../models/index.js', () => ({
  Comment: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
  Vote: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  findOrCreateLocalUser: jest.fn(),
}));

jest.mock('../lib/supabase', () => ({
  auth: {
    getUser: jest.fn(),
  },
}));

jest.mock('../worker/commentWorker.js', () => ({
  addCommentToQueue: jest.fn(),
}));

jest.mock('../services/voteService.js', () => {
  const actual = jest.requireActual('../services/voteService.js');
  return {
    ...actual,
    castVote: jest.fn(),
  };
});

const app = express();
app.use(express.json());
app.use('/api/comments', commentsRouter);

describe('Comments API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findOrCreateLocalUser.mockResolvedValue({
      id: 42,
      authUserId: 'fake-uuid-123',
      email: 'test@student.ca',
      role: 'citizen',
    });
  });

  test('1. POST /api/comments - Should successfully create a comment and save authorName', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'fake-uuid-123', email: 'test@student.ca' } },
      error: null,
    });

    Comment.create.mockResolvedValue({ id: 99 });

    const response = await request(app)
      .post('/api/comments')
      .set('Authorization', 'Bearer valid-token')
      .send({
        content: 'This is a test comment',
        proposalId: 'prop-1',
        authorName: 'test@student.ca',
      });

    expect(response.status).toBe(202);
    expect(response.body.message).toBe('Comment submitted for AI review');
    expect(Comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'fake-uuid-123',
        authorName: 'test@student.ca',
      })
    );
  });

  test('2. POST /api/comments - Should block the request if no token is provided', async () => {
    const response = await request(app).post('/api/comments').send({
      content: 'I am a hacker',
      proposalId: 'prop-1',
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Missing or invalid token');
    expect(Comment.create).not.toHaveBeenCalled();
  });

  test('3. GET /api/comments - Should fetch only approved comments for a specific proposal', async () => {
    Comment.findAll.mockResolvedValue([
      { id: 1, content: 'Approved comment 1', status: 'approved' },
      { id: 2, content: 'Approved comment 2', status: 'approved' },
    ]);

    const response = await request(app).get('/api/comments?proposalId=prop-1');

    expect(response.status).toBe(200);
    expect(response.body.length).toBe(2);
    expect(Comment.findAll).toHaveBeenCalledWith({
      where: { proposalId: 'prop-1', status: 'approved' },
      order: [['createdAt', 'ASC']],
    });
  });

  test('4. DELETE /api/comments/:id - Should forbid deletion if user is not the owner', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'hacker-999' } },
      error: null,
    });
    findOrCreateLocalUser.mockResolvedValue({
      id: 7,
      authUserId: 'hacker-999',
      role: 'citizen',
    });

    const mockComment = {
      id: 1,
      userId: 'victim-111',
      destroy: jest.fn(),
    };
    Comment.findByPk.mockResolvedValue(mockComment);

    const response = await request(app)
      .delete('/api/comments/1')
      .set('Authorization', 'Bearer hacker-token');

    expect(response.status).toBe(403);
    expect(response.body.error).toBe(
      'Forbidden. You can only delete your own comments.'
    );
    expect(mockComment.destroy).not.toHaveBeenCalled();
  });

  test('5. PATCH /api/comments/:id/vote - Should successfully increment upvotes', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'voter-555' } },
      error: null,
    });
    findOrCreateLocalUser.mockResolvedValue({
      id: 55,
      authUserId: 'voter-555',
      role: 'citizen',
    });

    const mockComment = {
      id: 1,
      proposalId: '1',
      upvotes: 0,
      downvotes: 0,
    };
    Comment.findByPk.mockResolvedValue(mockComment);
    castVote.mockResolvedValue({
      upvotes: 1,
      downvotes: 0,
      currentUserVote: 1,
    });

    const response = await request(app)
      .patch('/api/comments/1/vote')
      .set('Authorization', 'Bearer valid-token')
      .send({ value: 1 });

    expect(response.status).toBe(200);
    expect(response.body.upvotes).toBe(1);
    expect(response.body.currentUserVote).toBe(1);
    expect(castVote).toHaveBeenCalledWith(
      expect.objectContaining({
        localUserId: 55,
        commentId: 1,
        value: 1,
      })
    );
  });
});

describe('parseVoteValue helper', () => {
  test('accepts value 1 / -1 and legacy action strings', () => {
    expect(parseVoteValue({ value: 1 })).toBe(1);
    expect(parseVoteValue({ value: -1 })).toBe(-1);
    expect(parseVoteValue({ action: 'upvote' })).toBe(1);
    expect(parseVoteValue({ action: 'downvote' })).toBe(-1);
    expect(parseVoteValue({ value: 2 })).toBeNull();
  });
});
