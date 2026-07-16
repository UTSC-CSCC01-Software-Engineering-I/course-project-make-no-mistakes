require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    'SUPABASE_URL is missing. Check your backend .env file.'
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    'SUPABASE_PUBLISHABLE_KEY is missing. Check your backend .env file.'
  );
}

const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      transport: WebSocket,
    },
  }
);

module.exports = supabase;