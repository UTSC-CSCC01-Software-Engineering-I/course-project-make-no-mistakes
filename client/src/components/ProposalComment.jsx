import './ProposalComment.css'
import { useState } from 'react'

import thumbsUpIcon from '../assets/thumbsUp.png'

function ProposalComment({
    proposalId,
    relatedRidings = [],
    postUser,
    postDate,
    postComment,
    postLikes,
}) {
    const [likes, setLikes] = useState(postLikes)

    function incrementLikes() {
        setLikes(previousLikes => previousLikes + 1)
    }

    return (
        <article className="proposalComment">
            <header className="commentHeader">
                <span className="commentHeaderText">
                    {postUser}
                </span>

                <span className="commentHeaderText">
                    {postDate}
                </span>
            </header>

            {relatedRidings.length > 0 && (
                <header className="commentSubHeader">
                    <span className="commentSubHeaderText">
                        Selected Ridings: {relatedRidings.join(", ")}
                    </span>
                </header>
            )}

            <section className="commentBody">
                <span className="commentBodyText">
                    {postComment}
                </span>
            </section>

            <footer className="commentFooter">
                <span className="commentSubHeaderText">
                    Likes: {likes}
                </span>

                <button
                    className="likeButtonWrapper"
                    onClick={incrementLikes}
                >
                    <img
                        className="likeButton"
                        src={thumbsUpIcon}
                        alt="thumbs up button"
                    />
                </button>
            </footer>
        </article>
    )
}

export default ProposalComment