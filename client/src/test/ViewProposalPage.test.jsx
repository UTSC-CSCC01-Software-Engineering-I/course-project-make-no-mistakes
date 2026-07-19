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

/*
 * Jest does not understand Vite's import.meta.env syntax.
 * Mock mapData so the real mapData.js file is not evaluated.
 */
jest.mock('../config/mapData', () => ({
  __esModule: true,

  PROVINCE_MAP_DATA: {
    on: {
      label: 'Ontario',
      center: [-79.3832, 43.6532],
      zoom: 6,

      populationCentres:
        '/mock/on/on_population_centres.geojson',

      designatedPlaces:
        '/mock/on/on_designated_places.geojson',
    },

    pe: {
      label: 'Prince Edward Island',
      center: [-63.2, 46.4],
      zoom: 8,

      populationCentres:
        '/mock/pe/pe_population_centres.geojson',

      designatedPlaces: null,
    },
  },
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

/*
 * Mock MapLibre and TerraDraw behavior.
 *
 * forwardRef and useImperativeHandle are needed because
 * ViewProposalPage uses mapComponentRef.current.
 */
jest.mock('../components/Map', () => {
  const React = require('react')

  const MockMap = React.forwardRef(function MockMap(
    {
      mode,
      province,
      boundaryLayer,
      onRegionSelect,
    },
    ref
  ) {
    React.useImperativeHandle(ref, () => ({
      simplifyDrawing: jest.fn(),
      clearSelectedRegion: jest.fn(),
    }))

    return (
      <div
        data-testid="map"
        data-mode={mode}
        data-province={province}
        data-boundary-layer={boundaryLayer}
      >
        <span>Map</span>

        <button
          type="button"
          onClick={() => {
            onRegionSelect?.({
              id: 'mock-region-id',
              dguid: 'mock-dguid',
              name: 'Toronto',
              province: 'on',
              provinceLabel: 'Ontario',
              geographyType: 'populationCentres',
              geographyLabel: 'Population centre',
              classification: 'Large urban population centre',
              regionType: 'Population centre',
              landArea: 123.45,
              properties: {},
            })
          }}
        >
          Select mock region
        </button>
      </div>
    )
  })

  return {
    __esModule: true,
    default: MockMap,
  }
})

/*
 * This require must remain after all jest.mock calls.
 */
const ViewProposalPage =
  require('../pages/ViewProposalPage').default

function createJsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

function toApiComment(comment, index = 0) {
  return {
    id:
      comment.id ??
      comment.commentId ??
      `comment-${index + 1}`,

    proposalId: comment.proposalId,

    userId:
      comment.userId ??
      `user-${index + 1}`,

    authorName:
      comment.authorName ??
      comment.postUser ??
      'Unknown',

    createdAt:
      comment.createdAt ??
      comment.postDate ??
      null,

    content:
      comment.content ??
      comment.postComment ??
      '',

    upvotes:
      comment.upvotes ??
      comment.postLikes ??
      0,

    downvotes:
      comment.downvotes ??
      comment.postDownvotes ??
      0,

    relatedRidings:
      comment.relatedRidings ??
      [],

    status:
      comment.status ??
      'approved',
  }
}

function renderViewProposalPage(proposalId) {
  mockProposalId = String(proposalId)

  return render(
    <ViewProposalPage />
  )
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()

  global.fetch = jest.fn(
    async (input, options = {}) => {
      const url =
        typeof input === 'string'
          ? input
          : input.url

      const parsedUrl = new URL(
        url,
        'http://localhost'
      )

      const method = (
        options.method ||
        'GET'
      ).toUpperCase()

      if (
        method === 'GET' &&
        parsedUrl.pathname ===
          '/api/comments'
      ) {
        const proposalId =
          parsedUrl.searchParams.get(
            'proposalId'
          )

        const matchingComments =
          comments
            .filter(
              (comment) =>
                String(
                  comment.proposalId
                ) ===
                String(proposalId)
            )
            .map(toApiComment)

        return createJsonResponse(
          matchingComments
        )
      }

      if (
        method === 'PATCH' &&
        parsedUrl.pathname.startsWith(
          '/api/comments/'
        ) &&
        parsedUrl.pathname.endsWith(
          '/vote'
        )
      ) {
        const pathParts =
          parsedUrl.pathname.split('/')

        const commentId =
          pathParts[
            pathParts.length - 2
          ]

        const apiComments =
          comments.map(toApiComment)

        const originalComment =
          apiComments.find(
            (comment) =>
              String(comment.id) ===
              String(commentId)
          )

        const requestBody =
          options.body
            ? JSON.parse(options.body)
            : {}

        const isDownvote =
          requestBody.action ===
          'downvote'

        return createJsonResponse({
          ...originalComment,

          id:
            originalComment?.id ??
            commentId,

          upvotes:
            (originalComment?.upvotes ??
              0) +
            (isDownvote ? 0 : 1),

          downvotes:
            (originalComment
              ?.downvotes ?? 0) +
            (isDownvote ? 1 : 0),
        })
      }

      return createJsonResponse({})
    }
  )
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
    renderViewProposalPage(
      'not-a-real-id'
    )

    expect(
      await screen.findByText(
        'Error: Proposal not found.'
      )
    ).toBeInTheDocument()
  })

  test('Increment Likes (Post)', async () => {
    const user = userEvent.setup()
    const proposal = proposals[0]

    renderViewProposalPage(
      proposal.id
    )

    expect(
      await screen.findByText(
        `${proposal.postLikes} likes`
      )
    ).toBeInTheDocument()

    const proposalLikeButton =
      screen.getByRole('button', {
        name: 'Like this proposal',
      })

    await user.click(
      proposalLikeButton
    )

    expect(
      await screen.findByText(
        `${proposal.postLikes + 1} likes`
      )
    ).toBeInTheDocument()
  })

  test('Increment Likes (Comment)', async () => {
    const user = userEvent.setup()
    const proposal = proposals[0]

    localStorage.setItem(
      'sb_token',
      TEST_ACCESS_TOKEN
    )

    const firstCommentIndex =
      comments.findIndex(
        (comment) =>
          String(
            comment.proposalId
          ) ===
          String(proposal.id)
      )

    expect(
      firstCommentIndex
    ).toBeGreaterThanOrEqual(0)

    const firstComment =
      toApiComment(
        comments[firstCommentIndex],
        firstCommentIndex
      )

    renderViewProposalPage(
      proposal.id
    )

    const commentText =
      await screen.findByText(
        firstComment.content
      )

    const commentArticle =
      commentText.closest(
        'article.proposalComment'
      )

    expect(
      commentArticle
    ).toBeInTheDocument()

    expect(
      within(
        commentArticle
      ).getByText(
        String(
          firstComment.upvotes
        ),
        {
          exact: true,
        }
      )
    ).toBeInTheDocument()

    const commentUpvoteButton =
      within(
        commentArticle
      ).getByRole('button', {
        name: 'Upvote comment',
      })

    expect(
      commentUpvoteButton
    ).toBeEnabled()

    await user.click(
      commentUpvoteButton
    )

    await waitFor(() => {
      expect(
        within(
          commentArticle
        ).getByText(
          String(
            firstComment.upvotes +
              1
          ),
          {
            exact: true,
          }
        )
      ).toBeInTheDocument()
    })
  })

  test('Displays selected region details', async () => {
    const user = userEvent.setup()
    const proposal = proposals[0]

    renderViewProposalPage(
      proposal.id
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Select mock region',
      })
    )

    expect(
      screen.getByRole(
        'heading',
        {
          name: 'Toronto',
        }
      )
    ).toBeInTheDocument()

    const selectedRegionCard =
      screen.getByRole('region', {
        name: 'Selected region details',
      })

    expect(
      within(selectedRegionCard).getByText(
        'Ontario',
        {
          exact: true,
        }
      )
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        '123.45 km²'
      )
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'mock-dguid'
      )
    ).toBeInTheDocument()
  })
})