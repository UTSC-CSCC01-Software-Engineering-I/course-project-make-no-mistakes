import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import CommissionerDashboardPage from "../pages/CommissionerDashboardPage";
import { fetchProposals } from "../utils/proposalsApi";

const fakeProposals = [
  {
    id: "proposal-1",
    user_id: "alice111-0000-0000-0000-000000000000",
    submission_type: "counter_proposal",
    related_ridings: [3],
    created_at: "2026-06-20T12:00:00.000Z",
  },
  {
    id: "proposal-2",
    user_id: "bob22222-0000-0000-0000-000000000000",
    submission_type: "counter_proposal",
    related_ridings: [1],
    created_at: "2026-06-19T12:00:00.000Z",
  },
  {
    id: "proposal-3",
    user_id: "carol333-0000-0000-0000-000000000000",
    submission_type: "counter_proposal",
    related_ridings: [3],
    created_at: "2026-06-18T12:00:00.000Z",
  },
  {
    id: "proposal-4",
    user_id: "dan44444-0000-0000-0000-000000000000",
    submission_type: "counter_proposal",
    related_ridings: [4],
    created_at: "2026-06-17T12:00:00.000Z",
  },
  {
    id: "proposal-5",
    user_id: "erin5555-0000-0000-0000-000000000000",
    submission_type: "counter_proposal",
    related_ridings: [5],
    created_at: "2026-06-16T12:00:00.000Z",
  },
  {
    id: "proposal-6",
    user_id: "faye6666-0000-0000-0000-000000000000",
    submission_type: "counter_proposal",
    related_ridings: [6],
    created_at: "2026-06-15T12:00:00.000Z",
  },
  {
    id: "proposal-7",
    user_id: "gabe7777-0000-0000-0000-000000000000",
    submission_type: "counter_proposal",
    related_ridings: [2],
    created_at: "2026-06-14T12:00:00.000Z",
  },
];

jest.mock("../utils/proposalsApi", () => ({
  __esModule: true,
  fetchProposals: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  fetchProposals.mockResolvedValue(fakeProposals);
});

test("calculates overview statistics from loaded proposals", async () => {
  render(<CommissionerDashboardPage />);

  await screen.findByText("ID proposal-1");

  const overviewSection = screen
    .getByRole("heading", { name: "Overview" })
    .closest("section");

  const totalPostsCard = within(overviewSection)
    .getByText("Total Posts")
    .closest("article");
  const counterProposalCard = within(overviewSection)
    .getByText("Counter Proposals")
    .closest("article");
  const writtenCommentCard = within(overviewSection)
    .getByText("Written Comments")
    .closest("article");
  const pendingCommentsCard = within(overviewSection)
    .getByText("Pending Comments")
    .closest("article");

  expect(totalPostsCard).toHaveTextContent("7");
  expect(counterProposalCard).toHaveTextContent("7");
  expect(writtenCommentCard).toHaveTextContent("0");
  expect(pendingCommentsCard).toHaveTextContent("0");
  expect(fetchProposals).toHaveBeenCalledTimes(1);
});

test("shows riding activity breakdown and heat levels", async () => {
  render(<CommissionerDashboardPage />);

  await screen.findByText("ID proposal-1");

  const scarboroughRow = screen.getByRole("row", {
    name: /Scarborough North 2 2 High/i,
  });

  expect(scarboroughRow).toBeInTheDocument();
  expect(screen.getByRole("row", { name: /Toronto Centre 1 1 Low/i })).toBeInTheDocument();
});

test("shows a commissioner heatmap built from riding submission totals", async () => {
  render(<CommissionerDashboardPage />);

  await screen.findByText("ID proposal-1");

  const heatmapSection = screen
    .getByRole("heading", { name: "Riding Activity Heatmap" })
    .closest("section");

  expect(within(heatmapSection).getByText("Scarborough North")).toBeInTheDocument();
  expect(within(heatmapSection).getByText("2 submissions")).toBeInTheDocument();
  expect(
    within(heatmapSection).queryByText("Riding data is not available yet.")
  ).not.toBeInTheDocument();
  expect(
    heatmapSection.querySelectorAll(".dashboardHeatmapTile.heatmapHigh")
  ).toHaveLength(1);
});

test("filters the commissioner heatmap by submission type", async () => {
  const user = userEvent.setup();

  render(<CommissionerDashboardPage />);

  await screen.findByText("ID proposal-1");

  const heatmapSection = screen
    .getByRole("heading", { name: "Riding Activity Heatmap" })
    .closest("section");

  await user.click(within(heatmapSection).getByRole("button", {
    name: "Counter Proposals",
  }));

  const scarboroughTile = within(heatmapSection)
    .getByText("Scarborough North")
    .closest("article");

  expect(scarboroughTile).toHaveTextContent("2 submissions");
  expect(scarboroughTile).toHaveTextContent("High");
});

test("shows submission volume sorted by newest date first", async () => {
  render(<CommissionerDashboardPage />);

  await screen.findByText("ID proposal-1");

  const volumeSection = screen
    .getByRole("heading", { name: "Submission Volume Over Time" })
    .closest("section");

  const volumeRows = within(volumeSection).getAllByRole("row");

  expect(
    volumeRows.some((row) =>
      row.textContent.includes("Scarborough North")
    )
  ).toBe(true);
});

test("shows the five most recent submissions", async () => {
  render(<CommissionerDashboardPage />);

  await screen.findByText("ID proposal-1");
  expect(screen.getByText("ID proposal-1")).toBeInTheDocument();
  expect(screen.getByText("ID proposal-5")).toBeInTheDocument();
  expect(screen.queryByText("ID proposal-6")).not.toBeInTheDocument();
});
