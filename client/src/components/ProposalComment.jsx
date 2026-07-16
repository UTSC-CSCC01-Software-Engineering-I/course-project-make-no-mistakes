import './ProposalComment.css'
import { useState, useEffect } from 'react'
import thumbsUpIcon from '../assets/thumbsUp.png'
import { apiService } from '../apiService'

function ProposalComment({
    commentId,
    proposalId,
    commentUserId, 
    currentUserId, 
    relatedRidings = [],
    postUser,
    postDate,
    postComment,
    postLikes = 0,
    postDownvotes = 0,
    initialUserVote = null,
    onDelete
}) {
    const [likes, setLikes] = useState(postLikes)
    const [downvotes, setDownvotes] = useState(postDownvotes)
    const [currentUserVote, setCurrentUserVote] = useState(initialUserVote)
    const [voteBusy, setVoteBusy] = useState(false)

    useEffect(() => {
        setLikes(postLikes)
        setDownvotes(postDownvotes)
    }, [postLikes, postDownvotes])

    async function handleVote(value) {
        if (!commentId) return;
        if (!localStorage.getItem('sb_token')) {
            alert('Please log in to vote.');
            return;
        }
        if (currentUserVote != null || voteBusy) return;

        setVoteBusy(true);
        try {
            const updated = await apiService.voteComment(commentId, value);
            setLikes(updated.upvotes ?? likes);
            setDownvotes(updated.downvotes ?? downvotes);
            setCurrentUserVote(updated.currentUserVote ?? value);
        } catch (err) {
            console.error('Vote failed', err);
            if (err.status === 409) {
                alert('You have already voted on this comment.');
                setCurrentUserVote(value);
            } else if (err.status === 401) {
                alert('Please log in to vote.');
            } else {
                alert(err.message || 'Vote failed');
            }
        } finally {
            setVoteBusy(false);
        }
    }

    async function handleDelete() {
        if (!commentId) return;
        const confirmDelete = window.confirm('Are you sure you want to delete this comment?');
        if (!confirmDelete) return;

        try {
            await apiService.deleteComment(commentId);
            if (onDelete) onDelete(commentId);
        } catch (err) {
            console.error('Delete failed', err);
            alert(err.message || 'Cannot delete. You can only delete your own comments!');
        }
    }

    const isOwner = String(currentUserId) === String(commentUserId);
    const votesDisabled = currentUserVote != null || voteBusy;

    return (
        <article className="proposalComment">
            <header className="commentHeader">
                <span className="commentHeaderText">{postUser}</span>
                <span className="commentHeaderText">{postDate}</span>
            </header>

            {relatedRidings.length > 0 && (
                <header className="commentSubHeader">
                    <span className="commentSubHeaderText">
                        Selected Ridings: {relatedRidings.join(', ')}
                    </span>
                </header>
            )}

            <section className="commentBody">
                <span className="commentBodyText">{postComment}</span>
            </section>

            <footer className="commentFooter" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <span className="commentSubHeaderText" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {likes} 
                        <button
                            className="likeButtonWrapper"
                            onClick={() => handleVote(1)}
                            disabled={votesDisabled}
                            title={votesDisabled ? 'You already voted' : 'Thumbs up'}
                            style={{ cursor: votesDisabled ? 'not-allowed' : 'pointer', background: 'none', border: 'none', padding: 0, opacity: votesDisabled ? 0.5 : 1 }}
                        >
                            <img className="likeButton" src={thumbsUpIcon} alt="upvote" />
                        </button>
                    </span>

                    <span className="commentSubHeaderText" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {downvotes} 
                        <button
                            className="likeButtonWrapper"
                            onClick={() => handleVote(-1)}
                            disabled={votesDisabled}
                            title={votesDisabled ? 'You already voted' : 'Thumbs down'}
                            style={{ cursor: votesDisabled ? 'not-allowed' : 'pointer', background: 'none', border: 'none', padding: 0, opacity: votesDisabled ? 0.5 : 1 }}
                        >
                            <img className="likeButton" src={thumbsUpIcon} alt="downvote" style={{ transform: 'rotate(180deg)' }} />
                        </button>
                    </span>
                </div>

                {isOwner && (
                    <button 
                        onClick={handleDelete} 
                        style={{ background: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        Delete
                    </button>
                )}
            </footer>
        </article>
    )
}

export default ProposalComment
