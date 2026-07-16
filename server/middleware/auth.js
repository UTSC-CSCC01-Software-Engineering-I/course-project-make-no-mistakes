const supabase = require('../lib/supabase');
const { findOrCreateLocalUser } = require('../models/index.js');

/**
 * Soft token verify — never sends a response.
 * Returns local user context or null.
 */
async function resolveAuthUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return null;
  }

  const authUser = data.user;
  const role = authUser.user_metadata?.role || 'citizen';
  const localUser = await findOrCreateLocalUser({
    authUserId: authUser.id,
    email: authUser.email,
    role,
    username: authUser.user_metadata?.username,
  });

  return {
    id: localUser.id,
    authUserId: authUser.id,
    email: localUser.email || authUser.email,
    username: localUser.username,
    role: localUser.role || role,
    localUser,
  };
}

/**
 * Verifies a Bearer JWT against the AUTH Supabase project,
 * then maps to a local User row in the DATA database.
 *
 * req.user shape:
 *   id          — local User.id (integer) — use for Vote.UserId
 *   authUserId  — Auth Supabase UUID — use for Comment/Submission ownership
 *   email, role, username
 *   localUser   — Sequelize User instance
 */
async function isAuthenticated(req, res, next) {
  try {
    const user = await resolveAuthUser(req);
    if (!user) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid token' });
      }
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('[AUTH ERROR]', err);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

function requireCommissioner(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.user.role !== 'commissioner') {
    return res.status(403).json({ error: 'Forbidden: commissioners only' });
  }
  return next();
}

module.exports = { isAuthenticated, requireCommissioner, resolveAuthUser };
