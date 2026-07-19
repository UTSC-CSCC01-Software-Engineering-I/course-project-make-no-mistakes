import { useEffect, useState } from 'react'
import ProposalPreview from '../components/ProposalPreview'
import SearchBar from '../components/SearchBar'
import { fetchProposals } from '../utils/proposalsApi'
import { shortUser, formatDate } from '../utils/format'
import './BrowsePage.css'

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

    return (
        <main className="browsePage">
            <header className="browsePageHeader">
                <h1>Browse Proposals:</h1>
            </header>
            <SearchBar />

            {status === 'loading' && <p className="browsePageMessage">Loading proposals…</p>}
            {status === 'error' && <p className="browsePageMessage">Unable to load proposals.</p>}
            {status === 'ready' && proposals.length === 0 && (
                <p className="browsePageMessage">No proposals yet.</p>
            )}

            {status === 'ready' && proposals.length > 0 && (
                <section className="proposalPreviewGrid">
                    {proposals.map((proposal) => (
                        <ProposalPreview
                            key={proposal.id}
                            proposalId={proposal.id}
                            postUser={shortUser(proposal.user_id)}
                            postDate={formatDate(proposal.created_at)}
                            previewURL={proposal.previewURL}
                            postRating={0}
                            postLikes={proposal.likes ?? 0}
                            postComments={0}
                        />
                    ))}
                </section>
            )}
        </main>
    );
  }

export default BrowsePage;
