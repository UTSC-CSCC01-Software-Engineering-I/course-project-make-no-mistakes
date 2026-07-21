function resolveDatabaseUrl(env = process.env) {
  const directUrl = env.DATABASE_URL;
  if (!directUrl || !env.SUPABASE_POOLER_HOST) return directUrl || null;

  const url = new URL(directUrl);
  const directHostMatch = url.hostname.match(/^db\.([^.]+)\.supabase\.co$/);
  const projectRef = env.SUPABASE_PROJECT_REF || directHostMatch?.[1];
  if (!projectRef) {
    throw new Error(
      'SUPABASE_PROJECT_REF is required when DATABASE_URL is not a direct Supabase URL'
    );
  }

  const baseUser = decodeURIComponent(url.username || 'postgres').split('.')[0];
  url.username = `${baseUser}.${projectRef}`;
  url.hostname = env.SUPABASE_POOLER_HOST;
  url.port = env.SUPABASE_POOLER_PORT || '5432';
  return url.toString();
}

module.exports = { resolveDatabaseUrl };
