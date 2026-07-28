import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { fetchProposals } from '../utils/proposalsApi'
import { shortUser, formatDate, toTitleCase } from '../utils/format'
import './CommissionerSubmissionsPage.css'

function CommissionerSubmissionsPage() {
	const navigate = useNavigate()
	const [proposals, setProposals] = useState([])
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

		fetchProposals()
			.then((data) => {
				if (!active) return
				setProposals(data)
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
				<h1>Counter Proposals</h1>
			</header>

			{status === 'loading' && (
				<p className="commissionerSubmissionsMessage">Loading proposals…</p>
			)}

			{status === 'error' && (
				<p className="commissionerSubmissionsMessage">Unable to load proposals.</p>
			)}

			{status === 'ready' && proposals.length === 0 && (
				<p className="commissionerSubmissionsMessage">No proposals yet.</p>
			)}

			{status === 'ready' && proposals.length > 0 && (
				<div className="commissionerSubmissionsTableContainer">
					<table className="commissionerSubmissionsTable">
						<thead>
							<tr>
								<th>Reference</th>
								<th>Status</th>
								<th>Submitted By</th>
								<th>Date</th>
								<th>Rationale</th>
							</tr>
						</thead>
						<tbody>
							{proposals.map((proposal) => (
								<tr key={proposal.id}>
									<td
										className="commissionerSubmissionsReference"
										title="Click to view proposal"
										onClick={() => navigate(`/view/${proposal.id}`)}
									>
										{proposal.public_reference_number}
									</td>
									<td>{toTitleCase(proposal.status)}</td>
									<td
										className="commissionerSubmissionsUser"
										title="Click to copy user ID"
										onClick={() => handleCopyUserId(proposal.id, proposal.user_id)}
									>
										{copiedRowId === proposal.id ? 'Copied!' : shortUser(proposal.user_id)}
									</td>
									<td>{formatDate(proposal.created_at)}</td>
									<td className="commissionerSubmissionsBody">{proposal.body}</td>
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
