// AI-assisted (claude)
const express = require("express");

const supabaseAdmin = require("../lib/supabaseAdmin");
const { requireAuth, requireCommissioner } = require("../middleware/requireRole");

const submissionTagsRouter = express.Router();

const VALID_TAGS = ["support", "oppose", "integrate", "out_of_scope", "correction"];

// fetch a submission's commissioner tags (commissioner-only).
// a submission with no tag row yet reads as an empty set.
submissionTagsRouter.get(
	"/:id/tags",
	requireAuth,
	requireCommissioner,
	async (req, res) => {
		const { data, error } = await supabaseAdmin
			.from("submission_tags")
			.select("tags")
			.eq("submission_id", req.params.id)
			.maybeSingle();

		if (error) {
			console.error("[GET TAGS ERROR]", error);
			return res.status(500).json({ error: "Failed to fetch tags." });
		}

		return res.status(200).json({
			submission_id: req.params.id,
			tags: data?.tags ?? [],
		});
	}
);

// replace a submission's commissioner tag set (commissioner-only, upsert)
submissionTagsRouter.put(
	"/:id/tags",
	requireAuth,
	requireCommissioner,
	async (req, res) => {
		const { tags } = req.body;

		if (!Array.isArray(tags) || tags.some((tag) => !VALID_TAGS.includes(tag))) {
			return res.status(400).json({ error: "Invalid tags." });
		}

		// de-duplicate elements
		const uniqueTags = [...new Set(tags)];

		const { data, error } = await supabaseAdmin
			.from("submission_tags")
			.upsert(
				{
					submission_id: req.params.id,
					tags: uniqueTags,
					updated_by: req.user.id,
					updated_at: new Date().toISOString(),
				},
				{ onConflict: "submission_id" }
			)
			.select("*")
			.single();

		if (error) {
			console.error("[UPDATE TAGS ERROR]", error);
			return res.status(500).json({ error: "Failed to update tags." });
		}

		return res.status(200).json(data);
	}
);

module.exports = submissionTagsRouter;
