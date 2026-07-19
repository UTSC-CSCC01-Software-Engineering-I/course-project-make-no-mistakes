import { render, screen } from "@testing-library/react";
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

jest.mock("react-router", () => ({
  __esModule: true,
  useParams: () => ({
    proposalId: MOCK_PROPOSAL_ID,
  }),
}));

jest.mock("../utils/proposalsApi", () => ({
  __esModule: true,
  fetchProposal: jest.fn(),
}));

jest.mock("socket.io-client", () => ({
  __esModule: true,
  io: () => ({ on: jest.fn(), disconnect: jest.fn() }),
}));

jest.mock("../components/Map", () => ({
  __esModule: true,
  default: ({ mode }) => (
    <div data-testid="map" data-mode={mode}>
      Map
    </div>
  ),
}));

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
  mockCommentsResponse([]);
});

// AI-assisted (claude)
test("shows loading state while fetching", () => {
  fetchProposal.mockReturnValue(new Promise(() => {}));

  render(<ViewProposalPage />);

  expect(screen.getByText("Loading proposal…")).toBeInTheDocument();
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
    await screen.findByText("First approved comment.")
  ).toBeInTheDocument();
  expect(screen.getByText("Second approved comment.")).toBeInTheDocument();
  expect(screen.getByText("2")).toBeInTheDocument();
});

test("shows empty message when there are no comments", async () => {
  fetchProposal.mockResolvedValue(fakeProposal);

  render(<ViewProposalPage />);

  expect(
    await screen.findByText("No comments yet.")
  ).toBeInTheDocument();
});
