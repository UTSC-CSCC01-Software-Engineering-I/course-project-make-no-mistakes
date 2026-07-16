import { useEffect, useState } from 'react'
import ProposalPreview from '../components/ProposalPreview'
import SearchBar from '../components/SearchBar'
import { apiService } from '../apiService'
import './BrowsePage.css'

function BrowsePage() {
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sort, setSort] = useState('newest')
  const [minVotes, setMinVotes] = useState(0)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const limit = 20

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    apiService
      .getProposals({ sort, minVotes, page, limit })
      .then((data) => {
        if (cancelled) return
        setProposals(data.proposals || [])
        setTotal(data.total ?? 0)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[BrowsePage]', err)
        setError(err.message || 'Failed to load proposals')
        setProposals([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [sort, minVotes, page])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <main className="browsePage">
      <header className="browsePageHeader">
        <h1>Browse Proposals:</h1>
      </header>
      <SearchBar />

      <div className="browseFilters" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        <label>
          Sort:{' '}
          <select value={sort} onChange={(e) => { setPage(0); setSort(e.target.value); }}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="popular">Popular</option>
            <option value="rating">Rating</option>
            <option value="id">ID</option>
          </select>
        </label>
        <label>
          Min votes:{' '}
          <input
            type="number"
            min="0"
            value={minVotes}
            onChange={(e) => {
              setPage(0)
              setMinVotes(Number(e.target.value) || 0)
            }}
            style={{ width: '5rem' }}
          />
        </label>
      </div>

      {loading && <p>Loading proposals…</p>}
      {error && <p role="alert">Error: {error}</p>}

      {!loading && !error && (
        <section className="proposalPreviewGrid">
          {proposals.length === 0 ? (
            <p>No proposals match these filters.</p>
          ) : (
            proposals.map((proposal) => (
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
            ))
          )}
        </section>
      )}

      {!loading && total > limit && (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
          <button type="button" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </main>
  )
}

export default BrowsePage
