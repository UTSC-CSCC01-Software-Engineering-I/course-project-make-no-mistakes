import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import BrowsePage from "../pages/BrowsePage";
import proposals from "../data/proposals.json";

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

test("shows all proposals before a search is entered", () => {
  render(<BrowsePage />);

  expect(screen.getAllByAltText("Preview thumbnail of the proposal")).toHaveLength(
    proposals.length
  );
});

test("filters proposals by user search text", async () => {
  const user = userEvent.setup();

  render(<BrowsePage />);

  await user.type(screen.getByRole("searchbox"), proposals[0].postUser);

  expect(screen.getAllByAltText("Preview thumbnail of the proposal")).toHaveLength(1);
  expect(screen.getByText(proposals[0].postUser)).toBeInTheDocument();
  expect(screen.queryByText(proposals[1].postUser)).not.toBeInTheDocument();
});

test("filters proposals by the selected date", async () => {
  const user = userEvent.setup();

  render(<BrowsePage />);

  await user.click(screen.getByText("Search by: User"));
  await user.click(screen.getByLabelText("Date"));
  await user.type(screen.getByLabelText("Search by Date"), "2026-06-19");

  expect(screen.getAllByAltText("Preview thumbnail of the proposal")).toHaveLength(1);
  expect(screen.getByText(proposals[0].postUser)).toBeInTheDocument();
});

test("closes the search type menu when clicking outside it", async () => {
  const user = userEvent.setup();

  render(<BrowsePage />);

  await user.click(screen.getByText("Search by: User"));
  expect(screen.getByLabelText("Date")).toBeInTheDocument();

  await user.click(screen.getByRole("heading", { name: "Browse Proposals:" }));

  expect(screen.queryByLabelText("Date")).not.toBeInTheDocument();
});

test("sorts proposals by selected filter option", async () => {
  const user = userEvent.setup();
  const highestRatedProposal = [...proposals].sort(
    (a, b) => b.postRating - a.postRating
  )[0];

  render(<BrowsePage />);

  await user.click(screen.getByLabelText("Filter proposals"));
  await user.click(screen.getByLabelText("Rating high"));

  const proposalCards = screen.getAllByRole("article");
  expect(proposalCards[0]).toHaveTextContent(highestRatedProposal.postUser);
  expect(proposalCards[0]).toHaveTextContent(`${highestRatedProposal.postRating}%`);
});

test("shows an empty state when no proposals match the search", async () => {
  const user = userEvent.setup();

  render(<BrowsePage />);

  await user.type(screen.getByRole("searchbox"), "no matching proposal");

  expect(screen.queryByAltText("Preview thumbnail of the proposal")).not.toBeInTheDocument();
  expect(screen.getByText("No proposals match your search.")).toBeInTheDocument();
});
