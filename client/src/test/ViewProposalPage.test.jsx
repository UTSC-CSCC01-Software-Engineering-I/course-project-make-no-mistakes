import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ViewProposalPage from "../pages/ViewProposalPage";
import { fetchProposal } from "../utils/proposalsApi";

const MOCK_PROPOSAL_ID = "0f8e2c34-9d1a-4b7e-8f2a-6c5d4e3b2a10";

const fakeProposal = {
  id: MOCK_PROPOSAL_ID,
  user_id: "a1b2c3d4-1111-2222-3333-444455556666",
  submission_type: "counter_proposal",
  body: "Counter proposal rationale.",
  created_at: "2026-07-01T12:00:00.000Z",
};

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
    proposalId: MOCK_PROPOSAL_ID,
  }),
}))

jest.mock("../utils/proposalsApi", () => ({
  __esModule: true,
  fetchProposal: jest.fn(),
}));

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

jest.mock("../components/ProposalComment", () => ({
  __esModule: true,
  default: ({ postComment }) => <div>{postComment}</div>,
}));

function makeApiError(status) {
  const error = new Error("Request failed.");
  error.status = status;
  return error;
}

// AI-assisted (claude)
function mockCommentsResponse(comments = []) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => comments,
  });
}

// AI-assisted (claude)
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  mockCommentsResponse([]);
});

afterAll(() => {
  delete global.fetch
})

// AI-assisted (claude)
test("shows loading state while fetching", async () => {
  fetchProposal.mockReturnValue(new Promise(() => {}));

  render(<ViewProposalPage />);

  await waitFor(() =>
    expect(screen.getByText("Loading proposal…")).toBeInTheDocument()
  );

  expect(screen.queryByText(`ID: ${MOCK_PROPOSAL_ID}`)).not.toBeInTheDocument();
});

// AI-assisted (claude)
test("renders proposal header after successful fetch", async () => {
  fetchProposal.mockResolvedValue(fakeProposal);

  render(<ViewProposalPage />);

  expect(await screen.findByText(`ID: ${MOCK_PROPOSAL_ID}`)).toBeInTheDocument();
  expect(screen.getByText("User a1b2c3d4")).toBeInTheDocument();
  expect(
    screen.getByText(new Date(fakeProposal.created_at).toLocaleDateString())
  ).toBeInTheDocument();

  expect(screen.getByText("0 likes")).toBeInTheDocument();
});

test("shows not-found message on 404", async () => {
  fetchProposal.mockRejectedValue(makeApiError(404));

  render(<ViewProposalPage />);

  expect(
    await screen.findByText("Error: Proposal not found.")
  ).toBeInTheDocument();
});

test("shows not-found message on server error", async () => {
  fetchProposal.mockRejectedValue(makeApiError(500));

  render(<ViewProposalPage />);

  expect(
    await screen.findByText("Error: Proposal not found.")
  ).toBeInTheDocument();
});

// Checking incrementation for the like button on the proposal post
test("increments likes on click", async () => {
  const user = userEvent.setup();
  fetchProposal.mockResolvedValue(fakeProposal);

  render(<ViewProposalPage />);

  await screen.findByText("0 likes");

  await user.click(
    screen.getByRole("button", { name: "Like this proposal" })
  );

  expect(screen.getByText("1 likes")).toBeInTheDocument();
});

test("shows login prompt when logged out", async () => {
  fetchProposal.mockResolvedValue(fakeProposal);

  render(<ViewProposalPage />);

  expect(await screen.findByText("Join the discussion")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Log in to Comment" })
  ).toBeInTheDocument();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});

// AI-assisted (claude)
test("renders comments from the API", async () => {
  fetchProposal.mockResolvedValue(fakeProposal);
  mockCommentsResponse([
    { id: 1, content: "This is a great addition!" },
    { id: 2, content: "Maybe we should add a border here..." },
  ]);

  render(<ViewProposalPage />);

  expect(
    await screen.findByText("This is a great addition!")
  ).toBeInTheDocument();
  expect(
    screen.getByText("Maybe we should add a border here...")
  ).toBeInTheDocument();
  expect(screen.getByText("2")).toBeInTheDocument();
});

test("shows empty message when there are no comments", async () => {
  fetchProposal.mockResolvedValue(fakeProposal);

  render(<ViewProposalPage />);

  expect(
    await screen.findByText("No approved comments yet.")
  ).toBeInTheDocument();
});

test('Displays selected region details', async () => {
  const user = userEvent.setup()
  fetchProposal.mockResolvedValue(fakeProposal)

  render(<ViewProposalPage />)

  await screen.findByText(`ID: ${MOCK_PROPOSAL_ID}`)

  await user.click(
    screen.getByRole('button', {
      name: 'Select mock region',
    })
  )

  expect(
    screen.getByRole('heading', {
      name: 'Toronto',
    })
  ).toBeInTheDocument()

  const selectedRegionCard =
    screen.getByRole('region', {
      name: 'Selected region details',
    })

  expect(
    within(selectedRegionCard).getByText('Ontario', {
      exact: true,
    })
  ).toBeInTheDocument()

  expect(
    screen.getByText('123.45 km²')
  ).toBeInTheDocument()

  expect(
    screen.getByText('mock-dguid')
  ).toBeInTheDocument()
})
