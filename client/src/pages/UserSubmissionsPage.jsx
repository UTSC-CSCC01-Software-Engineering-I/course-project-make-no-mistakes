import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import SearchBar from '../components/SearchBar';
import { fetchMyProposals } from '../utils/proposalsApi';
import { formatDate, toTitleCase } from '../utils/format';
import './UserSubmissionsPage.css';

const STATUS_OPTIONS = ['received', 'under_review', 'addressed'];

function getSubmissionDateInputValue(proposal) {
    const date = new Date(proposal.created_at);
    if (Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function matchesDate(proposal, searchDate) {
    if (!searchDate) return true;
    return getSubmissionDateInputValue(proposal) === searchDate;
}

function matchesStatus(proposal, statusFilter) {
    if (statusFilter === 'all') return true;
    return proposal.status === statusFilter;
}

function UserSubmissionsPage() {
    const navigate = useNavigate();
    const [proposals, setProposals] = useState([]);
    const [status, setStatus] = useState('loading');

    const [searchDate, setSearchDate] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    function handleClearFilters() {
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

    const hasActiveFilters = Boolean(searchDate) || statusFilter !== 'all';

    const filteredProposals = useMemo(() => {
        return proposals.filter(
            (proposal) => matchesDate(proposal, searchDate) && matchesStatus(proposal, statusFilter)
        );
    }, [proposals, searchDate, statusFilter]);

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
                <SearchBar
                    value={searchDate}
                    onChange={setSearchDate}
                    searchType="date"
                    showSearchTypeSelector={false}
                    showFilter={false}
                />

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
