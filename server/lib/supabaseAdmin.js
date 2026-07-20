// Service-role client: bypasses RLS and can call auth.admin endpoints.
// Server-side ONLY — never expose SUPABASE_SECRET_KEY to the client.

const { createClient } = require("@supabase/supabase-js");

// Create a supabase client instance using the secret key which has elevated privileges
const supabaseAdmin = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_SECRET_KEY,
	{
		auth: {
			persistSession: false,
			autoRefreshToken: false,
		},
	}
);

module.exports = supabaseAdmin;
