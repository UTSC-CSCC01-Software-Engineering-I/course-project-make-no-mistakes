import { useMemo, useState } from 'react'
import ProposalPreview from '../components/ProposalPreview'
import proposals from '../data/proposals.json'
import SearchBar from '../components/SearchBar'
import './BrowsePage.css'

function proposalMatchesSearch(proposal, query, searchType) {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
        return true
    }

    const searchableValuesByType = {
        user: [proposal.postUser],
        date: [getProposalDateInputValue(proposal), proposal.postDate],
    }

    const searchableValues = searchableValuesByType[searchType] || searchableValuesByType.user

    return searchableValues.some((value) =>
        String(value).toLowerCase().includes(normalizedQuery)
    )
}

function getProposalDateInputValue(proposal) {
    const [month, day, year] = proposal.postDate.split('/').map(Number)

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getProposalDateValue(proposal) {
    const [month, day, year] = proposal.postDate.split('/').map(Number)

    return new Date(year, month - 1, day).getTime()
}

function sortProposals(proposalsToSort, sortOption) {
    const sortedProposals = [...proposalsToSort]

    switch (sortOption) {
        case 'dateNewest':
            return sortedProposals.sort((a, b) => getProposalDateValue(b) - getProposalDateValue(a))
        case 'dateOldest':
            return sortedProposals.sort((a, b) => getProposalDateValue(a) - getProposalDateValue(b))
        case 'ratingHigh':
            return sortedProposals.sort((a, b) => b.postRating - a.postRating)
        case 'ratingLow':
            return sortedProposals.sort((a, b) => a.postRating - b.postRating)
        case 'commentsHigh':
            return sortedProposals.sort((a, b) => b.postComments - a.postComments)
        case 'commentsLow':
            return sortedProposals.sort((a, b) => a.postComments - b.postComments)
        default:
            return sortedProposals
    }
}

function BrowsePage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [searchType, setSearchType] = useState('user')
    const [sortOption, setSortOption] = useState('default')

    const filteredProposals = useMemo(
        () => sortProposals(
            proposals.filter((proposal) => proposalMatchesSearch(proposal, searchQuery, searchType)),
            sortOption
        ),
        [searchQuery, searchType, sortOption]
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
                searchTypes={['user', 'date']}
            />
            <section className="proposalPreviewGrid">
                {filteredProposals.map((proposal) =>(
                    <ProposalPreview
                        key={proposal.id}
                        proposalId={proposal.id}
                        postUser={proposal.postUser}
                        postDate={proposal.postDate}
                        previewURL={proposal.previewURL}
                        postRating={proposal.postRating}
                        postLikes={proposal.postLikes}
                        postComments={proposal.postComments}
                    />
                ))}
            </section>
            {filteredProposals.length === 0 && (
                <p className="browsePageNoResults">
                    No proposals match your search.
                </p>
            )}
        </main>
    );
  }
  
export default BrowsePage;
