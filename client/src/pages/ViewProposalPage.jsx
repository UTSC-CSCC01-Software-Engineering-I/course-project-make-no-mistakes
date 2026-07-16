import { useParams } from 'react-router'
import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import ProposalComment from '../components/ProposalComment'
import Map from '../components/Map'
import { apiService } from '../apiService'
import './ViewProposalPage.css'

import thumbsUpIcon from '../assets/thumbsUp.png'
import commentIcon from '../assets/greencomment.png'

function getDistanceInMeters(coord1, coord2) {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371e3; 
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}

function isPointInPolygon(point, polygonCoords) {
  const [x, y] = point;
  let inside = false;
  const ring = polygonCoords[0];
  if (!ring) return false;
  
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function getPolygonAreaOverlapPercentage(polyA, polyB) {
  const coordsA = polyA.geometry.coordinates[0];
  const coordsB = polyB.geometry.coordinates;
  
  if (!coordsA || !coordsB) return 0;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  coordsA.forEach(([x, y]) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });

  const GRID_RESOLUTION = 12;
  let totalPointsInA = 0;
  let pointsInAAndB = 0;

  const stepX = (maxX - minX) / (GRID_RESOLUTION - 1);
  const stepY = (maxY - minY) / (GRID_RESOLUTION - 1);

  for (let i = 0; i < GRID_RESOLUTION; i++) {
    for (let j = 0; j < GRID_RESOLUTION; j++) {
      const px = minX + i * stepX;
      const py = minY + j * stepY;
      const samplePoint = [px, py];

      if (isPointInPolygon(samplePoint, polyA.geometry.coordinates)) {
        totalPointsInA++;
        if (isPointInPolygon(samplePoint, coordsB)) {
          pointsInAAndB++;
        }
      }
    }
  }

  if (totalPointsInA === 0) return 0;
  return pointsInAAndB / totalPointsInA;
}

const DISTANCE_THRESHOLD = 50; 

