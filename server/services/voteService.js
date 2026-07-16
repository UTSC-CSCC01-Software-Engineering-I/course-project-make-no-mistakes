const { Vote } = require('../models/index.js');

function parseVoteValue(body) {
  // Prefer { value: 1 | -1 }; accept legacy { action: 'upvote'|'downvote' }
  if (body && (body.value === 1 || body.value === -1)) {
    return body.value;
  }
  if (body && body.value === '1') return 1;
  if (body && body.value === '-1') return -1;
  if (body && body.action === 'upvote') return 1;
  if (body && body.action === 'downvote') return -1;
  return null;
}

function isUniqueViolation(error) {
  return (
    error?.name === 'SequelizeUniqueConstraintError' ||
    error?.parent?.code === '23505' ||
    String(error?.message || '').toLowerCase().includes('unique')
  );
}

/**
 * Cast a single vote on a proposal or comment.
 * Enforces one vote per local User via DB unique constraints + pre-check.
 */
async function castVote({
  localUserId,
  proposalId = null,
  commentId = null,
  value,
  target, // Proposal or Comment instance with upvotes/downvotes or postLikes/postDownvotes
  upvoteField,
  downvoteField,
}) {
  const where = { UserId: localUserId };
  if (proposalId != null) where.ProposalId = proposalId;
  if (commentId != null) where.CommentId = commentId;

  const existing = await Vote.findOne({ where });
  if (existing) {
    const err = new Error('You have already voted');
    err.status = 409;
    throw err;
  }

  try {
    await Vote.create({
      UserId: localUserId,
      ProposalId: proposalId,
      CommentId: commentId,
      value,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      const err = new Error('You have already voted');
      err.status = 409;
      throw err;
    }
    throw error;
  }

  if (value === 1) {
    await target.increment(upvoteField);
  } else {
    await target.increment(downvoteField);
  }
  await target.reload();

  return {
    upvotes: target[upvoteField],
    downvotes: target[downvoteField],
    currentUserVote: value,
  };
}

module.exports = { parseVoteValue, castVote, isUniqueViolation };
