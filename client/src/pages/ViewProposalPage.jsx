import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { io } from 'socket.io-client'

import proposals from '../data/proposals.json'
import ProposalComment from '../components/ProposalComment'
import Map from '../components/Map'
import { SOCKET_URL } from '../config/api'
import { PROVINCE_MAP_DATA } from '../config/mapData'

import './ViewProposalPage.css'

import thumbsUpIcon from '../assets/thumbsUp.png'
import commentIcon from '../assets/greencomment.png'

const DISTANCE_THRESHOLD = 50
const AUTH_TOKEN_STORAGE_KEY = 'sb_token'
const LEGACY_AUTH_TOKEN_STORAGE_KEY = 'token'
const LOGIN_PATH = '/login'

function readAccessToken() {
  return (
    localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ||
    localStorage.getItem(LEGACY_AUTH_TOKEN_STORAGE_KEY)
  )
}

function clearAccessToken() {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  localStorage.removeItem(LEGACY_AUTH_TOKEN_STORAGE_KEY)
}

function getUserIdFromAccessToken(accessToken) {
  if (!accessToken) return null

  try {
    const [, payload] = accessToken.split('.')

    if (!payload) return null

    const normalizedPayload = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=')

    const decodedPayload = JSON.parse(atob(normalizedPayload))

    return decodedPayload.sub || null
  } catch (error) {
    console.error('[AUTH TOKEN DECODE ERROR]', error)
    return null
  }
}

function getDistanceInMeters(coord1, coord2) {
  const [lon1, lat1] = coord1
  const [lon2, lat2] = coord2
  const earthRadius = 6371e3

  const latitude1 = (lat1 * Math.PI) / 180
  const latitude2 = (lat2 * Math.PI) / 180
  const latitudeDifference = ((lat2 - lat1) * Math.PI) / 180
  const longitudeDifference = ((lon2 - lon1) * Math.PI) / 180

  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(latitude1) *
      Math.cos(latitude2) *
      Math.sin(longitudeDifference / 2) ** 2

  const angularDistance =
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))

  return earthRadius * angularDistance
}

function isPointInPolygon(point, polygonCoordinates) {
  const [x, y] = point
  const ring = polygonCoordinates[0]
  let inside = false

  if (!ring) return false

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]

    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi

    if (intersects) {
      inside = !inside
    }
  }

  return inside
}

function getPolygonAreaOverlapPercentage(polygonA, polygonB) {
  const coordinatesA = polygonA.geometry.coordinates[0]
  const coordinatesB = polygonB.geometry.coordinates

  if (!coordinatesA || !coordinatesB) {
    return 0
  }

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  coordinatesA.forEach(([x, y]) => {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  })

  const gridResolution = 12
  const stepX = (maxX - minX) / (gridResolution - 1)
  const stepY = (maxY - minY) / (gridResolution - 1)

  let pointsInA = 0
  let pointsInBoth = 0

  for (let xIndex = 0; xIndex < gridResolution; xIndex += 1) {
    for (let yIndex = 0; yIndex < gridResolution; yIndex += 1) {
      const samplePoint = [
        minX + xIndex * stepX,
        minY + yIndex * stepY,
      ]

      if (
        isPointInPolygon(
          samplePoint,
          polygonA.geometry.coordinates
        )
      ) {
        pointsInA += 1

        if (isPointInPolygon(samplePoint, coordinatesB)) {
          pointsInBoth += 1
        }
      }
    }
  }

  return pointsInA === 0 ? 0 : pointsInBoth / pointsInA
}

