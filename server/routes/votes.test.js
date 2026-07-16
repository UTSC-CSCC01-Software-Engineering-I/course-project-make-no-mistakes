const request = require('supertest');
const express = require('express');

const proposalsRouter = require('./proposals');
const { Proposal, Comment, Vote, findOrCreateLocalUser } = require('../models/index.js');
const supabase = require('../lib/supabase');
const { castVote } = require('../services/voteService.js');

jest.mock('../models/index.js', () => ({
  Proposal: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
  },
  Comment: {
    findAll: jest.fn(),
    create: jest.fn(),
  },
  Vote: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  findOrCreateLocalUser: jest.fn(),
  Op: { gte: Symbol('gte') },
}));

jest.mock('../lib/supabase', () => ({
  auth: { getUser: jest.fn() },
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
app.use('/api/proposals', proposalsRouter);

describe('Proposal voting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findOrCreateLocalUser.mockResolvedValue({
      id: 10,
      authUserId: 'auth-user-10',
      email: 'voter@test.com',
      role: 'citizen',
    });
  });

  test('authenticated user can vote once (thumbs up)', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-user-10', email: 'voter@test.com' } },
      error: null,
    });

    const proposal = { id: 1, postLikes: 5, postDownvotes: 1 };
    Proposal.findByPk.mockResolvedValue(proposal);
    castVote.mockResolvedValue({
      upvotes: 6,
      downvotes: 1,
      currentUserVote: 1,
    });

    const res = await request(app)
      .patch('/api/proposals/1/vote')
      .set('Authorization', 'Bearer token')
      .send({ value: 1 });

    expect(res.status).toBe(200);
    expect(res.body.upvotes).toBe(6);
    expect(res.body.currentUserVote).toBe(1);
    expect(castVote).toHaveBeenCalledWith(
      expect.objectContaining({ localUserId: 10, proposalId: 1, value: 1 })
    );
  });

  test('unauthenticated user cannot vote', async () => {
    const res = await request(app)
      .patch('/api/proposals/1/vote')
      .send({ value: 1 });

    expect(res.status).toBe(401);
    expect(castVote).not.toHaveBeenCalled();
  });

  test('same user cannot vote twice — 409 Conflict', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-user-10' } },
      error: null,
    });
    Proposal.findByPk.mockResolvedValue({ id: 1, postLikes: 5, postDownvotes: 0 });
    const err = new Error('You have already voted');
    err.status = 409;
    castVote.mockRejectedValue(err);

    const res = await request(app)
      .patch('/api/proposals/1/vote')
      .set('Authorization', 'Bearer token')
      .send({ value: -1 });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('You have already voted');
  });

  test('invalid vote value is rejected', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-user-10' } },
      error: null,
    });

    const res = await request(app)
      .patch('/api/proposals/1/vote')
      .set('Authorization', 'Bearer token')
      .send({ value: 99 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('value must be 1 or -1');
    expect(castVote).not.toHaveBeenCalled();
  });

  test('thumbs down updates downvotes count', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-user-10' } },
      error: null,
    });
    Proposal.findByPk.mockResolvedValue({ id: 2, postLikes: 3, postDownvotes: 0 });
    castVote.mockResolvedValue({
      upvotes: 3,
      downvotes: 1,
      currentUserVote: -1,
    });

    const res = await request(app)
      .patch('/api/proposals/2/vote')
      .set('Authorization', 'Bearer token')
      .send({ value: -1 });

    expect(res.status).toBe(200);
    expect(res.body.downvotes).toBe(1);
    expect(res.body.currentUserVote).toBe(-1);
  });
});

describe('castVote service (unit)', () => {
  const { Vote: VoteModel } = require('../models/index.js');
  // Use real castVote for this block
  const real = jest.requireActual('../services/voteService.js');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates vote and increments upvote field', async () => {
    VoteModel.findOne.mockResolvedValue(null);
    VoteModel.create.mockResolvedValue({ id: 1 });
    const target = {
      postLikes: 0,
      postDownvotes: 0,
      increment: jest.fn().mockResolvedValue(undefined),
      reload: jest.fn().mockImplementation(async function reload() {
        this.postLikes = 1;
      }),
    };

    const result = await real.castVote({
      localUserId: 1,
      proposalId: 9,
      commentId: null,
      value: 1,
      target,
      upvoteField: 'postLikes',
      downvoteField: 'postDownvotes',
    });

    expect(VoteModel.create).toHaveBeenCalledWith({
      UserId: 1,
      ProposalId: 9,
      CommentId: null,
      value: 1,
    });
    expect(target.increment).toHaveBeenCalledWith('postLikes');
    expect(result.upvotes).toBe(1);
    expect(result.currentUserVote).toBe(1);
  });

  test('returns 409-style error when vote already exists', async () => {
    VoteModel.findOne.mockResolvedValue({ id: 99, value: 1 });
    const target = { increment: jest.fn(), reload: jest.fn() };

    await expect(
      real.castVote({
        localUserId: 1,
        proposalId: 9,
        value: -1,
        target,
        upvoteField: 'postLikes',
        downvoteField: 'postDownvotes',
      })
    ).rejects.toMatchObject({ status: 409, message: 'You have already voted' });

    expect(VoteModel.create).not.toHaveBeenCalled();
  });
});
