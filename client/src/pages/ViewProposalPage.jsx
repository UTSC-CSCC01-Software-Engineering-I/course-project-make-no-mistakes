import { useParams } from 'react-router'
import proposals from '../data/proposals.json'
import './ViewProposalPage.css'

import thumbsUpIcon from '../assets/thumbsUp.png'
import commentIcon from '../assets/greencomment.png'

function ViewProposalPage() {
  const { proposalId } = useParams()

  // getting the data for the proposal
  const proposal = proposals.find(
    proposal => String(proposal.id) === String(proposalId)
  )

  // making sure the proposal was found
  if (!proposal) {
    return (
      <main>
        <p>Error: Proposal not found</p>
      </main>
    )
  }

  return (
    <main>
      <header className="proposalPageHeader">
        <div className="horizontalProposalHeaderBox">
          <span className="proposalHeaderText">
            ID: {proposal.id}
          </span>

          <div className="ratingBox">
            <button>
              <img
                className="iconBox"
                src={thumbsUpIcon}
                alt="thumbs up button"
              />
            </button>

            <span className="proposalHeaderText">
              {proposal.postRating}
            </span>
          </div>

            <span className="proposalHeaderText">
              {proposal.postUser}
            </span>
          <span className="proposalHeaderText">
            {proposal.postDate}
          </span>
        </div>

        <div className="horizontalCommentHeaderBox">
          <span className="commentHeaderText">
            Comments:
          </span>

          <img
            className="iconBox"
            src={commentIcon}
            alt="comment icon"
          />

          <span className="smallerCommentHeaderText">
            {proposal.postComments}
          </span>
        </div>
      </header>

      <div className="proposalContentBox">
        <div className="mapBox">
          {/* this is just a placeholder image until we are able to add
              the actual map here :) */}
          <img
            className="mapImage"
            src={proposal.previewURL || "https://geology.com/canada/ontario-map.gif"}
            alt="proposal map"
          />
        </div>

        <div className="commentBox">
          {/* user comments will go here */}
        </div>
      </div>
    </main>
  )
}

export default ViewProposalPage