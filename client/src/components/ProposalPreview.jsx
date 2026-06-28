import './ProposalPreview.css'

import { NavLink } from 'react-router'
import thumbsUpIcon from '../assets/thumbsUp.png'
import commentIcon from '../assets/greencomment.png'

function ProposalPreview({
    proposalId,
    postUser,
    postDate,
    previewURL,
    postRating,
    postVotes,
    postComments,
}) {
    return(
    // wrapped in a box (the proposalPreview)
    // above is the user who posted it, followed by the date posted
    // inside of the box is an image preview for the proposal
    // below is the rating (percentage)
    // next to the rating is the number of votes
    // next to the rating is the number of comments
    <article className="proposalPreview">
        <header className="proposalPreviewHeader">
            <div className="distEvenHorizontalBox">
                <span className="proposalPreviewHeaderText">
                    {postUser}
                </span>
                <span className="proposalPreviewHeaderText">
                    {postDate}
                </span>
            </div>
        </header>

        <NavLink to={`/view/${proposalId}`} className="proposalPreviewLink">
            <img
                className="proposalPreviewImage"
                src={previewURL}
                alt="Preview thumbnail of the proposal"
            />
        </NavLink>

        <footer className="proposalPreviewHeader">
            <div className="distEvenHorizontalBox">
                <div className="evenHorizontalBox">
                    <img
                        className="proposalPreviewIcon"
                        src={thumbsUpIcon}
                        alt="Thumbs up Icon"
                    />
                    <span className="proposalPreviewHeaderText">
                        {postRating}%, {postVotes} votes
                    </span>
                </div>
                <div className="evenHorizontalBox">
                    <img
                        className="proposalPreviewIcon"
                        src={commentIcon}
                        alt="Comment Icon"
                    />
                    <span className="proposalPreviewHeaderText">
                        {postComments}
                    </span>
                </div>
            </div>
        </footer>
    </article>
    )
}

export default ProposalPreview