const { createClient } = require("@supabase/supabase-js"); 
const ws = require("ws"); 

const supabaseClientOptions = {
    auth: { persistSession: false },
    realtime: { transport: ws } 
}

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_PUBLISHABLE_KEY, 
    supabaseClientOptions
);

module.exports = supabase;