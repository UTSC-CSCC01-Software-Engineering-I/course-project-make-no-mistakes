const express = require('express');
const { Comment } = require('../models/index.js');
const { addCommentToQueue } = require('../worker/commentWorker.js'); 
const authenticate = require('../middleware/authenticate.js');

const commentsRouter = express.Router();

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
commentsRouter.post('/', authenticate, async (req, res) => {
  console.log(`\n[ROUTE] --- NEW COMMENT POST REQUEST ---`);
  console.log(`[ROUTE] Request body:`, req.body);
  console.log(`[ROUTE] Real User ID:`, req.user.id);
  
  try {
    const comment = await Comment.create({
      content: req.body.content,
      proposalId: req.body.proposalId,
      userId: req.user.id, // Uses the real UUID (supabase)
      authorName: req.body.authorName || 'Anonymous',
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
commentsRouter.delete('/:id', authenticate, async (req, res) => {
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
commentsRouter.patch('/:id/vote', authenticate, async (req, res) => {
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
