/**
 * Auth Supabase client — JWT login/verification ONLY.
 *
 * This is a SEPARATE Supabase project from the Postgres data project.
 * Do NOT use DATABASE_URL / the data project URL for authentication.
 *
 * Preferred env vars:
 *   AUTH_SUPABASE_URL
 *   AUTH_SUPABASE_PUBLISHABLE_KEY
 *   AUTH_SUPABASE_SECRET_KEY (optional)
 *   AUTH_SUPABASE_JWKS_URL (optional)
 *
 * Legacy aliases (still supported):
 *   SUPABASE_URL
 *   SUPABASE_PUBLISHABLE_KEY
 *   SUPABASE_SECRET_KEY
 *   SUPABASE_JWKS_URL
 */
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const authUrl =
  process.env.AUTH_SUPABASE_URL || process.env.SUPABASE_URL;
const authPublishableKey =
  process.env.AUTH_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;
const authSecretKey =
  process.env.AUTH_SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY;

if (!authUrl || !authPublishableKey) {
  console.warn(
    '[auth] Missing AUTH_SUPABASE_URL / AUTH_SUPABASE_PUBLISHABLE_KEY ' +
      '(or legacy SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY). Auth routes will fail.'
  );
}

const supabaseClientOptions = {
  auth: { persistSession: false },
  realtime: { transport: ws },
};

// Prefer secret key for server-side token verification when available
const supabase = createClient(
  authUrl || 'http://localhost',
  authSecretKey || authPublishableKey || 'missing-key',
  supabaseClientOptions
);

module.exports = supabase;
module.exports.authConfig = {
  url: authUrl,
  publishableKey: authPublishableKey,
  secretKey: authSecretKey || null,
  jwksUrl:
    process.env.AUTH_SUPABASE_JWKS_URL ||
    process.env.SUPABASE_JWKS_URL ||
    (authUrl ? `${authUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json` : null),
};
