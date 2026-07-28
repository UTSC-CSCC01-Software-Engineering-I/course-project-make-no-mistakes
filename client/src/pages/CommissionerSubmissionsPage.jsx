import { useEffect, useState } from 'react'
import { fetchSubmissions } from '../utils/submissionsApi'
import { shortUser, formatDate } from '../utils/format'
import './CommissionerSubmissionsPage.css'

// turn a snake_case enum value into Title Case for display
function toTitleCase(value) {
	if (!value) return ''
	return String(value)
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}

function CommissionerSubmissionsPage() {
	const [submissions, setSubmissions] = useState([])
	const [status, setStatus] = useState('loading')
	const [copiedRowId, setCopiedRowId] = useState(null)

	function handleCopyUserId(rowId, userId) {
		if (!userId) return
		navigator.clipboard.writeText(userId).then(() => {
			setCopiedRowId(rowId)
			setTimeout(() => setCopiedRowId(null), 1500)
		})
	}

	useEffect(() => {
		let active = true

		fetchSubmissions()
			.then((data) => {
				if (!active) return
				setSubmissions(data)
				setStatus('ready')
			})
			.catch(() => {
				if (!active) return
				setStatus('error')
			})

		return () => {
			active = false
		}
	}, [])

	return (
		<main className="commissionerSubmissionsPage">
			<header className="commissionerSubmissionsHeader">
				<h1>All Submissions</h1>
			</header>

			{status === 'loading' && (
				<p className="commissionerSubmissionsMessage">Loading submissions…</p>
			)}

			{status === 'error' && (
				<p className="commissionerSubmissionsMessage">Unable to load submissions.</p>
			)}

			{status === 'ready' && submissions.length === 0 && (
				<p className="commissionerSubmissionsMessage">No submissions yet.</p>
			)}

			{status === 'ready' && submissions.length > 0 && (
				<div className="commissionerSubmissionsTableContainer">
					<table className="commissionerSubmissionsTable">
						<thead>
							<tr>
								<th>Reference</th>
								<th>Type</th>
								<th>Status</th>
								<th>Submitted By</th>
								<th>Date</th>
								<th>Rationale</th>
							</tr>
						</thead>
						<tbody>
							{submissions.map((submission) => (
								<tr key={submission.id}>
									<td>{submission.public_reference_number}</td>
									<td>{toTitleCase(submission.submission_type)}</td>
									<td>{toTitleCase(submission.status)}</td>
									<td
										className="commissionerSubmissionsUser"
										title="Click to copy user ID"
										onClick={() => handleCopyUserId(submission.id, submission.user_id)}
									>
										{copiedRowId === submission.id ? 'Copied!' : shortUser(submission.user_id)}
									</td>
									<td>{formatDate(submission.created_at)}</td>
									<td className="commissionerSubmissionsBody">{submission.body}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</main>
	)
}

export default CommissionerSubmissionsPage
