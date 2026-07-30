const express = require("express");

const supabaseAdmin = require("../lib/supabaseAdmin");
const { requireAuth, requireCommissioner } = require("../middleware/requireRole");

const proposalsRouter = express.Router();

const COUNTER_PROPOSAL = "counter_proposal";
const VALID_STATUSES = ["received", "under_review", "addressed"];

// list all counter-proposals, newest first
proposalsRouter.get("/", async (req, res) => {
	const { data, error } = await supabaseAdmin
		.from("submissions")
		.select("*")
		.eq("submission_type", COUNTER_PROPOSAL)
		.order("created_at", { ascending: false });

	if (error) {
		console.error("GET PROPOSALS ERROR", error);
		return res.status(500).json({ error: "Failed to fetch proposals." });
	}

	return res.status(200).json(data);
});

// list authethicated user's counter-proposals.
proposalsRouter.get("/mine", requireAuth, async (req, res) => {
	const { data, error } = await supabaseAdmin
		.from("submissions")
		.select("*")
		.eq("submission_type", COUNTER_PROPOSAL)
		.eq("user_id", req.user.id)
		.order("created_at", { ascending: false });

	if (error) {
		console.error("GET USER PROPOSALS ERROR", error);
		return res.status(500).json({ error: "Failed to fetch your proposals." });
	}

	return res.status(200).json(data);
});

// fetch a specific counter-proposal by UUID
proposalsRouter.get("/:id", async (req, res) => {
	const { data, error } = await supabaseAdmin
		.from("submissions")
		.select("*")
		.eq("id", req.params.id)
		.eq("submission_type", COUNTER_PROPOSAL)
		.maybeSingle();

	if (error) {
		console.error("GET PROPOSAL ERROR", error);
		return res.status(500).json({ error: "Failed to fetch proposal." });
	}

	if (!data) {
		return res.status(404).json({ error: "Proposal not found." });
	}

	return res.status(200).json(data);
});

// create counter-proposal; TODO: only rationale for now, need to add related ridings and such
proposalsRouter.post("/", requireAuth, async (req, res) => {
	const body = typeof req.body.body === "string" ? req.body.body.trim() : "";

	if (!body) {
		return res.status(400).json({ error: "Proposal rationale is required." });
	}

	const { data, error } = await supabaseAdmin
		.from("submissions")
		.insert({
			user_id: req.user.id,
			submission_type: COUNTER_PROPOSAL,
			body,
		})
		.select("*")
		.single();

	if (error) {
		console.error("[CREATE PROPOSAL ERROR]", error);
		return res.status(500).json({ error: "Failed to create proposal." });
	}

	return res.status(201).json(data);
});

// update a counter-proposal's processing status (commissioner-only)
proposalsRouter.patch("/:id/status", requireAuth, requireCommissioner, async (req, res) => {
	const { status } = req.body;

	if (!VALID_STATUSES.includes(status)) {
		return res.status(400).json({ error: "Invalid status." });
	}

	const { data, error } = await supabaseAdmin
		.from("submissions")
		.update({ status })
		.eq("id", req.params.id)
		.eq("submission_type", COUNTER_PROPOSAL)
		.select("*")
		.maybeSingle();

	if (error) {
		console.error("[UPDATE PROPOSAL STATUS ERROR]", error);
		return res.status(500).json({ error: "Failed to update proposal status." });
	}

	if (!data) {
		return res.status(404).json({ error: "Proposal not found." });
	}

	return res.status(200).json(data);
});

module.exports = proposalsRouter;
