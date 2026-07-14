// Backend-only tool for creating commissioner accounts by invitation.
// Not exposed over HTTP — requires shell access to the server and the service-role key in .env.
//
// Sends a Supabase invite email; the commissioner follows the link to set
// their own password
//
// Usage (from server/):
//   node --env-file=.env scripts/createCommissioner.js <email> [redirectTo]
//
// redirectTo (optional): URL the invite link lands on after the user accepts,
// e.g. your password-setup page. Must be in the Supabase project's allowed
// redirect URLs; defaults to the project's Site URL.

// import privileged supabase client instance
const supabaseAdmin = require("../lib/supabaseAdmin");

async function main() {
	const [email, redirectTo] = process.argv.slice(2);

	if (!email) {
		console.error("Usage: node --env-file=.env scripts/createCommissioner.js <email> [redirectTo]");
		process.exit(1);
	}

	const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
		email,
		redirectTo ? { redirectTo } : {}
	);

	if (error) {
		console.error("Failed to invite commissioner:", error.message);
		process.exit(1);
	}

	const userId = data.user.id;

	// inviteUserByEmail has no app_metadata option, so mirror the role there
	// in a second call (kept for parity with clients that read it off the JWT)
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