function SelectedRegionCard({
  selectedRegion,
  fallbackProvinceLabel,
  onClose,
}) {
  if (!selectedRegion) {
    return null
  }

  const hasLandArea = Number.isFinite(selectedRegion.landArea)

  return (
    <section
      className="selectedRegionCard"
      aria-live="polite"
      aria-label="Selected region details"
    >
      <div className="selectedRegionHeader">
        <h2>{selectedRegion.name || 'Unknown region'}</h2>

        <button
          type="button"
          aria-label="Close region details"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <dl>
        <div>
          <dt>Province</dt>
          <dd>
            {selectedRegion.provinceLabel ||
              fallbackProvinceLabel ||
              'Unavailable'}
          </dd>
        </div>

        <div>
          <dt>Geography</dt>
          <dd>{selectedRegion.geographyLabel || 'Unavailable'}</dd>
        </div>

        <div>
          <dt>Land area</dt>
          <dd>
            {hasLandArea
              ? `${selectedRegion.landArea.toFixed(2)} km²`
              : 'Unavailable'}
          </dd>
        </div>

        <div>
          <dt>Classification</dt>
          <dd>{selectedRegion.classification || 'Unavailable'}</dd>
        </div>

        <div>
          <dt>Type</dt>
          <dd>{selectedRegion.regionType || 'Unavailable'}</dd>
        </div>

        <div>
          <dt>DGUID</dt>
          <dd>{selectedRegion.dguid || 'Unavailable'}</dd>
        </div>
      </dl>
    </section>
  )
}

