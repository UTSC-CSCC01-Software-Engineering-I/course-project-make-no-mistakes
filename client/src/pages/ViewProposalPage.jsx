import { useParams } from 'react-router'
import { useState } from 'react'
import proposals from '../data/proposals.json'
import comments from '../data/comments.json'
import ProposalComment from '../components/ProposalComment'
import Map from '../components/Map'
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

  const [likes, setLikes] = useState(proposal?.postLikes ?? 0)
  function incrementLikes() {
    setLikes(previousLikes => previousLikes + 1)
  }

  return (
    <main>
      <header className="proposalPageHeader">
        <div className="horizontalProposalHeaderBox">
          <span className="proposalHeaderText">
            ID: {proposal.id}
          </span>

          <div className="ratingBox">
            <button className="prettierButton" onClick={incrementLikes}>
              <img
                className="iconBox"
                src={thumbsUpIcon}
                alt="thumbs up button"
              />
            </button>

            <span className="proposalHeaderText">
              {likes} likes
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

          <div className="commentCountBox">
            <img
              className="iconBox"
              src={commentIcon}
              alt="comment icon"
            />

            <span className="smallerCommentHeaderText">
              {proposal.postComments}
            </span>
          </div>
        </div>
      </header>

      <div className="proposalContentBox">
        <div className="mapBox">
          <Map mode="view" />
        </div>

        <div className="commentBox">
          <section className="proposalCommentList">
            {comments
              .filter(comment => String(comment.proposalId) === String(proposal.id))
              .map(comment => (
                <ProposalComment
                  key={comment.id}
                  proposalId={comment.proposalId}
                  relatedRidings={comment.relatedRidings}
                  postUser={comment.postUser}
                  postDate={comment.postDate}
                  postComment={comment.postComment}
                  postLikes={comment.postLikes}
                />
              ))}
          </section>
        </div>
      </div>
    </main>
  )
}

export default ViewProposalPage
