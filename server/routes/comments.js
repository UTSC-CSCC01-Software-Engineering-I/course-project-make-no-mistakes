const express = require('express');
const { Comment } = require('../models/index.js');
const { addCommentToQueue } = require('../worker/commentWorker.js'); 
const supabase = require('../lib/supabase'); // NEW: Import Supabase to verify users

const commentsRouter = express.Router();

// REAL Auth Middleware
const isAuthenticated = async (req, res, next) => {
  try {
    // 1. Grab the token from the request headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    
    // 2. Ask Supabase to verify the token and get the real user
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // 3. Attach the REAL Supabase UUID to the request
    req.user = { id: data.user.id };
    next();
  } catch (err) {
    console.error("[AUTH ERROR]", err);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// 0. GET Comments
commentsRouter.get('/', async (req, res) => {
  try {
    const { proposalId } = req.query;
    if (!proposalId) return res.status(400).json({ error: "proposalId is required" });

    const comments = await Comment.findAll({
      where: { proposalId: proposalId, status: 'approved' }
    });
    res.json(comments);
  } catch (error) {
    console.error("[ROUTE ERROR]", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// 1. POST Comment
commentsRouter.post('/', isAuthenticated, async (req, res) => {
  console.log(`\n[ROUTE] --- NEW COMMENT POST REQUEST ---`);
  console.log(`[ROUTE] Request body:`, req.body);
  console.log(`[ROUTE] Real User ID:`, req.user.id);
  
  try {
    const comment = await Comment.create({
      content: req.body.content,
      proposalId: req.body.proposalId,
      userId: req.user.id, // Now uses the real UUID
      status: 'pending'
    });

    console.log(`[ROUTE] Success! Comment saved to DB with ID: ${comment.id}`);
    
    // Fire & Forget: Add to background worker queue
    addCommentToQueue(comment.id);
    
    res.status(202).json({ message: "Comment submitted for AI review", id: comment.id });
  } catch (error) {
    console.error(`[ROUTE ERROR] Failed to save comment to database!`);
    console.error(error);
    res.status(500).json({ error: "Failed to post comment" });
  }
});

// 2. DELETE Comment
commentsRouter.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.id);
    if (!comment) return res.status(404).json({ error: "Comment not found" });
    
    // Checks if the token's UUID matches the comment's UUID
    if (String(comment.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: "Forbidden. You can only delete your own comments." });
    }

    await comment.destroy();
    res.status(204).end();
  } catch (error) {
    console.error("[DELETE ERROR]", error);
    res.status(500).json({ error: "Failed to delete" });
  }
});

// 3. PATCH Upvote/Downvote
commentsRouter.patch('/:id/vote', isAuthenticated, async (req, res) => {
  const { action } = req.body;
  try {
    const comment = await Comment.findByPk(req.params.id);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    if (action === 'upvote') await comment.increment('upvotes');
    else if (action === 'downvote') await comment.increment('downvotes');
    else return res.status(400).json({ error: "Invalid vote action" });

    await comment.reload();
    res.json(comment);
  } catch (error) {
    console.error("[VOTE ERROR]", error);
    res.status(500).json({ error: "Voting failed" });
  }
});

module.exports = commentsRouter;