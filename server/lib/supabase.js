const { createClient } = require("@supabase/supabase-js"); 

const supabaseClientOptions = {
	auth: {persistSession: false}
}
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, supabaseClientOptions);

module.exports = supabase;
