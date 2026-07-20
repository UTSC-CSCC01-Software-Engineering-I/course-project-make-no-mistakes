const express = require("express");
const authRouter = express.Router();

// import public-facing supabase client
const supabase = require("../lib/supabase")
const supabaseAdmin = require("../lib/supabaseAdmin")
const { requireAuth } = require("../middleware/requireRole")

// registration route
authRouter.post("/register", async (req, res) => {
	const { emailEntry, pwdEntry } = req.body;

	if (!emailEntry || !pwdEntry) {
		return res.status(400).json({ error: 'Email and password are required' });
	}

	const { data, error } = await supabase.auth.signUp({
		email: emailEntry,
		password: pwdEntry,
		options: {
			emailRedirectTo: 'http://localhost:5173/'
		}
	})

	if (error) return res.status(400).json({ error: error.message });

	return res.status(201).json({ message: 'Successfully registered!' });
})

// login route
authRouter.post("/login", async (req, res) => {
	const { emailEntry, pwdEntry } = req.body;

	if (!emailEntry || !pwdEntry) {
		return res.status(400).json({ error: 'Email and password are required' });
	}

	await supabase.auth.signOut();

	const { data, error } = await supabase.auth.signInWithPassword({
		email: emailEntry,
		password: pwdEntry
	})

	if (error) return res.status(401).json({ error: error.message });

	return res.json({
		message: "Logged in successfully!",
		token: data.session.access_token,
		user: data.user
	});
})

// logout route: revokes the refresh token for this session only,
// the user's other sessions/devices stay logged in.
authRouter.post("/logout", requireAuth, async (req, res) => {
	const { error } = await supabaseAdmin.auth.admin.signOut(req.token, 'local');

	if (error) return res.status(400).json({ error: error.message });

	return res.json({ message: "Logged out successfully!" });
})

module.exports = authRouter;
