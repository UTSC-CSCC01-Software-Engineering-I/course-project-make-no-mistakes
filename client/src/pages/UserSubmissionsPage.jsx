import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import { useNavigate } from 'react-router';

import {
    fetchMyProposals,
} from '../utils/proposalsApi';

import {
    fetchMyObjections,
} from '../utils/objectionsApi';

import {
    formatDate,
    toTitleCase,
} from '../utils/format';

import './UserSubmissionsPage.css';

function parseArrayValue(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (
        value == null ||
        value === ''
    ) {
        return [];
    }

    if (typeof value !== 'string') {
        return [];
    }

    try {
        const parsed =
            JSON.parse(value);

        return Array.isArray(parsed)
            ? parsed
            : [];
    } catch {
        return [value];
    }
}

function normalizeRidingNames(value) {
    const names =
        parseArrayValue(value)
            .map((riding) => {
                if (
                    typeof riding ===
                    'string'
                ) {
                    return riding.trim();
                }

                if (
                    riding &&
                    typeof riding ===
                        'object'
                ) {
                    return String(
                        riding
                            .federalDistrictName ??
                            riding
                                .federal_district_name ??
                            riding.name ??
                            ''
                    ).trim();
                }

                return '';
            })
            .filter(Boolean);

    return [...new Set(names)];
}

function makeFallbackReference(
    prefix,
    id
) {
    const identifier =
        String(id ?? '')
            .padStart(6, '0');

    return `${prefix}-${identifier}`;
}

function normalizeProposal(proposal) {
    return {
        id: proposal.id,

        type: 'counter_proposal',

        typeLabel:
            'Counter-Proposal',

        reference:
            proposal
                .public_reference_number ??
            proposal
                .publicReferenceNumber ??
            makeFallbackReference(
                'CP',
                proposal.id
            ),

        status:
            proposal.status ??
            'received',

        createdAt:
            proposal.created_at ??
            proposal.createdAt,

        body:
            proposal.body ?? '',

        relatedRidings: [],

        viewPath:
            `/view/${proposal.id}`,
    };
}

function normalizeObjection(objection) {
    const relatedRidings =
        normalizeRidingNames(
            objection.relatedRidings ??
                objection
                    .related_ridings
        );

    const detailRidingNames =
        normalizeRidingNames(
            objection
                .relatedRidingDetails ??
                objection
                    .related_riding_details
        );

    return {
        id: objection.id,

        type: 'objection',

        typeLabel: 'Objection',

        reference:
            objection
                .public_reference_number ??
            objection
                .publicReferenceNumber ??
            makeFallbackReference(
                'OBJ',
                objection.id
            ),

        status:
            objection.status ??
            'pending',

        createdAt:
            objection.created_at ??
            objection.createdAt,

        body:
            objection.body ??
            objection.content ??
            '',

        relatedRidings: [
            ...new Set([
                ...relatedRidings,
                ...detailRidingNames,
            ]),
        ],

        /*
         * Change this to `/objections/${objection.id}`
         * after creating a dedicated objection
         * details page.
         */
        viewPath: null,
    };
}

function matchesReference(
    submission,
    referenceQuery
) {
    const query =
        referenceQuery
            .trim()
            .toLowerCase();

    if (!query) {
        return true;
    }

    return String(
        submission.reference ?? ''
    )
        .toLowerCase()
        .includes(query);
}

function matchesDate(
    submission,
    searchDate
) {
    if (!searchDate) {
        return true;
    }

    const submittedAt =
        new Date(
            submission.createdAt
        );

    if (
        Number.isNaN(
            submittedAt.getTime()
        )
    ) {
        return false;
    }

    return (
        submittedAt >=
            new Date(
                `${searchDate}T00:00:00`
            ) &&
        submittedAt <=
            new Date(
                `${searchDate}T23:59:59.999`
            )
    );
}

function matchesStatus(
    submission,
    statusFilter
) {
    if (statusFilter === 'all') {
        return true;
    }

    return (
        submission.status ===
        statusFilter
    );
}

function matchesType(
    submission,
    typeFilter
) {
    if (typeFilter === 'all') {
        return true;
    }

    return (
        submission.type ===
        typeFilter
    );
}

