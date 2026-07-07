import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ViewProposalPage from "../pages/ViewProposalPage";
import proposals from "../data/proposals.json";
import comments from "../data/comments.json";

let mockProposalId = String(proposals[0].id);

jest.mock("react-router", () => ({
  __esModule: true,
  useParams: () => ({
    proposalId: mockProposalId,
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

function renderViewProposalPage(proposalId) {
  mockProposalId = String(proposalId);
  return render(<ViewProposalPage />);
}

// Case: A non-existent proposal is searched for
test("Proposal DNE", () => {
  renderViewProposalPage("not-a-real-id");

  expect(screen.getByText("Error: Proposal not found")).toBeInTheDocument();
});

// Checking incrementation for the like button on the proposal post
test("Increment Likes (Post)", async () => {
  const user = userEvent.setup();
  const proposal = proposals[0];

  renderViewProposalPage(proposal.id);

  expect(screen.getByText(`${proposal.postLikes} likes`)).toBeInTheDocument();

  const thumbsUpButtons = screen.getAllByAltText("thumbs up button");

  // The first thumbs-up button belongs to the proposal post.
  const proposalLikeButton = thumbsUpButtons[0].closest("button");

  await user.click(proposalLikeButton);

  expect(screen.getByText(`${proposal.postLikes + 1} likes`)).toBeInTheDocument();
});

// Checking incrementation for the like button on the first comment
test("Increment Likes (Comment)", async () => {
    const user = userEvent.setup();
    const proposal = proposals[0];
  
    const firstComment = comments.find(
      comment => String(comment.proposalId) === String(proposal.id)
    );
  
    renderViewProposalPage(proposal.id);
  
    const commentText = screen.getByText(firstComment.postComment);
    const commentArticle = commentText.closest("article");
  
    expect(commentArticle).toBeInTheDocument();
    expect(commentArticle).toHaveTextContent(`Likes: ${firstComment.postLikes}`);
  
    const commentLikeButton = within(commentArticle).getByRole("button");
  
    await user.click(commentLikeButton);
  
    expect(commentArticle).toHaveTextContent(`Likes: ${firstComment.postLikes + 1}`);
});