const supabase = require('../lib/supabase');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  try {
    const token = authHeader.slice('Bearer '.length);
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    req.user = data.user;
    return next();
  } catch (error) {
    console.error('[AUTH ERROR]', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

module.exports = authenticate;
