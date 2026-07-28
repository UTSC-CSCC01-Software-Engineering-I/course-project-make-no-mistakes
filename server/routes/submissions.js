const express = require("express");

const supabaseAdmin = require("../lib/supabaseAdmin");
const { requireAuth, requireCommissioner } = require("../middleware/requireRole");

const submissionsRouter = express.Router();

// list every submission (all types, all users), newest first; commissioner-only
submissionsRouter.get("/", requireAuth, requireCommissioner, async (req, res) => {
	const { data, error } = await supabaseAdmin
		.from("submissions")
		.select("*")
		.order("created_at", { ascending: false });

	if (error) {
		console.error("GET SUBMISSIONS ERROR", error);
		return res.status(500).json({ error: "Failed to fetch submissions." });
	}

	return res.status(200).json(data);
});

module.exports = submissionsRouter;