function ViewProposalPage() {
  const { proposalId } = useParams()
  const mapComponentRef = useRef(null)

  const proposal = proposals.find(
    (item) => String(item.id) === String(proposalId)
  )

  const [liveComments, setLiveComments] = useState([])
  const [newCommentText, setNewCommentText] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [deletingCommentId, setDeletingCommentId] = useState(null)
  const [commentNotice, setCommentNotice] = useState(null)
  const [accessToken, setAccessToken] = useState(readAccessToken)
  const [likes, setLikes] = useState(proposal?.postLikes ?? 0)

  const [isLineStringClosed, setIsLineStringClosed] = useState(false)
  const [validationError, setValidationError] = useState(null)

  const [province, setProvince] = useState('on')
  const [boundaryLayer, setBoundaryLayer] = useState('none')
  const [selectedRegion, setSelectedRegion] = useState(null)

  const selectedProvinceData = PROVINCE_MAP_DATA[province]

  const currentUserId = getUserIdFromAccessToken(accessToken)
  const isLoggedIn = Boolean(accessToken && currentUserId)

  useEffect(() => {
    setLikes(proposal?.postLikes ?? 0)
  }, [proposal])

  useEffect(() => {
    function synchronizeAuthentication() {
      setAccessToken(readAccessToken())
    }

    window.addEventListener('storage', synchronizeAuthentication)
    window.addEventListener('auth-changed', synchronizeAuthentication)
    window.addEventListener('focus', synchronizeAuthentication)

    synchronizeAuthentication()

    return () => {
      window.removeEventListener('storage', synchronizeAuthentication)
      window.removeEventListener('auth-changed', synchronizeAuthentication)
      window.removeEventListener('focus', synchronizeAuthentication)
    }
  }, [])

  useEffect(() => {
    if (!isLoggedIn) {
      setNewCommentText('')
      setCommentNotice(null)
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (!isLoggedIn || !proposalId) {
      return
    }

    const draftKey = `comment-draft-${proposalId}`
    const savedDraft = sessionStorage.getItem(draftKey)

    if (savedDraft) {
      setNewCommentText(savedDraft)
      sessionStorage.removeItem(draftKey)
    }
  }, [isLoggedIn, proposalId])

  useEffect(() => {
    if (!proposalId) {
      return undefined
    }

    const controller = new AbortController()

    fetch(`/api/comments?proposalId=${encodeURIComponent(proposalId)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `Unable to load comments (${response.status}).`
          )
        }

        return response.json()
      })
      .then((commentsResponse) => {
        if (Array.isArray(commentsResponse)) {
          setLiveComments(commentsResponse)
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('[COMMENTS GET ERROR]', error)
        }
      })

    const socket = io(SOCKET_URL)

    socket.on('comment_approved', (approvedComment) => {
      if (
        String(approvedComment.proposalId) !== String(proposalId)
      ) {
        return
      }

      setLiveComments((currentComments) => {
        const alreadyExists = currentComments.some(
          (comment) =>
            String(comment.id) === String(approvedComment.id)
        )

        return alreadyExists
          ? currentComments
          : [...currentComments, approvedComment]
      })
    })

    socket.on('comment_rejected', (data) => {
      if (
        data?.proposalId &&
        String(data.proposalId) !== String(proposalId)
      ) {
        return
      }

      setCommentNotice({
        type: 'error',
        text: data?.reason
          ? `Your comment was not approved: ${data.reason}`
          : 'Your comment was not approved.',
      })
    })

    return () => {
      controller.abort()
      socket.disconnect()
    }
  }, [proposalId])

  function redirectToLogin(reason) {
    const returnTo =
      `${window.location.pathname}${window.location.search}`

    const loginUrl = new URL(LOGIN_PATH, window.location.origin)

    loginUrl.searchParams.set('returnTo', returnTo)

    if (reason) {
      loginUrl.searchParams.set('reason', reason)
    }

    window.location.assign(loginUrl.toString())
  }

  async function handleCommentSubmit(event) {
    event.preventDefault()

    const content = newCommentText.trim()

    if (!content || isSubmittingComment) {
      return
    }

    if (!accessToken) {
      redirectToLogin('authentication-required')
      return
    }

    setIsSubmittingComment(true)
    setCommentNotice(null)

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },

        body: JSON.stringify({
          content,
          proposalId,
        }),
      })

      let responseBody = null

      try {
        responseBody = await response.json()
      } catch {
        responseBody = null
      }

      if (response.status === 401) {
        sessionStorage.setItem(
          `comment-draft-${proposalId}`,
          content
        )

        clearAccessToken()
        setAccessToken(null)

        window.dispatchEvent(new Event('auth-changed'))
        redirectToLogin('session-expired')

        return
      }

      if (!response.ok) {
        throw new Error(
          responseBody?.error ||
            `Unable to submit the comment (${response.status}).`
        )
      }

      setNewCommentText('')
      sessionStorage.removeItem(`comment-draft-${proposalId}`)

      setCommentNotice({
        type: 'success',
        text:
          responseBody?.message ||
          'Your comment was submitted for review.',
      })
    } catch (error) {
      console.error('[COMMENTS POST ERROR]', error)

      setCommentNotice({
        type: 'error',
        text:
          error.message ||
          'Unable to submit your comment.',
      })
    } finally {
      setIsSubmittingComment(false)
    }
  }

  async function handleDeleteComment(commentId) {
    if (!accessToken || !currentUserId || deletingCommentId) {
      return
    }

    const shouldDelete = window.confirm(
      'Are you sure you want to delete this comment?'
    )

    if (!shouldDelete) {
      return
    }

    setDeletingCommentId(commentId)
    setCommentNotice(null)

    try {
      const response = await fetch(
        `/api/comments/${encodeURIComponent(commentId)}`,
        {
          method: 'DELETE',

          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (response.status === 401) {
        clearAccessToken()
        setAccessToken(null)

        window.dispatchEvent(new Event('auth-changed'))
        redirectToLogin('session-expired')

        return
      }

      if (!response.ok) {
        let responseBody = null

        try {
          responseBody = await response.json()
        } catch {
          responseBody = null
        }

        throw new Error(
          responseBody?.error ||
            `Unable to delete the comment (${response.status}).`
        )
      }

      setLiveComments((currentComments) =>
        currentComments.filter(
          (comment) => String(comment.id) !== String(commentId)
        )
      )

      setCommentNotice({
        type: 'success',
        text: 'Your comment was deleted.',
      })
    } catch (error) {
      console.error('[COMMENTS DELETE ERROR]', error)

      setCommentNotice({
        type: 'error',
        text:
          error.message ||
          'Unable to delete the comment.',
      })
    } finally {
      setDeletingCommentId(null)
    }
  }

  function incrementLikes() {
    setLikes((currentLikes) => currentLikes + 1)
  }

  function handleDrawChange(geoJsonData) {
    let foundClosedLineString = false
    let hasStrayLines = false
    let hasNestedPolygon = false

    if (geoJsonData?.features) {
      const polygons = []

      for (const feature of geoJsonData.features) {
        if (feature.geometry.type === 'LineString') {
          hasStrayLines = true

          const coordinates = feature.geometry.coordinates

          if (coordinates.length >= 3) {
            const firstPoint = coordinates[0]
            const lastPoint = coordinates[coordinates.length - 1]

            if (
              getDistanceInMeters(firstPoint, lastPoint) <=
              DISTANCE_THRESHOLD
            ) {
              foundClosedLineString = true
            }
          }
        } else if (feature.geometry.type === 'Polygon') {
          polygons.push(feature)
        }
      }

      const overlapThreshold = 0.25

      for (let i = 0; i < polygons.length; i += 1) {
        for (let j = 0; j < polygons.length; j += 1) {
          if (i === j) continue

          const overlapPercentage =
            getPolygonAreaOverlapPercentage(
              polygons[i],
              polygons[j]
            )

          if (overlapPercentage > overlapThreshold) {
            hasNestedPolygon = true
            break
          }
        }

        if (hasNestedPolygon) break
      }
    }

    setIsLineStringClosed(foundClosedLineString)

    if (hasStrayLines) {
      setValidationError(
        'Invalid: Stray lines detected. All census boundaries must be closed polygons.'
      )
    } else if (hasNestedPolygon) {
      setValidationError(
        'Invalid: Overlapping boundary detected. Census tracts cannot overlap by more than 25%.'
      )
    } else {
      setValidationError(null)
    }
  }

  function handleSimplifyClick() {
    mapComponentRef.current?.simplifyDrawing()
  }

  function handleProvinceChange(event) {
    const nextProvince = event.target.value

    setProvince(nextProvince)
    setBoundaryLayer('none')
    setSelectedRegion(null)

    mapComponentRef.current?.clearSelectedRegion?.()
  }

  function handleBoundaryLayerChange(event) {
    setBoundaryLayer(event.target.value)
    setSelectedRegion(null)

    mapComponentRef.current?.clearSelectedRegion?.()
  }

  function handleCloseSelectedRegion() {
    setSelectedRegion(null)

    mapComponentRef.current?.clearSelectedRegion?.()
  }

  if (!proposal) {
    return (
      <main className="proposalNotFound">
        <p>Error: Proposal not found.</p>
      </main>
    )
  }

  return (
    <main className="proposalPage">
      <header className="proposalPageHeader">
        <div className="horizontalProposalHeaderBox">
          <span className="proposalHeaderText">
            ID: {proposal.id}
          </span>

          <div className="ratingBox">
            <button
              className="prettierButton"
              onClick={incrementLikes}
              type="button"
              aria-label="Like this proposal"
            >
              <img
                className="iconBox"
                src={thumbsUpIcon}
                alt=""
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
            Comments
          </span>

          <div className="commentCountBox">
            <img
              className="iconBox"
              src={commentIcon}
              alt=""
            />

            <span className="smallerCommentHeaderText">
              {liveComments.length}
            </span>
          </div>
        </div>
      </header>

      <div className="proposalContentBox">
        <section
          className="mapBox"
          aria-label="Proposal map"
        >
          <button
            className="simplifyButton"
            onClick={handleSimplifyClick}
            type="button"
          >
            Simplify
          </button>

          {validationError ? (
            <div
              className="validationBanner invalid"
              role="alert"
            >
              {validationError}
            </div>
          ) : isLineStringClosed ? (
            <div
              className="validationBanner warning"
              role="status"
            >
              Closed polygon detected! Click
              &quot;Simplify&quot; to fuse coordinates and
              save memory.
            </div>
          ) : (
            <div
              className="validationBanner valid"
              role="status"
            >
              ✓ Census Boundaries Valid
            </div>
          )}

          <div className="mapLayerControls">
            <div className="mapLayerControl">
              <label htmlFor="province-select">
                Province
              </label>

              <select
                id="province-select"
                value={province}
                onChange={handleProvinceChange}
              >
                {Object.entries(PROVINCE_MAP_DATA).map(
                  ([provinceCode, provinceData]) => (
                    <option
                      key={provinceCode}
                      value={provinceCode}
                    >
                      {provinceData.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="mapLayerControl">
              <label htmlFor="boundary-layer-select">
                Statistical layer
              </label>

              <select
                id="boundary-layer-select"
                value={boundaryLayer}
                onChange={handleBoundaryLayerChange}
              >
                <option value="none">
                  None
                </option>

                <option value="populationCentres">
                  Population centres
                </option>

                {selectedProvinceData?.designatedPlaces && (
                  <option value="designatedPlaces">
                    Designated places
                  </option>
                )}
              </select>
            </div>
          </div>

          <Map
            ref={mapComponentRef}
            mode="objection"
            onDrawChange={handleDrawChange}
            province={province}
            boundaryLayer={boundaryLayer}
            onRegionSelect={setSelectedRegion}
          />

          <SelectedRegionCard
            selectedRegion={selectedRegion}
            fallbackProvinceLabel={selectedProvinceData?.label}
            onClose={handleCloseSelectedRegion}
          />
        </section>

        <aside
          className="commentBox"
          aria-label="Proposal comments"
        >
          <div className="addCommentSection">
            {isLoggedIn ? (
              <form
                className="commentForm"
                onSubmit={handleCommentSubmit}
              >
                <label
                  className="commentFormLabel"
                  htmlFor="new-comment"
                >
                  Add a comment
                </label>

                <textarea
                  id="new-comment"
                  className="commentTextArea"
                  value={newCommentText}
                  onChange={(event) => {
                    setNewCommentText(event.target.value)
                    setCommentNotice(null)
                  }}
                  placeholder="Write your objection or comment here..."
                  rows={4}
                  maxLength={2000}
                  required
                />

                <div className="commentFormFooter">
                  <span className="commentCharacterCount">
                    {newCommentText.length}/2000
                  </span>

                  <button
                    className="commentSubmitButton"
                    type="submit"
                    disabled={
                      isSubmittingComment ||
                      !newCommentText.trim()
                    }
                  >
                    {isSubmittingComment
                      ? 'Submitting...'
                      : 'Post Comment'}
                  </button>
                </div>

                {commentNotice && (
                  <p
                    className={`commentNotice ${commentNotice.type}`}
                    role={
                      commentNotice.type === 'error'
                        ? 'alert'
                        : 'status'
                    }
                  >
                    {commentNotice.text}
                  </p>
                )}
              </form>
            ) : (
              <section
                className="commentLoginPrompt"
                aria-labelledby="comment-login-heading"
              >
                <h2 id="comment-login-heading">
                  Join the discussion
                </h2>

                <p>
                  You must be logged in to post a comment.
                  Approved comments remain visible to everyone.
                </p>

                <button
                  className="loginToCommentButton"
                  type="button"
                  onClick={() =>
                    redirectToLogin('authentication-required')
                  }
                >
                  Log in to Comment
                </button>
              </section>
            )}
          </div>

          <section
            className="proposalCommentList"
            aria-live="polite"
          >
            {liveComments.length === 0 ? (
              <p className="emptyCommentMessage">
                No approved comments yet.
              </p>
            ) : (
              liveComments.map((comment) => {
                const belongsToCurrentUser =
                  currentUserId &&
                  String(comment.userId) === String(currentUserId)

                return (
                  <article
                    className="proposalCommentItem"
                    key={comment.id}
                  >
                    <ProposalComment
                      commentId={comment.id}
                      relatedRidings={comment.relatedRidings || []}
                      postUser={comment.authorName || 'Anonymous'}
                      postDate={
                        comment.createdAt
                          ? new Date(
                              comment.createdAt
                            ).toLocaleDateString()
                          : ''
                      }
                      postComment={comment.content}
                      postLikes={comment.upvotes ?? 0}
                      postDownvotes={comment.downvotes ?? 0}
                      isLoggedIn={isLoggedIn}
                    />

                    {belongsToCurrentUser && (
                      <div className="commentOwnerActions">
                        <button
                          className="deleteCommentButton"
                          type="button"
                          disabled={
                            String(deletingCommentId) ===
                            String(comment.id)
                          }
                          onClick={() =>
                            handleDeleteComment(comment.id)
                          }
                          aria-label="Delete your comment"
                        >
                          {String(deletingCommentId) ===
                          String(comment.id)
                            ? 'Deleting...'
                            : 'Delete'}
                        </button>
                      </div>
                    )}
                  </article>
                )
              })
            )}
          </section>
        </aside>
      </div>
    </main>
  )
}

export default ViewProposalPage