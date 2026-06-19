import './ProposalPreview.css'

function ProposalPreview({
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

        <img
            className="proposalPreviewImage"
            src={previewURL}
            alt="Preview thumbnail of the proposal"
        />

        <footer className="proposalPreviewHeader">
            <div className="distEvenHorizontalBox">
                <img
                    className="proposalPreviewIcon"
                    src="/thumbsUp.png"
                    alt="Thumbs up Icon"
                />
                <span className="proposalPreviewHeaderText">
                    {postRating}%, {postVotes} votes
                </span>
            </div>
            <div className="distEvenHorizontalBox">
                <img
                    className="proposalPreviewIcon"
                    src="/commentC01.png"
                    alt="Comment Icon"
                />
                <span className="proposalPreviewHeaderText">
                    {postComments} comments
                </span>
            </div>
        </footer>
    </article>
    )
}

export default ProposalPreview