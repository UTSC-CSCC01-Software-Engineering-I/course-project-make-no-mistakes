import './ProposalPreview.css'

import { NavLink } from 'react-router'
import thumbsUpIcon from '../assets/thumbsUp.png'
import commentIcon from '../assets/greencomment.png'
import proposalPlaceholder from '../assets/proposalPlaceholder.svg'

function ProposalPreview({
    proposalId,
    postUser,
    postDate,
    previewURL,
    postRating,
    postLikes,
    postComments,
    children,
}) {
    return(
    // wrapped in a box (the proposalPreview)
    // above is the user who posted it, followed by the date posted
    // inside of the box is an image preview for the proposal
    // below is the rating (percentage)
    // next to the rating is the number of likes
    // next to the rating is the number of comments
    <article className="proposalPreview">
        <header className="proposalPreviewHeader">
            <div className="distEvenHorizontalBox">
                <span className="proposalPreviewHeaderText userText">
                    {postUser}
                </span>
                <span className="proposalPreviewHeaderText dateText">
                    {postDate}
                </span>
            </div>
        </header>

        {children ? (
            <div className="proposalPreviewMap">
                {children}
            </div>
        ) : (
            <NavLink to={`/view/${proposalId}`} className="proposalPreviewLink">
                <img
                    className="proposalPreviewImage"
                    src={previewURL || proposalPlaceholder}
                    alt="Preview thumbnail of the proposal"
                />
            </NavLink>
        )}

        <footer className="proposalPreviewFooter">
            <div className="distEvenHorizontalBox">
                <div className="evenHorizontalBox">
                    <img
                        className="proposalPreviewIcon"
                        src={thumbsUpIcon}
                        alt="Thumbs up Icon"
                    />
                    <span className="proposalPreviewHeaderText">
                        {postRating}%, {postLikes} likes
                    </span>
                </div>
                <div className="evenHorizontalBox">
                    <img
                        className="proposalPreviewIcon"
                        src={commentIcon}
                        alt="Comment Icon"
                    />
                    <span className="proposalPreviewFooterText">
                        {postComments}
                    </span>
                </div>
            </div>
        </footer>
    </article>
    )
}

export default ProposalPreview