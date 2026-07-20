import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import BrowsePage from "../pages/BrowsePage";
import { fetchProposals } from "../utils/proposalsApi";

// Row-shaped fixtures for the submissions table. The user_ids are readable
// stand-ins, not valid UUIDs — the client only ever slices them for display.
// postRating and postComments have no backing column yet, but the page
// tolerates them and the sort options need values to order by.
const fakeProposals = [
  {
    id: "11111111-aaaa-bbbb-cccc-000000000001",
    user_id: "alice111-0000-0000-0000-000000000000",
    submission_type: "counter_proposal",
    body: "First proposal rationale.",
    created_at: "2026-06-20T12:00:00.000Z",
    postRating: 60,
  },
  {
    id: "11111111-aaaa-bbbb-cccc-000000000002",
    user_id: "bob22222-0000-0000-0000-000000000000",
    submission_type: "counter_proposal",
    body: "Second proposal rationale.",
    created_at: "2026-06-19T12:00:00.000Z",
    postRating: 85,
  },
  {
    id: "11111111-aaaa-bbbb-cccc-000000000003",
    user_id: "carol333-0000-0000-0000-000000000000",
    submission_type: "counter_proposal",
    body: "Third proposal rationale.",
    created_at: "2026-06-18T12:00:00.000Z",
    postRating: 92,
  },
];

jest.mock("react-router", () => {
  const React = require("react");

  return {
    __esModule: true,
    NavLink: ({ to, className, children }) =>
      React.createElement(
        "a",
        {
          href: to,
          className,
        },
        children
      ),
  };
});

jest.mock("../utils/proposalsApi", () => ({
  __esModule: true,
  fetchProposals: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  fetchProposals.mockResolvedValue(fakeProposals);
});

test("shows all proposals before a search is entered", async () => {
  render(<BrowsePage />);

  expect(
    await screen.findAllByAltText("Preview thumbnail of the proposal")
  ).toHaveLength(fakeProposals.length);
});

test("filters proposals by user search text", async () => {
  const user = userEvent.setup();

  render(<BrowsePage />);

  await screen.findByText("User alice111");

  await user.type(screen.getByRole("searchbox"), "alice111");

  expect(screen.getAllByAltText("Preview thumbnail of the proposal")).toHaveLength(1);
  expect(screen.getByText("User alice111")).toBeInTheDocument();
  expect(screen.queryByText("User bob22222")).not.toBeInTheDocument();
});

test("filters proposals by the selected date", async () => {
  const user = userEvent.setup();

  render(<BrowsePage />);

  await screen.findByText("User alice111");

  await user.click(screen.getByText("Search by: User"));
  await user.click(screen.getByLabelText("Date"));
  await user.type(screen.getByLabelText("Search by Date"), "2026-06-19");

  expect(screen.getAllByAltText("Preview thumbnail of the proposal")).toHaveLength(1);
  expect(screen.getByText("User bob22222")).toBeInTheDocument();
});

test("closes the search type menu when clicking outside it", async () => {
  const user = userEvent.setup();

  render(<BrowsePage />);

  await screen.findByText("User alice111");

  await user.click(screen.getByText("Search by: User"));
  expect(screen.getByLabelText("Date")).toBeInTheDocument();

  await user.click(screen.getByRole("heading", { name: "Browse Proposals:" }));

  expect(screen.queryByLabelText("Date")).not.toBeInTheDocument();
});

test("sorts proposals by selected filter option", async () => {
  const user = userEvent.setup();
  const highestRatedProposal = [...fakeProposals].sort(
    (a, b) => b.postRating - a.postRating
  )[0];

  render(<BrowsePage />);

  await screen.findByText("User alice111");

  await user.click(screen.getByLabelText("Filter proposals"));
  await user.click(screen.getByLabelText("Rating high"));

  const proposalCards = screen.getAllByRole("article");
  expect(proposalCards[0]).toHaveTextContent("User carol333");
  expect(proposalCards[0]).toHaveTextContent(`${highestRatedProposal.postRating}%`);
});

test("shows an empty state when no proposals match the search", async () => {
  const user = userEvent.setup();

  render(<BrowsePage />);

  await screen.findByText("User alice111");

  await user.type(screen.getByRole("searchbox"), "no matching proposal");

  expect(screen.queryByAltText("Preview thumbnail of the proposal")).not.toBeInTheDocument();
  expect(screen.getByText("No proposals match your search.")).toBeInTheDocument();
});
