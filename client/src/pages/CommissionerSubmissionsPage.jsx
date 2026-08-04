import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { fetchProposals, updateProposalStatus } from '../utils/proposalsApi'
import { shortUser, formatDate, toTitleCase } from '../utils/format'
import { exportToCSV, exportToPDF } from '../utils/exportUtils'
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
	const [savingRowId, setSavingRowId] = useState(null)

	const [referenceQuery, setReferenceQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState('all')
	const [userQuery, setUserQuery] = useState('')
	const [dateFrom, setDateFrom] = useState('')
	const [dateTo, setDateTo] = useState('')

	// Export UI and Selection State
	const [selectedIds, setSelectedIds] = useState(new Set())
	const [exportCriteria, setExportCriteria] = useState({ filter: true, selection: false })
	const [exportFormat, setExportFormat] = useState('csv')

	function handleClearFilters() {
		setReferenceQuery('')
		setStatusFilter('all')
		setUserQuery('')
		setDateFrom('')
		setDateTo('')
	}

	function handleSelectAll(event) {
		if (event.target.checked) {
			const newSelected = new Set(selectedIds)
			filteredProposals.forEach((p) => newSelected.add(p.id))
			setSelectedIds(newSelected)
		} else {
			const newSelected = new Set(selectedIds)
			filteredProposals.forEach((p) => newSelected.delete(p.id))
			setSelectedIds(newSelected)
		}
	}

	function handleSelect(id) {
		const newSelected = new Set(selectedIds)
		if (newSelected.has(id)) {
			newSelected.delete(id)
		} else {
			newSelected.add(id)
		}
		setSelectedIds(newSelected)
	}

	function handleExport() {
		let itemsToExport = []
		const filterSet = new Set(filteredProposals.map((p) => p.id))

		if (exportCriteria.filter && exportCriteria.selection) {
			// Union sets
			itemsToExport = proposals.filter((p) => filterSet.has(p.id) || selectedIds.has(p.id))
		} else if (exportCriteria.filter) {
			itemsToExport = filteredProposals
		} else if (exportCriteria.selection) {
			itemsToExport = proposals.filter((p) => selectedIds.has(p.id))
		} else {
			window.alert('Please select at least one export criteria.')
			return
		}

		if (itemsToExport.length === 0) {
			window.alert('No submissions matched your export criteria.')
			return
		}

		if (exportFormat === 'csv') {
			exportToCSV(itemsToExport, 'commissioner-export.csv')
		} else {
			exportToPDF(itemsToExport, 'commissioner-export.pdf')
		}
	}

	function handleStatusChange(rowId, newStatus) {
		setSavingRowId(rowId)
		updateProposalStatus(rowId, newStatus)
			.then((updated) => {
				setProposals((prev) =>
					prev.map((proposal) =>
						proposal.id === rowId ? { ...proposal, status: updated.status } : proposal
					)
				)
			})
			.catch((error) => {
				window.alert(error.message || 'Failed to update status.')
			})
			.finally(() => {
				setSavingRowId(null)
			})
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

	const hasActiveFilters =
		Boolean(referenceQuery) ||
		statusFilter !== 'all' ||
		Boolean(userQuery) ||
		Boolean(dateFrom) ||
		Boolean(dateTo)

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
				<>
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

						{hasActiveFilters && (
							<button
								className="commissionerSubmissionsClearFilters"
								type="button"
								onClick={handleClearFilters}
							>
								Clear Filters
							</button>
						)}
					</div>

					<div className="commissionerExportSection">
						<div className="commissionerExportGrid">
							<div className="commissionerExportGroup">
								<div className="commissionerExportGroupHeader">
									<h3 className="commissionerExportGroupTitle">Criteria</h3>
									<span className="commissionerExportGroupSub">(multiple criteria exports their union)</span>
								</div>
								<div className="commissionerExportOptions">
									<label className="commissionerExportOption">
										<input
											type="checkbox"
											checked={exportCriteria.filter}
											onChange={(e) =>
												setExportCriteria((prev) => ({ ...prev, filter: e.target.checked }))
											}
										/>
										Filter
									</label>
									<label className="commissionerExportOption">
										<input
											type="checkbox"
											checked={exportCriteria.selection}
											onChange={(e) =>
												setExportCriteria((prev) => ({ ...prev, selection: e.target.checked }))
											}
										/>
										Selection
									</label>
								</div>
							</div>

							<div className="commissionerExportGroup">
								<div className="commissionerExportGroupHeader">
									<h3 className="commissionerExportGroupTitle">File Format</h3>
								</div>
								<div className="commissionerExportOptions">
									<label className="commissionerExportOption">
										<input
											type="radio"
											name="format"
											value="csv"
											checked={exportFormat === 'csv'}
											onChange={(e) => setExportFormat(e.target.value)}
										/>
										CSV
									</label>
									<label className="commissionerExportOption">
										<input
											type="radio"
											name="format"
											value="pdf"
											checked={exportFormat === 'pdf'}
											onChange={(e) => setExportFormat(e.target.value)}
										/>
										PDF
									</label>
								</div>
							</div>
						</div>
						<button className="commissionerExportSubmit" type="button" onClick={handleExport}>
							Export and Download
						</button>
					</div>
				</>
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
								<th style={{ width: '40px' }}>
									<input
										type="checkbox"
										className="commissionerSubmissionsCheckbox"
										checked={
											filteredProposals.length > 0 &&
											filteredProposals.every((p) => selectedIds.has(p.id))
										}
										onChange={handleSelectAll}
										title="Select all filtered rows"
									/>
								</th>
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
									<td>
										<input
											type="checkbox"
											className="commissionerSubmissionsCheckbox"
											checked={selectedIds.has(proposal.id)}
											onChange={() => handleSelect(proposal.id)}
										/>
									</td>
									<td
										className="commissionerSubmissionsReference"
										title="Click to view proposal"
										onClick={() => navigate(`/view/${proposal.id}`)}
									>
										{proposal.public_reference_number}
									</td>
									<td>
										<select
											className="commissionerSubmissionsStatusSelect"
											value={proposal.status}
											disabled={savingRowId === proposal.id}
											onChange={(event) =>
												handleStatusChange(proposal.id, event.target.value)
											}
										>
											{STATUS_OPTIONS.map((option) => (
												<option key={option} value={option}>
													{toTitleCase(option)}
												</option>
											))}
										</select>
									</td>
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