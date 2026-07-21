const { Comment } = require('../models/index.js');

const queue = [];
let isProcessing = false;

// Simulated AI Check
const checkKeywords = (content) => {
  const validKeywords = ["add", "create", "change", "update", "modify", "remove", "delete", "mapping", "distribution", "battery", "objection", "boundary"];
  const lower = content.toLowerCase();
  return validKeywords.some(kw => lower.includes(kw));
};

const addCommentToQueue = (commentId) => {
  console.log(`[QUEUE] Added Comment ID ${commentId} to queue.`);
  queue.push(commentId);
  processQueue();
};

const processQueue = async () => {
  if (isProcessing || queue.length === 0) return;
  
  isProcessing = true;
  const commentId = queue.shift();
  console.log(`[QUEUE] ⚙️ Processing Comment ID ${commentId}...`);

  try {
    // 1.5 second artificial delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const comment = await Comment.findByPk(commentId);
    if (comment) {
      const isRelevant = checkKeywords(comment.content);
      console.log(`[QUEUE] AI Decision: ${isRelevant ? 'APPROVED' : 'REJECTED'}`);

      if (isRelevant) {
        comment.status = 'approved';
        await comment.save();
        if (global.io) {
          global.io.to(`proposal:${comment.proposalId}`).emit('comment_approved', comment);
        }
      } else {
        comment.status = 'rejected';
        comment.rejectionReason = "AI Rejected: Please include keywords like change, mapping, or boundary.";
        await comment.save();
        if (global.io) {
          global.io.to(`user:${comment.userId}`).emit('comment_rejected', {
            id: comment.id,
            proposalId: comment.proposalId,
            reason: comment.rejectionReason,
          });
        }
      }
    }
  } catch (error) {
    console.error("[QUEUE ERROR]", error);
  }

  isProcessing = false;
  processQueue(); 
};

module.exports = { addCommentToQueue };