function UserSubmissionsPage() {
    const navigate =
        useNavigate();

    const [
        submissions,
        setSubmissions,
    ] = useState([]);

    const [status, setStatus] =
        useState('loading');

    const [
        referenceQuery,
        setReferenceQuery,
    ] = useState('');

    const [
        searchDate,
        setSearchDate,
    ] = useState('');

    const [
        statusFilter,
        setStatusFilter,
    ] = useState('all');

    const [
        typeFilter,
        setTypeFilter,
    ] = useState('all');

    function handleClearFilters() {
        setReferenceQuery('');
        setSearchDate('');
        setStatusFilter('all');
        setTypeFilter('all');
    }

    useEffect(() => {
        let active = true;

        setStatus('loading');

        Promise.all([
            fetchMyProposals(),
            fetchMyObjections(),
        ])
            .then(
                ([
                    proposals,
                    objections,
                ]) => {
                    if (!active) {
                        return;
                    }

                    const normalized =
                        [
                            ...proposals.map(
                                normalizeProposal
                            ),

                            ...objections.map(
                                normalizeObjection
                            ),
                        ].sort(
                            (
                                first,
                                second
                            ) =>
                                new Date(
                                    second.createdAt
                                ).getTime() -
                                new Date(
                                    first.createdAt
                                ).getTime()
                        );

                    setSubmissions(
                        normalized
                    );

                    setStatus('ready');
                }
            )
            .catch((error) => {
                if (!active) {
                    return;
                }

                console.error(
                    '[MY SUBMISSIONS ERROR]',
                    error
                );

                if (
                    error.status ===
                    401
                ) {
                    navigate('/login');
                    return;
                }

                setStatus('error');
            });

        return () => {
            active = false;
        };
    }, [navigate]);

    /*
     * Build the status filter from actual
     * proposal and objection statuses.
     */
    const statusOptions =
        useMemo(() => {
            return [
                ...new Set(
                    submissions
                        .map(
                            (submission) =>
                                submission.status
                        )
                        .filter(Boolean)
                ),
            ].sort();
        }, [submissions]);

    const hasActiveFilters =
        Boolean(referenceQuery) ||
        Boolean(searchDate) ||
        statusFilter !== 'all' ||
        typeFilter !== 'all';

    const filteredSubmissions =
        useMemo(() => {
            return submissions.filter(
                (submission) =>
                    matchesReference(
                        submission,
                        referenceQuery
                    ) &&
                    matchesDate(
                        submission,
                        searchDate
                    ) &&
                    matchesStatus(
                        submission,
                        statusFilter
                    ) &&
                    matchesType(
                        submission,
                        typeFilter
                    )
            );
        }, [
            submissions,
            referenceQuery,
            searchDate,
            statusFilter,
            typeFilter,
        ]);

    function handleOpenSubmission(
        submission
    ) {
        if (submission.viewPath) {
            navigate(
                submission.viewPath
            );
        }
    }

    return (
        <main className="userSubmissionsPage">
            <header className="userSubmissionsHeader">
                <div className="userSubmissionsHeaderTop">
                    <h1>
                        My Submissions
                    </h1>

                    <div className="userSubmissionsHeaderActions">
                        <button
                            className="userSubmissionsSecondaryActionButton"
                            type="button"
                            onClick={() =>
                                navigate(
                                    '/submit-objection'
                                )
                            }
                        >
                            + Submit Objection
                        </button>

                        <button
                            className="userSubmissionsActionButton"
                            type="button"
                            onClick={() =>
                                navigate(
                                    '/submit-counter-proposal'
                                )
                            }
                        >
                            + Submit Counter-Proposal
                        </button>
                    </div>
                </div>
            </header>

            <div className="userSubmissionsFilters">
                <div className="userSubmissionsFilterField">
                    <label htmlFor="reference-search">
                        Reference
                    </label>

                    <input
                        id="reference-search"
                        type="text"
                        placeholder="Search reference number"
                        value={
                            referenceQuery
                        }
                        onChange={(
                            event
                        ) =>
                            setReferenceQuery(
                                event
                                    .target
                                    .value
                            )
                        }
                    />
                </div>

                <div className="userSubmissionsFilterField">
                    <label htmlFor="date-search">
                        Date
                    </label>

                    <input
                        id="date-search"
                        type="date"
                        value={
                            searchDate
                        }
                        onChange={(
                            event
                        ) =>
                            setSearchDate(
                                event
                                    .target
                                    .value
                            )
                        }
                    />
                </div>

                <div className="userSubmissionsFilterField">
                    <label htmlFor="type-filter">
                        Type
                    </label>

                    <select
                        id="type-filter"
                        value={
                            typeFilter
                        }
                        onChange={(
                            event
                        ) =>
                            setTypeFilter(
                                event
                                    .target
                                    .value
                            )
                        }
                    >
                        <option value="all">
                            All
                        </option>

                        <option value="counter_proposal">
                            Counter-Proposals
                        </option>

                        <option value="objection">
                            Objections
                        </option>
                    </select>
                </div>

                <div className="userSubmissionsFilterField">
                    <label htmlFor="status-filter">
                        Status
                    </label>

                    <select
                        id="status-filter"
                        value={
                            statusFilter
                        }
                        onChange={(
                            event
                        ) =>
                            setStatusFilter(
                                event
                                    .target
                                    .value
                            )
                        }
                    >
                        <option value="all">
                            All
                        </option>

                        {statusOptions.map(
                            (option) => (
                                <option
                                    key={
                                        option
                                    }
                                    value={
                                        option
                                    }
                                >
                                    {
                                        toTitleCase(
                                            option
                                        )
                                    }
                                </option>
                            )
                        )}
                    </select>
                </div>

                {hasActiveFilters && (
                    <button
                        className="userSubmissionsClearFilters"
                        type="button"
                        onClick={
                            handleClearFilters
                        }
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {status === 'loading' && (
                <p className="userSubmissionsMessage">
                    Loading your
                    submissions…
                </p>
            )}

            {status === 'error' && (
                <p className="userSubmissionsMessage">
                    Unable to load your
                    submissions.
                </p>
            )}

            {status === 'ready' &&
                submissions.length ===
                    0 && (
                    <p className="userSubmissionsMessage">
                        You haven&apos;t
                        submitted anything
                        yet.
                    </p>
                )}

            {status === 'ready' &&
                submissions.length > 0 &&
                filteredSubmissions.length ===
                    0 && (
                    <p className="userSubmissionsMessage">
                        No submissions
                        match your filters.
                    </p>
                )}

            {status === 'ready' &&
                filteredSubmissions.length >
                    0 && (
                    <div className="userSubmissionsTableContainer">
                        <table className="userSubmissionsTable">
                            <thead>
                                <tr>
                                    <th>
                                        Type
                                    </th>

                                    <th>
                                        Reference
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                    <th>
                                        Date
                                    </th>

                                    <th>
                                        Target Riding(s)
                                    </th>

                                    <th>
                                        Rationale
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredSubmissions.map(
                                    (
                                        submission
                                    ) => (
                                        <tr
                                            key={`${submission.type}-${submission.id}`}
                                        >
                                            <td>
                                                <span
                                                    className={`userSubmissionsTypeBadge type-${submission.type}`}
                                                >
                                                    {
                                                        submission.typeLabel
                                                    }
                                                </span>
                                            </td>

                                            <td
                                                className={
                                                    submission.viewPath
                                                        ? 'userSubmissionsReference isClickable'
                                                        : 'userSubmissionsReference'
                                                }
                                                title={
                                                    submission.viewPath
                                                        ? 'Click to view submission'
                                                        : undefined
                                                }
                                                onClick={() =>
                                                    handleOpenSubmission(
                                                        submission
                                                    )
                                                }
                                            >
                                                {
                                                    submission.reference
                                                }
                                            </td>

                                            <td>
                                                <span
                                                    className={`userSubmissionsStatusBadge status-${submission.status}`}
                                                >
                                                    {
                                                        toTitleCase(
                                                            submission.status
                                                        )
                                                    }
                                                </span>
                                            </td>

                                            <td>
                                                {
                                                    formatDate(
                                                        submission.createdAt
                                                    )
                                                }
                                            </td>

                                            <td className="userSubmissionsTargetRidings">
                                                {submission.relatedRidings.length >
                                                0
                                                    ? submission.relatedRidings.join(
                                                          ', '
                                                      )
                                                    : '—'}
                                            </td>

                                            <td className="userSubmissionsBody">
                                                {
                                                    submission.body
                                                }
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
        </main>
    );
}

export default UserSubmissionsPage;