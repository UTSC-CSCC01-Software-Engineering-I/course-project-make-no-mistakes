import { useEffect, useState } from 'react'

import thumbsUpIcon from '../assets/thumbsUp.png'
import './ProposalComment.css'

const AUTH_TOKEN_STORAGE_KEY = 'sb_token'
const LEGACY_AUTH_TOKEN_STORAGE_KEY = 'token'

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

function parseArrayValue(value) {
  if (Array.isArray(value)) {
    return value
  }

  if (value == null || value === '') {
    return []
  }

  if (typeof value !== 'string') {
    return []
  }

  try {
    const parsed = JSON.parse(value)

    return Array.isArray(parsed)
      ? parsed
      : []
  } catch {
    return [value]
  }
}

function normalizeRelatedRidings(value) {
  return [
    ...new Set(
      parseArrayValue(value)
        .map((riding) => {
          if (typeof riding === 'string') {
            return riding.trim()
          }

          return String(
            riding?.federalDistrictName ??
              riding?.federal_district_name ??
              riding?.name ??
              ''
          ).trim()
        })
        .filter(Boolean)
    ),
  ]
}

function ProposalComment({
  commentId,
  relatedRidings = [],
  postUser,
  postDate,
  postComment,
  postLikes = 0,
  postDownvotes = 0,
  isLoggedIn = false,
}) {
  const [likes, setLikes] = useState(postLikes)
  const [downvotes, setDownvotes] = useState(postDownvotes)
  const [pendingVote, setPendingVote] = useState(null)

  const ridingNames =
    normalizeRelatedRidings(
      relatedRidings
    )

  useEffect(() => {
    setLikes(postLikes)
  }, [postLikes])

  useEffect(() => {
    setDownvotes(postDownvotes)
  }, [postDownvotes])

  async function handleVote(action) {
    const token = readAccessToken()

    if (!commentId || !isLoggedIn || !token || pendingVote) {
      return
    }

    setPendingVote(action)

    try {
      const response = await fetch(
        `/api/comments/${encodeURIComponent(commentId)}/vote`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action }),
        }
      )

      if (response.status === 401) {
        clearAccessToken()
        window.dispatchEvent(new Event('auth-changed'))
        return
      }

      const responseBody = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          responseBody?.error || `Voting failed (${response.status}).`
        )
      }

      setLikes(Number(responseBody?.upvotes) || 0)
      setDownvotes(Number(responseBody?.downvotes) || 0)
    } catch (error) {
      console.error('[COMMENT VOTE ERROR]', error)
    } finally {
      setPendingVote(null)
    }
  }

  const votingDisabled = !isLoggedIn || Boolean(pendingVote)
  const voteTitle = isLoggedIn ? undefined : 'Log in to vote'

  return (
    <article className="proposalComment">
      <header className="commentHeader">
        <span className="commentHeaderText">{postUser}</span>
        <time className="commentHeaderText">{postDate}</time>
      </header>

      {ridingNames.length > 0 && (
        <section
          className="commentRidingHeaders"
          aria-label="Federal ridings related to this objection"
        >
          {ridingNames.map((riding) => (
            <div
              className="commentSubHeader"
              key={riding}
            >
              <span className="commentSubHeaderText">
                Objection to: {riding}
              </span>
            </div>
          ))}
        </section>
      )}

      <section className="commentBody">
        <p className="commentBodyText">{postComment}</p>
      </section>

      <footer className="commentFooter">
        <div className="commentVoteControls">
          <span className="voteCount" aria-label={`${likes} upvotes`}>
            {likes}
          </span>

          <button
            className="likeButtonWrapper"
            type="button"
            disabled={votingDisabled}
            onClick={() => handleVote('upvote')}
            aria-label={isLoggedIn ? 'Upvote comment' : 'Log in to upvote'}
            title={voteTitle}
          >
            <img
              className="likeButton"
              src={thumbsUpIcon}
              alt=""
              aria-hidden="true"
            />
          </button>

          <span className="voteCount" aria-label={`${downvotes} downvotes`}>
            {downvotes}
          </span>

          <button
            className="likeButtonWrapper"
            type="button"
            disabled={votingDisabled}
            onClick={() => handleVote('downvote')}
            aria-label={isLoggedIn ? 'Downvote comment' : 'Log in to downvote'}
            title={voteTitle}
          >
            <img
              className="likeButton downvoteIcon"
              src={thumbsUpIcon}
              alt=""
              aria-hidden="true"
            />
          </button>
        </div>
      </footer>
    </article>
  )
}

export default ProposalComment