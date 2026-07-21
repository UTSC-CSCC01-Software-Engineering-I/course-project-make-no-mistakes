import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ViewProposalPage from "../pages/ViewProposalPage";

let mockProposalId = "1";

const mockProposal = {
  id: 1,
  postUser: "user1",
  postDate: "06/19/2026",
  previewURL: "https://example.com/map.jpg",
  postRating: 85,
  postLikes: 120,
  postDownvotes: 3,
  postComments: 14,
  currentUserVote: null,
};

const mockComments = [
  {
    id: 10,
    proposalId: "1",
    userId: "u1",
    authorName: "username1",
    content: "I think this is a great map!",
    upvotes: 2,
    downvotes: 0,
    relatedRidings: [],
    createdAt: "2026-06-19T00:00:00.000Z",
  },
];

const mockGetProposal = jest.fn();
const mockGetComments = jest.fn();
const mockAddComment = jest.fn();
const mockVoteProposal = jest.fn();

jest.mock("react-router", () => ({
  __esModule: true,
  useParams: () => ({
    proposalId: mockProposalId,
  }),
}));

jest.mock("socket.io-client", () => ({
  __esModule: true,
  io: () => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  }),
}));

jest.mock("../components/Map", () => ({
  __esModule: true,
  default: ({ mode }) => (
    <div data-testid="map" data-mode={mode}>
      Map
    </div>
  ),
}));

jest.mock("../apiService", () => ({
  __esModule: true,
  apiService: {
    getProposal: (...args) => mockGetProposal(...args),
    getComments: (...args) => mockGetComments(...args),
    addComment: (...args) => mockAddComment(...args),
    voteProposal: (...args) => mockVoteProposal(...args),
    voteComment: jest.fn(),
    deleteComment: jest.fn(),
    updateCommentVote: jest.fn(),
  },
}));

function renderViewProposalPage(proposalId) {
  mockProposalId = String(proposalId);
  mockGetProposal.mockReset();
  mockGetComments.mockReset();
  mockVoteProposal.mockReset();

  if (String(proposalId) === "not-a-real-id") {
    const err = new Error("Proposal not found");
    err.status = 404;
    mockGetProposal.mockRejectedValue(err);
    mockGetComments.mockResolvedValue([]);
  } else {
    mockGetProposal.mockResolvedValue({ ...mockProposal });
    mockGetComments.mockResolvedValue(mockComments);
  }

  return render(<ViewProposalPage />);
}

test("Proposal DNE", async () => {
  renderViewProposalPage("not-a-real-id");

  await waitFor(() => {
    expect(screen.getByText("Error: Proposal not found")).toBeInTheDocument();
  });
});

test("Proposal vote calls API and updates counts", async () => {
  const user = userEvent.setup();
  window.alert = jest.fn();
  localStorage.setItem("sb_token", "test-token");

  renderViewProposalPage(mockProposal.id);

  mockVoteProposal.mockResolvedValue({
    upvotes: 121,
    downvotes: 3,
    currentUserVote: 1,
  });

  await waitFor(() => {
    expect(screen.getByText(`${mockProposal.postLikes} likes`)).toBeInTheDocument();
  });

  const thumbsUpButtons = screen.getAllByAltText("thumbs up button");
  await user.click(thumbsUpButtons[0].closest("button"));

  await waitFor(() => {
    expect(mockVoteProposal).toHaveBeenCalledWith("1", 1);
    expect(screen.getByText("121 likes")).toBeInTheDocument();
  });

  localStorage.removeItem("sb_token");
});

test("Loads comments from API", async () => {
  renderViewProposalPage(mockProposal.id);

  await waitFor(() => {
    expect(screen.getByText("I think this is a great map!")).toBeInTheDocument();
  });

  expect(mockGetProposal).toHaveBeenCalledWith("1");
  expect(mockGetComments).toHaveBeenCalledWith("1");
});
