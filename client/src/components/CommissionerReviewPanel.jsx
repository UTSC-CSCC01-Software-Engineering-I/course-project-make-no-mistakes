import { useEffect, useState } from 'react'
import { fetchTags, updateTags, fetchNotes, createNote } from '../utils/commissionerApi'
import { toTitleCase, shortUser, formatDate } from '../utils/format'
import './CommissionerReviewPanel.css'

// must match the submission_tag enum in server/sql/commissioner_notes_and_tags.sql
const TAG_OPTIONS = ['support', 'oppose', 'integrate', 'out_of_scope', 'correction']

// AI-assisted (claude)
// Commissioner-only review controls for a single submission.
function CommissionerReviewPanel({ submissionId }) {
	const [tags, setTags] = useState([])
	const [saving, setSaving] = useState(false)

	const [notes, setNotes] = useState([])
	const [noteText, setNoteText] = useState('')
	const [savingNote, setSavingNote] = useState(false)

	useEffect(() => {
		let active = true

		fetchTags(submissionId)
			.then((data) => {
				if (!active) return
				setTags(data.tags || [])
			})
			.catch(() => {
				if (!active) return
				setTags([])
			})

		fetchNotes(submissionId)
			.then((data) => {
				if (!active) return
				setNotes(Array.isArray(data) ? data : [])
			})
			.catch(() => {
				if (!active) return
				setNotes([])
			})

		return () => {
			active = false
		}
	}, [submissionId])

	function handleToggleTag(tag) {
		const newTags = tags.includes(tag)
			? tags.filter((existing) => existing !== tag)
			: [...tags, tag]

		setSaving(true)

		updateTags(submissionId, newTags)
			.then((updated) => {
				setTags(updated.tags || [])
			})
			.catch((error) => {
				window.alert(error.message || 'Failed to update tags.')
			})
			.finally(() => {
				setSaving(false)
			})
	}

	function handleSubmitNote(event) {
		event.preventDefault()

		const note = noteText.trim()
		if (!note || savingNote) return

		setSavingNote(true)

		createNote(submissionId, note)
			.then((created) => {
				setNotes((current) => [created, ...current])
				setNoteText('')
			})
			.catch((error) => {
				window.alert(error.message || 'Failed to add note.')
			})
			.finally(() => {
				setSavingNote(false)
			})
	}

	return (
		<section className="commissionerReviewPanel" aria-label="Commissioner review">
			<h2 className="commissionerTagsHeading">Tags</h2>

			<div className="commissionerReviewTags">
				{TAG_OPTIONS.map((tag) => {
					const active = tags.includes(tag)

					return (
						<button
							key={tag}
							type="button"
							className={`commissionerTag${active ? ' active' : ''}`}
							aria-pressed={active}
							disabled={saving}
							onClick={() => handleToggleTag(tag)}
						>
							{toTitleCase(tag)}
						</button>
					)
				})}
			</div>

			<h2 className="commissionerNotesHeading">Notes</h2>

			<form className="commissionerNoteForm" onSubmit={handleSubmitNote}>
				<textarea
					className="commissionerNoteInput"
					value={noteText}
					onChange={(event) => setNoteText(event.target.value)}
					placeholder="Add an internal note…"
					rows={3}
				/>

				<button
					className="commissionerNoteSubmit"
					type="submit"
					disabled={savingNote || !noteText.trim()}
				>
					{savingNote ? 'Adding…' : 'Add Note'}
				</button>
			</form>

			<ul className="commissionerNoteList">
				{notes.length === 0 ? (
					<li className="commissionerNoteEmpty">No notes yet.</li>
				) : (
					notes.map((note) => (
						<li key={note.id} className="commissionerNote">
							<p className="commissionerNoteText">{note.note}</p>
							<span className="commissionerNoteMeta">
								{shortUser(note.commissioner_id)} - {formatDate(note.created_at)}
							</span>
						</li>
					))
				)}
			</ul>
		</section>
	)
}

export default CommissionerReviewPanel
