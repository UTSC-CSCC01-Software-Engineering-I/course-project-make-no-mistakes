import { useMemo, useEffect, useState } from 'react'
import ProposalPreview from '../components/ProposalPreview'
import SearchBar from '../components/SearchBar'
import { fetchProposals } from '../utils/proposalsApi'
import { shortUser, formatDate } from '../utils/format'
import './BrowsePage.css'

function getProposalDateInputValue(proposal) {
    const date = new Date(proposal.created_at)

    if (Number.isNaN(date.getTime())) {
        return ''
    }

    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${date.getFullYear()}-${month}-${day}`
}

function getProposalDateValue(proposal) {
    const date = new Date(proposal.created_at)

    return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function proposalMatchesSearch(proposal, query, searchType) {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
        return true
    }

    const searchableValuesByType = {
        user: [shortUser(proposal.user_id)],
        date: [getProposalDateInputValue(proposal), formatDate(proposal.created_at)],
    }

    const searchableValues = searchableValuesByType[searchType] || searchableValuesByType.user

    return searchableValues.some((value) =>
        String(value).toLowerCase().includes(normalizedQuery)
    )
}

function sortProposals(proposalsToSort, sortOption) {
    const sortedProposals = [...proposalsToSort]

    switch (sortOption) {
        case 'dateNewest':
            return sortedProposals.sort((a, b) => getProposalDateValue(b) - getProposalDateValue(a))
        case 'dateOldest':
            return sortedProposals.sort((a, b) => getProposalDateValue(a) - getProposalDateValue(b))
        case 'ratingHigh':
            return sortedProposals.sort((a, b) => (b.postRating ?? 0) - (a.postRating ?? 0))
        case 'ratingLow':
            return sortedProposals.sort((a, b) => (a.postRating ?? 0) - (b.postRating ?? 0))
        case 'commentsHigh':
            return sortedProposals.sort((a, b) => (b.postComments ?? 0) - (a.postComments ?? 0))
        case 'commentsLow':
            return sortedProposals.sort((a, b) => (a.postComments ?? 0) - (b.postComments ?? 0))
        default:
            return sortedProposals
    }
}

function BrowsePage() {
    const [proposals, setProposals] = useState([])
    const [status, setStatus] = useState('loading') // loading | ready | error

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

    const [searchQuery, setSearchQuery] = useState('')
    const [searchType, setSearchType] = useState('user')
    const [sortOption, setSortOption] = useState('default')

    const filteredProposals = useMemo(
        () => sortProposals(
            proposals.filter((proposal) => proposalMatchesSearch(proposal, searchQuery, searchType)),
            sortOption
        ),
        [proposals, searchQuery, searchType, sortOption]
    )

    return (
        <main className="browsePage">
            <header className="browsePageHeader">
                <h1>Browse Proposals:</h1>
            </header>

            <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                searchType={searchType}
                onSearchTypeChange={setSearchType}
                sortOption={sortOption}
                onSortOptionChange={setSortOption}
            />

            {status === 'loading' && <p className="browsePageMessage">Loading proposals…</p>}
            {status === 'error' && <p className="browsePageMessage">Unable to load proposals.</p>}
            {status === 'ready' && proposals.length === 0 && (
                <p className="browsePageMessage">No proposals yet.</p>
            )}
            {status === 'ready' && proposals.length > 0 && filteredProposals.length === 0 && (
                <p className="browsePageMessage">No proposals match your search.</p>
            )}

            {status === 'ready' && filteredProposals.length > 0 && (
                <section className="proposalPreviewGrid">
                    {filteredProposals.map((proposal) => (
                        <ProposalPreview
                            key={proposal.id}
                            proposalId={proposal.id}
                            postUser={shortUser(proposal.user_id)}
                            postDate={formatDate(proposal.created_at)}
                            previewURL={proposal.previewURL}
                            postRating={proposal.postRating ?? 0}
                            postLikes={proposal.postLikes ?? 0}
                            postComments={proposal.postComments ?? 0}
                        />
                    ))}
                </section>
            )}
        </main>
    );
}

export default BrowsePage;