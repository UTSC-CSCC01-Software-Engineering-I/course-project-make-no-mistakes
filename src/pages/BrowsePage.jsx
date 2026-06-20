import ProposalPreview from '../components/ProposalPreview'
import proposals from '../data/proposals.json'
import SearchBar from '../components/SearchBar'
import './BrowsePage.css'

function BrowsePage() {
    return (
        <main className="browsePage">
            <header className="browsePageHeader">
                <h1>Browse Proposals:</h1>
            </header>
            <SearchBar />
            <section className="proposalBrowseGrid">
                {proposals.map((proposal) =>(
                    <ProposalPreview
                        key={proposal.id}
                        proposalId={proposal.id}
                        postUser={proposal.postUser}
                        postDate={proposal.postDate}
                        previewURL={proposal.previewURL}
                        postRating={proposal.postRating}
                        postVotes={proposal.postVotes}
                        postComments={proposal.postComments}
                    />
                ))}
            </section>
        </main>
    );
  }
  
export default BrowsePage;