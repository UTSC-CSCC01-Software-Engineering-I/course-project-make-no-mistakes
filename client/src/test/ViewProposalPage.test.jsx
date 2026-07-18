import {
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import proposals from '../data/proposals.json'
import comments from '../data/comments.json'

let mockProposalId = String(proposals[0].id)

// The payload contains: { "sub": "test-user" }
const TEST_ACCESS_TOKEN =
  'test.eyJzdWIiOiJ0ZXN0LXVzZXIifQ.signature'

jest.mock('../config/api', () => ({
  __esModule: true,
  SOCKET_URL: 'http://localhost:8080',
}))

jest.mock('socket.io-client', () => {
  const io = jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    close: jest.fn(),
  }))

  return {
    __esModule: true,
    io,
    default: io,
  }
})

jest.mock('react-router', () => ({
  __esModule: true,
  useParams: () => ({
    proposalId: mockProposalId,
  }),
}))

jest.mock('../components/Map', () => ({
  __esModule: true,
  default: ({ mode }) => (
    <div data-testid="map" data-mode={mode}>
      Map
    </div>
  ),
}))

const ViewProposalPage = require('../pages/ViewProposalPage').default

function createJsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

function toApiComment(comment, index = 0) {
  return {
    id: comment.id ?? comment.commentId ?? `comment-${index + 1}`,
    proposalId: comment.proposalId,
    userId: comment.userId ?? `user-${index + 1}`,
    authorName:
      comment.authorName ?? comment.postUser ?? 'Unknown',
    createdAt: comment.createdAt ?? comment.postDate ?? null,
    content: comment.content ?? comment.postComment ?? '',
    upvotes: comment.upvotes ?? comment.postLikes ?? 0,
    downvotes:
      comment.downvotes ?? comment.postDownvotes ?? 0,
    relatedRidings: comment.relatedRidings ?? [],
    status: comment.status ?? 'approved',
  }
}

function renderViewProposalPage(proposalId) {
  mockProposalId = String(proposalId)
  return render(<ViewProposalPage />)
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()

  global.fetch = jest.fn(async (input, options = {}) => {
    const url = typeof input === 'string' ? input : input.url
    const parsedUrl = new URL(url, 'http://localhost')
    const method = (options.method || 'GET').toUpperCase()

    if (
      method === 'GET' &&
      parsedUrl.pathname === '/api/comments'
    ) {
      const proposalId = parsedUrl.searchParams.get('proposalId')

      const matchingComments = comments
        .filter(
          (comment) =>
            String(comment.proposalId) === String(proposalId)
        )
        .map(toApiComment)

      return createJsonResponse(matchingComments)
    }

    if (
      method === 'PATCH' &&
      parsedUrl.pathname.startsWith('/api/comments/') &&
      parsedUrl.pathname.endsWith('/vote')
    ) {
      const pathParts = parsedUrl.pathname.split('/')
      const commentId = pathParts[pathParts.length - 2]

      const apiComments = comments.map(toApiComment)
      const originalComment = apiComments.find(
        (comment) => String(comment.id) === String(commentId)
      )

      const requestBody = options.body
        ? JSON.parse(options.body)
        : {}

      const isDownvote = requestBody.action === 'downvote'

      return createJsonResponse({
        ...originalComment,
        id: originalComment?.id ?? commentId,
        upvotes:
          (originalComment?.upvotes ?? 0) +
          (isDownvote ? 0 : 1),
        downvotes:
          (originalComment?.downvotes ?? 0) +
          (isDownvote ? 1 : 0),
      })
    }

    return createJsonResponse({})
  })
})

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  jest.clearAllMocks()
})

afterAll(() => {
  delete global.fetch
})

describe('ViewProposalPage', () => {
  test('Proposal DNE', async () => {
    renderViewProposalPage('not-a-real-id')

    expect(
      await screen.findByText('Error: Proposal not found.')
    ).toBeInTheDocument()
  })

  test('Increment Likes (Post)', async () => {
    const user = userEvent.setup()
    const proposal = proposals[0]

    renderViewProposalPage(proposal.id)

    expect(
      await screen.findByText(`${proposal.postLikes} likes`)
    ).toBeInTheDocument()

    const proposalLikeButton = screen.getByRole('button', {
      name: 'Like this proposal',
    })

    await user.click(proposalLikeButton)

    expect(
      await screen.findByText(`${proposal.postLikes + 1} likes`)
    ).toBeInTheDocument()
  })

  test('Increment Likes (Comment)', async () => {
    const user = userEvent.setup()
    const proposal = proposals[0]

    localStorage.setItem('sb_token', TEST_ACCESS_TOKEN)

    const firstCommentIndex = comments.findIndex(
      (comment) =>
        String(comment.proposalId) === String(proposal.id)
    )

    expect(firstCommentIndex).toBeGreaterThanOrEqual(0)

    const firstComment = toApiComment(
      comments[firstCommentIndex],
      firstCommentIndex
    )

    renderViewProposalPage(proposal.id)

    const commentText = await screen.findByText(
      firstComment.content
    )
    const commentArticle = commentText.closest(
      'article.proposalComment'
    )

    expect(commentArticle).toBeInTheDocument()

    expect(
      within(commentArticle).getByText(
        String(firstComment.upvotes),
        { exact: true }
      )
    ).toBeInTheDocument()

    const commentUpvoteButton = within(
      commentArticle
    ).getByRole('button', {
      name: 'Upvote comment',
    })

    expect(commentUpvoteButton).toBeEnabled()

    await user.click(commentUpvoteButton)

    await waitFor(() => {
      expect(
        within(commentArticle).getByText(
          String(firstComment.upvotes + 1),
          { exact: true }
        )
      ).toBeInTheDocument()
    })
  })
})