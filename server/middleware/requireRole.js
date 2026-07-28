// Auth middleware: verifies the bearer token

const supabase = require("../lib/supabase");
const supabaseAdmin = require("../lib/supabaseAdmin");

// Verifies the request's bearer token and attaches the authenticated user to
// req.user
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

// looks up the caller's role in public.profiles and rejects non-commissioners
// must run after requireAuth so req.user is set
async function requireCommissioner(req, res, next) {
	const { data, error } = await supabaseAdmin
		.from("profiles")
		.select("role")
		.eq("id", req.user.id)
		.single();

	if (error || !data) {
		return res.status(403).json({ error: "Not authorized" });
	}

	if (data.role !== "commissioner") {
		return res.status(403).json({ error: "Commissioner access required" });
	}

	next();
}

module.exports = { requireAuth, requireCommissioner };
