const express = require("express");
const roleRouter = express.Router();

const supabaseAdmin = require("../lib/supabaseAdmin");
const { requireAuth } = require("../middleware/requireRole");

// returns the authenticated user's id, email, and role (from public.profiles)
roleRouter.get("/me", requireAuth, async (req, res) => {
	const { data, error } = await supabaseAdmin
		.from("profiles")
		.select("role")
		.eq("id", req.user.id)
		.single();

	if (error || !data) {
		return res.status(404).json({ error: "Profile not found" });
	}

	return res.json({ id: req.user.id, email: req.user.email, role: data.role });
});

module.exports = roleRouter;
