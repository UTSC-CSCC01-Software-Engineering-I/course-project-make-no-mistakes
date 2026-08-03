const express = require("express");
const roleRouter = express.Router();

const supabaseAdmin = require("../lib/supabaseAdmin");
const { requireAuth } = require("../middleware/requireRole");

// returns the authenticated user's id, email, and role (from public.profiles)
roleRouter.get("/me", requireAuth, async (req, res) => {
	let { data, error } = await supabaseAdmin
		.from("profiles")
		.select("role")
		.eq("id", req.user.id)
		.single();

	if (error || !data) {
		const created = await supabaseAdmin
			.from("profiles")
			.insert({ id: req.user.id, role: "publicuser" })
			.select("role")
			.single();

		data = created.data;
		error = created.error;
	}

	if (error || !data) {
		return res.status(500).json({ error: "Unable to load profile" });
	}

	return res.json({ id: req.user.id, email: req.user.email, role: data.role });
});

module.exports = roleRouter;
