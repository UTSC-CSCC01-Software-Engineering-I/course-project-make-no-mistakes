const express = require("express");

const supabaseAdmin = require("../lib/supabaseAdmin");
const { requireAuth } = require("../middleware/requireRole");

const objectionsRouter = express.Router();

const OBJECTION = "objection";

// list all objections, newest first
objectionsRouter.get("/", async (req, res) => {
	const { data, error } = await supabaseAdmin
		.from("submissions")
		.select("*")
		.eq("submission_type", OBJECTION)
		.order("created_at", { ascending: false });

	if (error) {
		console.error("GET OBJECTIONS ERROR", error);
		return res.status(500).json({ error: "Failed to fetch objections." });
	}

	return res.status(200).json(data);
});

// list authethicated user's objections.
objectionsRouter.get("/mine", requireAuth, async (req, res) => {
	const { data, error } = await supabaseAdmin
		.from("submissions")
		.select("*")
		.eq("submission_type", OBJECTION)
		.eq("user_id", req.user.id)
		.order("created_at", { ascending: false });

	if (error) {
		console.error("GET USER OBJECTIONS ERROR", error);
		return res.status(500).json({ error: "Failed to fetch your objections." });
	}

	return res.status(200).json(data);
});

// fetch a specific objection by UUID
objectionsRouter.get("/:id", async (req, res) => {
	const { data, error } = await supabaseAdmin
		.from("submissions")
		.select("*")
		.eq("id", req.params.id)
		.eq("submission_type", OBJECTION)
		.maybeSingle();

	if (error) {
		console.error("GET OBJECTION ERROR", error);
		return res.status(500).json({ error: "Failed to fetch objection." });
	}

	if (!data) {
		return res.status(404).json({ error: "Objection not found." });
	}

	return res.status(200).json(data);
});

// create objection; TODO: only reason for now, need to add target ridings/block later
objectionsRouter.post("/", requireAuth, async (req, res) => {
	const body = typeof req.body.body === "string" ? req.body.body.trim() : "";

	if (!body) {
		return res.status(400).json({ error: "Objection reason is required." });
	}

	const { data, error } = await supabaseAdmin
		.from("submissions")
		.insert({
			user_id: req.user.id,
			submission_type: OBJECTION,
			body,
		})
		.select("*")
		.single();

	if (error) {
		console.error("[CREATE OBJECTION ERROR]", error);
		return res.status(500).json({ error: "Failed to create objection." });
	}

	return res.status(201).json(data);
});

module.exports = objectionsRouter;
