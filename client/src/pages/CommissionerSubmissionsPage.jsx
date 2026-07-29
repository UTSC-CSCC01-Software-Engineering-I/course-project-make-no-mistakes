import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { fetchProposals } from '../utils/proposalsApi'
import { shortUser, formatDate, toTitleCase } from '../utils/format'
import './CommissionerSubmissionsPage.css'

const STATUS_OPTIONS = ['received', 'under_review', 'addressed']

function matchesReference(proposal, referenceQuery) {
	if (!referenceQuery) return true
	return proposal.public_reference_number
		.toLowerCase()
		.includes(referenceQuery.trim().toLowerCase())
}

function matchesStatus(proposal, statusFilter) {
	if (statusFilter === 'all') return true
	return proposal.status === statusFilter
}

function matchesUser(proposal, userQuery) {
	if (!userQuery) return true
	return (proposal.user_id || '')
		.toLowerCase()
		.includes(userQuery.trim().toLowerCase())
}

function matchesDateRange(proposal, dateFrom, dateTo) {
	if (!dateFrom && !dateTo) return true

	const submittedAt = new Date(proposal.created_at)

	if (dateFrom && submittedAt < new Date(`${dateFrom}T00:00:00`)) return false
	if (dateTo && submittedAt > new Date(`${dateTo}T23:59:59.999`)) return false

	return true
}

function CommissionerSubmissionsPage() {
	const navigate = useNavigate()
	const [proposals, setProposals] = useState([])
	const [status, setStatus] = useState('loading')
	const [copiedRowId, setCopiedRowId] = useState(null)

	const [referenceQuery, setReferenceQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState('all')
	const [userQuery, setUserQuery] = useState('')
	const [dateFrom, setDateFrom] = useState('')
	const [dateTo, setDateTo] = useState('')

	function handleClearFilters() {
		setReferenceQuery('')
		setStatusFilter('all')
		setUserQuery('')
		setDateFrom('')
		setDateTo('')
	}

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

	const filteredProposals = useMemo(() => {
		return proposals.filter(
			(proposal) =>
				matchesReference(proposal, referenceQuery) &&
				matchesStatus(proposal, statusFilter) &&
				matchesUser(proposal, userQuery) &&
				matchesDateRange(proposal, dateFrom, dateTo)
		)
	}, [proposals, referenceQuery, statusFilter, userQuery, dateFrom, dateTo])

	return (
		<main className="commissionerSubmissionsPage">
			<header className="commissionerSubmissionsHeader">
				<h1>Counter Proposals</h1>
			</header>

			{status === 'ready' && proposals.length > 0 && (
				<div className="commissionerSubmissionsFilters">
					<div className="commissionerSubmissionsFilterField">
						<label htmlFor="reference-search">Reference</label>
						<input
							id="reference-search"
							type="text"
							placeholder="Search reference number"
							value={referenceQuery}
							onChange={(event) => setReferenceQuery(event.target.value)}
						/>
					</div>

					<div className="commissionerSubmissionsFilterField">
						<label htmlFor="status-filter">Status</label>
						<select
							id="status-filter"
							value={statusFilter}
							onChange={(event) => setStatusFilter(event.target.value)}
						>
							<option value="all">All</option>
							{STATUS_OPTIONS.map((option) => (
								<option key={option} value={option}>
									{toTitleCase(option)}
								</option>
							))}
						</select>
					</div>

					<div className="commissionerSubmissionsFilterField">
						<label htmlFor="user-search">Submitted By</label>
						<input
							id="user-search"
							type="text"
							placeholder="Search user ID"
							value={userQuery}
							onChange={(event) => setUserQuery(event.target.value)}
						/>
					</div>

					<div className="commissionerSubmissionsFilterField">
						<label htmlFor="date-from">From</label>
						<input
							id="date-from"
							type="date"
							value={dateFrom}
							onChange={(event) => setDateFrom(event.target.value)}
						/>
					</div>

					<div className="commissionerSubmissionsFilterField">
						<label htmlFor="date-to">To</label>
						<input
							id="date-to"
							type="date"
							value={dateTo}
							onChange={(event) => setDateTo(event.target.value)}
						/>
					</div>

					<button
						className="commissionerSubmissionsClearFilters"
						type="button"
						onClick={handleClearFilters}
					>
						Clear Filters
					</button>
				</div>
			)}

			{status === 'loading' && (
				<p className="commissionerSubmissionsMessage">Loading proposals…</p>
			)}

			{status === 'error' && (
				<p className="commissionerSubmissionsMessage">Unable to load proposals.</p>
			)}

			{status === 'ready' && proposals.length === 0 && (
				<p className="commissionerSubmissionsMessage">No proposals yet.</p>
			)}

			{status === 'ready' && proposals.length > 0 && filteredProposals.length === 0 && (
				<p className="commissionerSubmissionsMessage">No proposals match your filters.</p>
			)}

			{status === 'ready' && filteredProposals.length > 0 && (
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
							{filteredProposals.map((proposal) => (
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
