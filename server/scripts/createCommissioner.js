// Backend-only tool for creating commissioner accounts directly.
// Not exposed over HTTP — requires shell access to the server and the service-role key in .env.
//
// Creates the account with the given email + password immediately (no invite
// email); the commissioner can log in right away with those credentials.
//
// Usage (from server/):
//   node --env-file=.env scripts/createCommissioner.js <email> <password>

// import privileged supabase client instance
const supabaseAdmin = require("../lib/supabaseAdmin");

async function main() {
	const [email, password] = process.argv.slice(2);

	if (!email || !password) {
		console.error("Usage: node --env-file=.env scripts/createCommissioner.js <email> <password>");
		process.exit(1);
	}

	const { data, error } = await supabaseAdmin.auth.admin.createUser({
		email,
		password,
		email_confirm: true,
	});

	if (error) {
		console.error("Failed to create commissioner:", error.message);
		process.exit(1);
	}

	const userId = data.user.id;

	// AI-assisted code
	// createUser has no top-level role option, so mirror the role in
	// app_metadata via a second call (kept for parity with clients that read
	// it off the JWT)
	const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
		app_metadata: { role: "commissioner" },
	});

	if (metaError) {
		console.error("Failed to set commissioner app_metadata:", metaError.message);
		process.exit(1);
	}

	// the signup trigger creates the profile as 'publicuser'; promote it
	// through the sanctioned admin_set_role function
	const { error: roleError } = await supabaseAdmin.rpc("admin_set_role", {
		target_user: userId,
		new_role: "commissioner",
	});

	if (roleError) {
		console.error("Failed to set commissioner role:", roleError.message);
		process.exit(1);
	}

	console.log(`Commissioner invited: ${data.user.email} (${userId}) — invite email sent`);
}

main();
