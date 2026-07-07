const request = require('supertest');
const express = require('express');

// Import the files relative to the 'routes' folder
const commentsRouter = require('./comments');
const { Comment } = require('../models/index.js');
const supabase = require('../lib/supabase');

// 1. Setup a fake Express app just for testing
const app = express();
app.use(express.json());
app.use('/api/comments', commentsRouter);

// 2. Mock the Database, Supabase, and Background Worker
jest.mock('../models/index.js', () => ({
  Comment: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  }
}));

jest.mock('../lib/supabase', () => ({
  auth: {
    getUser: jest.fn()
  }
}));

jest.mock('../worker/commentWorker.js', () => ({
  addCommentToQueue: jest.fn()
}));

// 3. The Test Suite
describe('Comments API Routes', () => {

  // Reset our fakes before each test runs so they don't pollute each other
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ----------------------------------------------------------------------
  // TEST 1: Happy Path - Create a new comment
  // ----------------------------------------------------------------------
  test('1. POST /api/comments - Should successfully create a comment and save authorName', async () => {
    // Fake login
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'fake-uuid-123' } },
      error: null
    });

    // Fake database save
    Comment.create.mockResolvedValue({ id: 99 });

    const response = await request(app)
      .post('/api/comments')
      .set('Authorization', 'Bearer valid-token')
      .send({
        content: 'This is a test comment',
        proposalId: 'prop-1',
        authorName: 'test@student.ca'
      });

    expect(response.status).toBe(202);
    expect(response.body.message).toBe("Comment submitted for AI review");
    expect(Comment.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'fake-uuid-123',
      authorName: 'test@student.ca'
    }));
  });

  // ----------------------------------------------------------------------
  // TEST 2: Security - Block unauthenticated users
  // ----------------------------------------------------------------------
  test('2. POST /api/comments - Should block the request if no token is provided', async () => {
    const response = await request(app)
      .post('/api/comments')
      .send({
        content: 'I am a hacker',
        proposalId: 'prop-1'
      });

    // Should throw a 401 Unauthorized
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Missing or invalid token');
    expect(Comment.create).not.toHaveBeenCalled(); // Ensure DB was untouched
  });

  // ----------------------------------------------------------------------
  // TEST 3: Happy Path - Fetch approved comments
  // ----------------------------------------------------------------------
  test('3. GET /api/comments - Should fetch only approved comments for a specific proposal', async () => {
    // Fake database returning an array of comments
    Comment.findAll.mockResolvedValue([
      { id: 1, content: 'Approved comment 1', status: 'approved' },
      { id: 2, content: 'Approved comment 2', status: 'approved' }
    ]);

    const response = await request(app).get('/api/comments?proposalId=prop-1');

    expect(response.status).toBe(200);
    expect(response.body.length).toBe(2);
    expect(Comment.findAll).toHaveBeenCalledWith({
      where: { proposalId: 'prop-1', status: 'approved' }
    });
  });

  // ----------------------------------------------------------------------
  // TEST 4: Security - Prevent users from deleting someone else's comment
  // ----------------------------------------------------------------------
  test('4. DELETE /api/comments/:id - Should forbid deletion if user is not the owner', async () => {
    // Pretend user "hacker-999" is logged in
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'hacker-999' } },
      error: null
    });

    // The comment found in the DB belongs to "victim-111"
    const mockComment = {
      id: 1,
      userId: 'victim-111',
      destroy: jest.fn() // Fake destroy function
    };
    Comment.findByPk.mockResolvedValue(mockComment);

    const response = await request(app)
      .delete('/api/comments/1')
      .set('Authorization', 'Bearer hacker-token');

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Forbidden. You can only delete your own comments.");
    expect(mockComment.destroy).not.toHaveBeenCalled(); // Ensure it was not deleted
  });

  // ----------------------------------------------------------------------
  // TEST 5: Happy Path - Upvoting a comment
  // ----------------------------------------------------------------------
  test('5. PATCH /api/comments/:id/vote - Should successfully increment upvotes', async () => {
    // Fake login
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'voter-555' } },
      error: null
    });

    // Mock the comment object with Sequelize's increment and reload functions
    const mockComment = {
      id: 1,
      upvotes: 0,
      increment: jest.fn(),
      reload: jest.fn()
    };
    Comment.findByPk.mockResolvedValue(mockComment);

    const response = await request(app)
      .patch('/api/comments/1/vote')
      .set('Authorization', 'Bearer valid-token')
      .send({ action: 'upvote' });

    expect(response.status).toBe(200);
    // Verify Sequelize was told to increment the 'upvotes' column
    expect(mockComment.increment).toHaveBeenCalledWith('upvotes');
    expect(mockComment.reload).toHaveBeenCalled();
  });

});