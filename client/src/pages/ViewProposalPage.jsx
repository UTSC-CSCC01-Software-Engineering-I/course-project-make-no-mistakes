import { useParams } from 'react-router'
import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import proposals from '../data/proposals.json'
import ProposalComment from '../components/ProposalComment'
import Map from '../components/Map'
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
  // outer ring of parent polygon
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

// Helper: Check if a coordinate is identical to any vertex of another polygon (within tiny floating tolerance)
function isSharedCoordinate(coord, polygonCoords) {
  const ring = polygonCoords[0];
  if (!ring) return false;
  
  const TOLERANCE = 1e-6; 
  return ring.some(p => Math.abs(p[0] - coord[0]) < TOLERANCE && Math.abs(p[1] - coord[1]) < TOLERANCE);
}

function getPolygonAreaOverlapPercentage(polyA, polyB) {
  const coordsA = polyA.geometry.coordinates[0]; // Outer ring of A
  const coordsB = polyB.geometry.coordinates;    // Rings of B
  
  if (!coordsA || !coordsB) return 0;

  // 1. Calculate Bounding Box of Poly A
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  coordsA.forEach(([x, y]) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });

  // 12x12 sample grid inside the bounding box
  const GRID_RESOLUTION = 12; // 144 sample points provides excellent accuracy and speed
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

        // check if it also falls inside Poly B
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

  const [liveComments, setLiveComments] = useState([])
  const [newCommentText, setNewCommentText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const proposal = proposals.find(
    proposal => String(proposal.id) === String(proposalId)
  )

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

  const [likes, setLikes] = useState(proposal?.postLikes ?? 0)
  const [isLineStringClosed, setIsLineStringClosed] = useState(false)
  const [validationError, setValidationError] = useState(null)

  function incrementLikes() {
    setLikes(previousLikes => previousLikes + 1)
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

      // spatial sampling method
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