function ViewProposalPage() {
  const { proposalId } = useParams()
  const mapComponentRef = useRef(null);

  const [proposal, setProposal] = useState(null)
  const [proposalLoading, setProposalLoading] = useState(true)
  const [proposalError, setProposalError] = useState(null)

  const [liveComments, setLiveComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentsError, setCommentsError] = useState(null)

  const [newCommentText, setNewCommentText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [likes, setLikes] = useState(0)
  const [downvotes, setDownvotes] = useState(0)
  const [currentUserVote, setCurrentUserVote] = useState(null)
  const [voteBusy, setVoteBusy] = useState(false)
  const [isLineStringClosed, setIsLineStringClosed] = useState(false)
  const [validationError, setValidationError] = useState(null)

  // Load proposal from API
  useEffect(() => {
    if (!proposalId) return
    let cancelled = false
    setProposalLoading(true)
    setProposalError(null)

    apiService
      .getProposal(proposalId)
      .then((data) => {
        if (cancelled) return
        setProposal(data)
        setLikes(data.postLikes ?? 0)
        setDownvotes(data.postDownvotes ?? 0)
        setCurrentUserVote(data.currentUserVote ?? null)
      })
      .catch((err) => {
        if (cancelled) return
        setProposal(null)
        setProposalError(err.status === 404 ? 'Proposal not found' : (err.message || 'Failed to load proposal'))
      })
      .finally(() => {
        if (!cancelled) setProposalLoading(false)
      })

    return () => { cancelled = true }
  }, [proposalId])

  // Load comments + Socket.io for real-time updates (REST is still source of truth on load)
  useEffect(() => {
    if (!proposalId) return
    let cancelled = false
    setCommentsLoading(true)
    setCommentsError(null)

    apiService
      .getComments(proposalId)
      .then((data) => {
        if (cancelled) return
        if (Array.isArray(data)) setLiveComments(data)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[Frontend GET Error]:', err)
        setCommentsError(err.message || 'Failed to load comments')
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false)
      })

    // Socket connects directly to the API host (Vite proxies REST only).
    const SOCKET_URL =
      (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL) ||
      'http://localhost:8080';
    const socket = io(SOCKET_URL);

    socket.on('comment_approved', (newComment) => {
      if (String(newComment.proposalId) === String(proposalId)) {
        setLiveComments(prev => {
          if (prev.some(c => c.id === newComment.id)) return prev
          return [...prev, newComment]
        })
        setIsProcessing(false)
      }
    })

    socket.on('comment_rejected', (data) => {
      alert(`AI Rejected: ${data.reason}`)
      setIsProcessing(false)
    })

    socket.on('comment:voted', (updated) => {
      if (String(updated.proposalId) !== String(proposalId)) return
      setLiveComments(prev =>
        prev.map(c =>
          c.id === updated.id
            ? { ...c, upvotes: updated.upvotes, downvotes: updated.downvotes }
            : c
        )
      )
    })

    socket.on('comment:voteUpdated', (updated) => {
      if (String(updated.proposalId) !== String(proposalId)) return
      setLiveComments(prev =>
        prev.map(c =>
          c.id === updated.id
            ? { ...c, upvotes: updated.upvotes, downvotes: updated.downvotes }
            : c
        )
      )
    })

    socket.on('proposal:voteUpdated', (updated) => {
      if (String(updated.id) !== String(proposalId)) return
      setLikes(updated.upvotes ?? updated.postLikes ?? 0)
      setDownvotes(updated.downvotes ?? updated.postDownvotes ?? 0)
    })

    socket.on('comment:deleted', (payload) => {
      if (String(payload.proposalId) !== String(proposalId)) return
      setLiveComments(prev => prev.filter(c => c.id !== payload.id))
    })

    return () => {
      cancelled = true
      socket.disconnect()
    }
  }, [proposalId])

  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (!newCommentText.trim()) return

    const token = localStorage.getItem('sb_token')
    if (!token) {
      alert('Please log in to post a comment.')
      return
    }

    setIsProcessing(true)

    try {
      await apiService.addComment(proposalId, newCommentText.trim())
      setNewCommentText("")
    } catch (error) {
      console.error('[Frontend POST Error]:', error);
      alert(error.message || 'Failed to submit comment.')
      setIsProcessing(false)
    }
  }

  async function handleProposalVote(value) {
    if (!localStorage.getItem('sb_token')) {
      alert('Please log in to vote.')
      return
    }
    if (currentUserVote != null || voteBusy) return

    setVoteBusy(true)
    try {
      const result = await apiService.voteProposal(proposalId, value)
      setLikes(result.upvotes ?? result.postLikes ?? likes)
      setDownvotes(result.downvotes ?? result.postDownvotes ?? downvotes)
      setCurrentUserVote(result.currentUserVote ?? value)
    } catch (err) {
      console.error('[Proposal vote Error]:', err)
      if (err.status === 409) {
        alert('You have already voted on this proposal.')
        setCurrentUserVote(value)
      } else if (err.status === 401) {
        alert('Please log in to vote.')
      } else {
        alert(err.message || 'Vote failed')
      }
    } finally {
      setVoteBusy(false)
    }
  }

  const handleDrawChange = (geoJsonData) => {
    let foundClosedLineString = false;
    let hasStrayLines = false;
    let hasNestedPolygon = false;

    if (geoJsonData && geoJsonData.features) {
      const polygons = [];

      for (const feature of geoJsonData.features) {
        if (feature.geometry.type === 'LineString') {
          hasStrayLines = true;
          
          const coords = feature.geometry.coordinates;
          if (coords.length >= 3) {
            const firstPoint = coords[0];
            const lastPoint = coords[coords.length - 1];
            if (getDistanceInMeters(firstPoint, lastPoint) <= DISTANCE_THRESHOLD) {
              foundClosedLineString = true;
            }
          }
        } else if (feature.geometry.type === 'Polygon') {
          polygons.push(feature);
        }
      }

      const OVERLAP_PERCENT_THRESHOLD = 0.25;
      
      for (let i = 0; i < polygons.length; i++) {
        for (let j = 0; j < polygons.length; j++) {
          if (i === j) continue;
          
          const overlapPercent = getPolygonAreaOverlapPercentage(polygons[i], polygons[j]);
          if (overlapPercent > OVERLAP_PERCENT_THRESHOLD) {
            hasNestedPolygon = true;
            break;
          }
        }
        if (hasNestedPolygon) break;
      }
    }

    setIsLineStringClosed(foundClosedLineString);

    if (hasStrayLines) {
      setValidationError("Invalid: Stray lines detected. All census boundaries must be closed polygons.");
    } else if (hasNestedPolygon) {
      setValidationError("Invalid: Overlapping boundary detected. Census tracts cannot overlap by more than 45%.");
    } else {
      setValidationError(null); 
    }
  }

  const handleSimplifyClick = () => {
    if (mapComponentRef.current) {
        mapComponentRef.current.simplifyDrawing();
    }
  }

  if (proposalLoading) {
    return (
      <main>
        <p>Loading proposal…</p>
      </main>
    )
  }

  if (proposalError || !proposal) {
    return (
      <main>
        <p>Error: {proposalError || 'Proposal not found'}</p>
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
            <button
              className="prettierButton"
              onClick={() => handleProposalVote(1)}
              disabled={currentUserVote != null || voteBusy}
              title={currentUserVote != null ? 'You already voted' : 'Thumbs up'}
            >
              <img
                className="iconBox"
                src={thumbsUpIcon}
                alt="thumbs up button"
              />
            </button>

            <span className="proposalHeaderText">
              {likes} likes
            </span>

            <button
              className="prettierButton"
              onClick={() => handleProposalVote(-1)}
              disabled={currentUserVote != null || voteBusy}
              title={currentUserVote != null ? 'You already voted' : 'Thumbs down'}
            >
              <img
                className="iconBox"
                src={thumbsUpIcon}
                alt="thumbs down button"
                style={{ transform: 'rotate(180deg)' }}
              />
            </button>

            <span className="proposalHeaderText">
              {downvotes} dislikes
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
              {liveComments.length}
            </span>
          </div>
        </div>
      </header>

      <div className="proposalContentBox">
        <div className="mapBox">
            
          <button className="simplifyButton" onClick={handleSimplifyClick}>
            Simplify
          </button>

          {validationError ? (
            <div className="validationBanner invalid">
              {validationError}
            </div>
          ) : isLineStringClosed ? (
            <div className="validationBanner warning">
              Closed polygon detected! Click "Simplify" to fuse coordinates and save memory.
            </div>
          ) : (
            <div className="validationBanner valid">
              ✓ Census Boundaries Valid
            </div>
          )}

          <Map
            ref={mapComponentRef}
            mode="objection"
            onDrawChange={handleDrawChange} 
          />
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
            {commentsLoading && (
              <p style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>Loading comments…</p>
            )}
            {commentsError && (
              <p style={{ padding: '1rem', textAlign: 'center', color: '#d32f2f' }} role="alert">
                {commentsError}
              </p>
            )}
            {!commentsLoading && !commentsError && liveComments.length === 0 ? (
              <p style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>No comments yet. Be the first to object!</p>
            ) : (
              liveComments.map(comment => (
                <ProposalComment
                  key={comment.id}
                  commentId={comment.id}
                  proposalId={comment.proposalId}
                  commentUserId={comment.userId} 
                  currentUserId={localStorage.getItem('user_id')}
                  relatedRidings={comment.relatedRidings || []}
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
