import { NavLink, useParams } from 'react-router'
import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'

import proposals from '../data/proposals.json'
import ProposalComment from '../components/ProposalComment'
import Map from '../components/Map'
import './ViewProposalPage.css'

import thumbsUpIcon from '../assets/thumbsUp.png'
import commentIcon from '../assets/greencomment.png'

function ViewProposalPage() {
  const { proposalId } = useParams()

  const [liveComments, setLiveComments] = useState([])
  const [newCommentText, setNewCommentText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const proposal = proposals.find(
    proposal => String(proposal.id) === String(proposalId)
  )

  const [likes, setLikes] = useState(proposal?.postLikes ?? 0)

  // --- 1. Real-Time WebSocket & Fetch Effect ---
  useEffect(() => {
    if (!proposalId) return

    // GET Request (Relies on Vite proxy to forward to 8080)
    fetch(`/api/comments?proposalId=${proposalId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) setLiveComments(data)
      })
      .catch(err => console.error("[Frontend GET Error]:", err))

    // Use environment variable for Socket to prevent hardcoding issues for teammates
    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const socket = io(SOCKET_URL);

    socket.on('comment_approved', (newComment) => {
      if (String(newComment.proposalId) === String(proposalId)) {
        setLiveComments(prev => [...prev, newComment])
        setIsProcessing(false)
      }
    })

    socket.on('comment_rejected', (data) => {
      alert(`AI Rejected: ${data.reason}`)
      setIsProcessing(false)
    })

    return () => socket.disconnect()
  }, [proposalId])

  // --- 2. Handle Comment Submission ---
  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (!newCommentText.trim()) return

    setIsProcessing(true)
    console.log("[Frontend] Attempting to post to /api/comments...");

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sb_token')}` // Added missing comma (if there were more items, but here it's fine just closing it)
        },
        body: JSON.stringify({ 
            content: newCommentText, 
            proposalId: proposalId,
            authorName: localStorage.getItem('user_email') 
        })
      });
      
      if (!res.ok) {
        // If the server crashes or proxy fails, grab the exact error text
        const errorText = await res.text();
        throw new Error(`Server returned ${res.status}: ${errorText}`);
      }

      console.log("[Frontend] Successfully submitted to server!");
      setNewCommentText(""); 
    } catch (error) {
      console.error("[Frontend POST Error]:", error);
      alert("Failed to submit comment. Check the browser console!");
      setIsProcessing(false); 
    }
  }

  function incrementLikes() {
    setLikes(previousLikes => previousLikes + 1)
  }

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
          <NavLink className="counterProposalLink" to={`/view/${proposal.id}/counter-proposal`}>
            Counter-Propose
          </NavLink>
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
              {liveComments.length}
            </span>
          </div>
        </div>
      </header>

      <div className="proposalContentBox">
        <div className="mapBox">
          <Map mode="view" />
        </div>

        <div className="commentBox">
          <div className="addCommentSection" style={{ padding: '1rem', borderBottom: '2px solid #eee' }}>
            <form onSubmit={handleCommentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <textarea 
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Write your objection or comment here..."
                rows="3"
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                required
              />
              <button 
                type="submit" 
                disabled={isProcessing}
                style={{ padding: '10px', background: isProcessing ? '#ccc' : '#2e7d32', color: 'white', border: 'none', borderRadius: '8px', cursor: isProcessing ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
              >
                {isProcessing ? 'AI is reviewing...' : 'Post Comment'}
              </button>
            </form>
          </div>

          <section className="proposalCommentList">
            {liveComments.length === 0 ? (
              <p style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>No comments yet. Be the first to object!</p>
            ) : (
              liveComments.map(comment => (
                <ProposalComment
                  key={comment.id}
                  commentId={comment.id}
                  proposalId={comment.proposalId}
                  commentUserId={comment.userId} 
                  currentUserId={localStorage.getItem('user_id')} // <-- PASSES THE ID YOU JUST SAVED IN LOGIN
                  relatedRidings={comment.relatedRidings || ["N/A"]}
                  postUser={comment.authorName || "Anonymous"} 
                  postDate={new Date(comment.createdAt).toLocaleDateString()}
                  postComment={comment.content}
                  postLikes={comment.upvotes || 0}
                  postDownvotes={comment.downvotes || 0}
                  onDelete={(deletedId) => {
                    setLiveComments(prev => prev.filter(c => c.id !== deletedId));
                  }}
                />
              ))
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

export default ViewProposalPage
