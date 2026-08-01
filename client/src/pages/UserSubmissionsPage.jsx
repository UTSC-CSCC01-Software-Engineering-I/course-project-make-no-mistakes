import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { fetchMyProposals } from '../utils/proposalsApi';
import { formatDate, toTitleCase } from '../utils/format';
import './UserSubmissionsPage.css';

const STATUS_OPTIONS = ['received', 'under_review', 'addressed'];

function matchesReference(proposal, referenceQuery) {
    if (!referenceQuery) return true;
    return proposal.public_reference_number
        .toLowerCase()
        .includes(referenceQuery.trim().toLowerCase());
}

function matchesDate(proposal, searchDate) {
    if (!searchDate) return true;

    const submittedAt = new Date(proposal.created_at);

    return (
        submittedAt >= new Date(`${searchDate}T00:00:00`) &&
        submittedAt <= new Date(`${searchDate}T23:59:59.999`)
    );
}

function matchesStatus(proposal, statusFilter) {
    if (statusFilter === 'all') return true;
    return proposal.status === statusFilter;
}

function UserSubmissionsPage() {
    const navigate = useNavigate();
    const [proposals, setProposals] = useState([]);
    const [status, setStatus] = useState('loading');

    const [referenceQuery, setReferenceQuery] = useState('');
    const [searchDate, setSearchDate] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    function handleClearFilters() {
        setReferenceQuery('');
        setSearchDate('');
        setStatusFilter('all');
    }

    useEffect(() => {
        let active = true;

        fetchMyProposals()
            .then((data) => {
                if (!active) return;
                setProposals(data);
                setStatus('ready');
            })
            .catch(() => {
                if (!active) return;
                setStatus('error');
            });

        return () => {
            active = false;
        };
    }, []);

    const hasActiveFilters =
        Boolean(referenceQuery) || Boolean(searchDate) || statusFilter !== 'all';

    const filteredProposals = useMemo(() => {
        return proposals.filter(
            (proposal) =>
                matchesReference(proposal, referenceQuery) &&
                matchesDate(proposal, searchDate) &&
                matchesStatus(proposal, statusFilter)
        );
    }, [proposals, referenceQuery, searchDate, statusFilter]);

    return (
        <main className="userSubmissionsPage">
            <header className="userSubmissionsHeader">
                <div className="userSubmissionsHeaderTop">
                    <h1>My Submissions</h1>
                    <button
                        className="userSubmissionsActionButton"
                        onClick={() => navigate('/submit-counter-proposal')}
                    >
                        + Submit Counter-Proposal
                    </button>
                </div>
            </header>

            <div className="userSubmissionsFilters">
                <div className="userSubmissionsFilterField">
                    <label htmlFor="reference-search">Reference</label>
                    <input
                        id="reference-search"
                        type="text"
                        placeholder="Search reference number"
                        value={referenceQuery}
                        onChange={(event) => setReferenceQuery(event.target.value)}
                    />
                </div>

                <div className="userSubmissionsFilterField">
                    <label htmlFor="date-search">Date</label>
                    <input
                        id="date-search"
                        type="date"
                        value={searchDate}
                        onChange={(event) => setSearchDate(event.target.value)}
                    />
                </div>

                <div className="userSubmissionsFilterField">
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

                {hasActiveFilters && (
                    <button
                        className="userSubmissionsClearFilters"
                        type="button"
                        onClick={handleClearFilters}
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {status === 'loading' && (
                <p className="userSubmissionsMessage">Loading your submissions…</p>
            )}

            {status === 'error' && (
                <p className="userSubmissionsMessage">Unable to load your submissions.</p>
            )}

            {status === 'ready' && proposals.length === 0 && (
                <p className="userSubmissionsMessage">You haven't submitted anything yet.</p>
            )}

            {status === 'ready' && proposals.length > 0 && filteredProposals.length === 0 && (
                <p className="userSubmissionsMessage">No submissions match your filters.</p>
            )}

            {status === 'ready' && filteredProposals.length > 0 && (
                <div className="userSubmissionsTableContainer">
                    <table className="userSubmissionsTable">
                        <thead>
                            <tr>
                                <th>Reference</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Rationale</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProposals.map((proposal) => (
                                <tr key={proposal.id}>
                                    <td
                                        className="userSubmissionsReference"
                                        title="Click to view proposal"
                                        onClick={() => navigate(`/view/${proposal.id}`)}
                                    >
                                        {proposal.public_reference_number}
                                    </td>
                                    <td>
                                        <span className={`userSubmissionsStatusBadge status-${proposal.status}`}>
                                            {toTitleCase(proposal.status)}
                                        </span>
                                    </td>
                                    <td>{formatDate(proposal.created_at)}</td>
                                    <td className="userSubmissionsBody">{proposal.body}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
}

export default UserSubmissionsPage;
