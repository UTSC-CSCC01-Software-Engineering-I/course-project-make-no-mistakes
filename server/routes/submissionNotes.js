const express = require("express");

const supabaseAdmin = require("../lib/supabaseAdmin");
const { requireAuth, requireCommissioner } = require("../middleware/requireRole");

const submissionNotesRouter = express.Router();

// list a submission's commissioner notes, newest first (commissioner-only)
submissionNotesRouter.get(
	"/:id/notes",
	requireAuth,
	requireCommissioner,
	async (req, res) => {
		const { data, error } = await supabaseAdmin
			.from("submission_notes")
			.select("*")
			.eq("submission_id", req.params.id)
			.order("created_at", { ascending: false });

		if (error) {
			console.error("[GET NOTES ERROR]", error);
			return res.status(500).json({ error: "Failed to fetch notes." });
		}

		return res.status(200).json(data);
	}
);

// AI-assisted (claude)
// add a commissioner note to a submission (commissioner-only, append-only)
submissionNotesRouter.post(
	"/:id/notes",
	requireAuth,
	requireCommissioner,
	async (req, res) => {
		const note = typeof req.body.note === "string" ? req.body.note.trim() : "";

		// reject empty / whitespace-only notes
		if (!note) {
			return res.status(400).json({ error: "Note text is required." });
		}

		const { data, error } = await supabaseAdmin
			.from("submission_notes")
			.insert({
				submission_id: req.params.id,
				commissioner_id: req.user.id,
				note,
			})
			.select("*")
			.single();

		if (error) {
			console.error("[CREATE NOTE ERROR]", error);
			return res.status(500).json({ error: "Failed to create note." });
		}

		return res.status(201).json(data);
	}
);

module.exports = submissionNotesRouter;
