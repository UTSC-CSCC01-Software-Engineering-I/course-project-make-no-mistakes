const { resolveDatabaseUrl } = require('./databaseUrl');

test('converts a direct Supabase URL to a session-pooler URL', () => {
  const result = resolveDatabaseUrl({
    DATABASE_URL:
      'postgresql://postgres:encoded%40password@db.projectref.supabase.co:5432/postgres',
    SUPABASE_POOLER_HOST: 'aws-0-us-east-2.pooler.supabase.com',
    SUPABASE_POOLER_PORT: '5432',
  });

  const parsed = new URL(result);
  expect(parsed.hostname).toBe('aws-0-us-east-2.pooler.supabase.com');
  expect(parsed.username).toBe('postgres.projectref');
  expect(parsed.password).toBe('encoded%40password');
  expect(parsed.port).toBe('5432');
});

test('leaves the configured URL unchanged when no pooler host is requested', () => {
  const direct = 'postgresql://postgres:password@db.projectref.supabase.co:5432/postgres';
  expect(resolveDatabaseUrl({ DATABASE_URL: direct })).toBe(direct);
});
