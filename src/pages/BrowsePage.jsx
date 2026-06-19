import ProposalPreview from '../components/ProposalPreview'
import './BrowsePage.css'
function BrowsePage() {
    return (
        <main className="browsePage">
            <ProposalPreview
                postUser="userName"
                postDate="June 19, 2026"
                previewURL="/catSquish1.png"
                postRating={85}
                postVotes={120}
                postComments={14}
            />
        </main>
    );
  }
  
export default BrowsePage;