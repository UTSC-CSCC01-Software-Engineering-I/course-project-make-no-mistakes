// Auth middleware: verifies the bearer token.

const supabase = require("../lib/supabase");

// Verifies the request's bearer token and attaches the authenticated user to
// req.user.
async function requireAuth(req, res, next) {
	const authHeader = req.headers.authorization || "";
	const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

	if (!token) {
		return res.status(401).json({ error: "Missing authorization token" });
	}

	const { data, error } = await supabase.auth.getUser(token);

	if (error || !data.user) {
		return res.status(401).json({ error: "Invalid or expired token" });
	}

	req.user = data.user;
	req.token = token;
	next();
}

module.exports = { requireAuth };
