import './ProposalComment.css'
import { useState } from 'react'
import thumbsUpIcon from '../assets/thumbsUp.png'

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
    onDelete
}) {
    const [likes, setLikes] = useState(postLikes)
    const [downvotes, setDownvotes] = useState(postDownvotes)

    // GET THE CORRECT TOKEN NAME
    const token = localStorage.getItem('sb_token'); 

    async function handleUpvote() {
        if (!commentId) return; 
        try {
            const res = await fetch(`/api/comments/${commentId}/vote`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ action: 'upvote' })
            });
            if (res.ok) setLikes(prev => prev + 1);
        } catch (err) { console.error("Upvote failed", err); }
    }

    async function handleDownvote() {
        if (!commentId) return;
        try {
            const res = await fetch(`/api/comments/${commentId}/vote`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ action: 'downvote' })
            });
            if (res.ok) setDownvotes(prev => prev + 1);
        } catch (err) { console.error("Downvote failed", err); }
    }

    async function handleDelete() {
        if (!commentId) return;
        const confirmDelete = window.confirm("Are you sure you want to delete this comment?");
        if (!confirmDelete) return;

        try {
            const res = await fetch(`/api/comments/${commentId}`, { 
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (res.ok) {
                if (onDelete) onDelete(commentId); 
            } else {
                alert("Cannot delete. You can only delete your own comments!");
            }
        } catch (err) {
            console.error("Delete failed", err);
        }
    }

    // CHECK OWNERSHIP
    const isOwner = String(currentUserId) === String(commentUserId);
    
    // ADD THIS LINE TO DEBUG:
    console.log(`Comment ID: ${commentId} | Current User: ${currentUserId} | Comment Author: ${commentUserId}`);

    return (
        <article className="proposalComment">
            <header className="commentHeader">
                <span className="commentHeaderText">{postUser}</span>
                <span className="commentHeaderText">{postDate}</span>
            </header>

            {relatedRidings.length > 0 && (
                <header className="commentSubHeader">
                    <span className="commentSubHeaderText">
                        Selected Ridings: {relatedRidings.join(", ")}
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
                        <button className="likeButtonWrapper" onClick={handleUpvote} style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
                            <img className="likeButton" src={thumbsUpIcon} alt="upvote" />
                        </button>
                    </span>

                    <span className="commentSubHeaderText" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {downvotes} 
                        <button className="likeButtonWrapper" onClick={handleDownvote} style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
                            <img className="likeButton" src={thumbsUpIcon} alt="downvote" style={{ transform: 'rotate(180deg)' }} />
                        </button>
                    </span>
                </div>

                {/* ONLY SHOW DELETE BUTTON IF LOGGED-IN USER OWNS IT */}
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