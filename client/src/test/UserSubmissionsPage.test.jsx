import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import UserSubmissionsPage from "../pages/UserSubmissionsPage";
import { fetchMyProposals } from "../utils/proposalsApi";

const mockNavigate = jest.fn();

jest.mock("react-router", () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
}));

jest.mock("../utils/proposalsApi", () => ({
  __esModule: true,
  fetchMyProposals: jest.fn(),
}));

function localDateInputValue(iso) {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const PROPOSAL_A = {
  id: "aaaaaaaa-1111-2222-3333-444444444444",
  public_reference_number: "CRMP-2026-001",
  status: "received",
  user_id: "user-aaa",
  created_at: "2026-06-20T12:00:00.000Z",
  body: "Rationale for proposal A.",
};

const PROPOSAL_B = {
  id: "bbbbbbbb-1111-2222-3333-444444444444",
  public_reference_number: "CRMP-2026-002",
  status: "under_review",
  user_id: "user-aaa",
  created_at: "2026-07-21T12:00:00.000Z",
  body: "Rationale for proposal B.",
};

beforeEach(() => {
  jest.clearAllMocks();
});

test("shows loading state while fetching", () => {
  fetchMyProposals.mockReturnValue(new Promise(() => {}));

  render(<UserSubmissionsPage />);

  expect(screen.getByText("Loading your submissions…")).toBeInTheDocument();
});

test("shows an error message when the fetch fails", async () => {
  fetchMyProposals.mockRejectedValue(new Error("Request failed."));

  render(<UserSubmissionsPage />);

  expect(await screen.findByText("Unable to load your submissions.")).toBeInTheDocument();
});

test("shows empty state when the user has no submissions", async () => {
  fetchMyProposals.mockResolvedValue([]);

  render(<UserSubmissionsPage />);

  expect(await screen.findByText("You haven't submitted anything yet.")).toBeInTheDocument();
});

test("renders the user's own submissions in a table", async () => {
  fetchMyProposals.mockResolvedValue([PROPOSAL_A, PROPOSAL_B]);

  render(<UserSubmissionsPage />);

  expect(await screen.findByText("CRMP-2026-001")).toBeInTheDocument();
  expect(screen.getByText("CRMP-2026-002")).toBeInTheDocument();

  const table = screen.getByRole("table");
  expect(within(table).getByText("Received")).toBeInTheDocument();
  expect(within(table).getByText("Under Review")).toBeInTheDocument();
  expect(screen.getByText("Rationale for proposal A.")).toBeInTheDocument();
});

test("filters submissions by reference number", async () => {
  const user = userEvent.setup();
  fetchMyProposals.mockResolvedValue([PROPOSAL_A, PROPOSAL_B]);

  render(<UserSubmissionsPage />);

  await screen.findByText("CRMP-2026-001");

  await user.type(screen.getByLabelText("Reference"), "2026-002");

  expect(screen.queryByText("CRMP-2026-001")).not.toBeInTheDocument();
  expect(screen.getByText("CRMP-2026-002")).toBeInTheDocument();
});

test("filters submissions by selected date", async () => {
  const user = userEvent.setup();
  fetchMyProposals.mockResolvedValue([PROPOSAL_A, PROPOSAL_B]);

  render(<UserSubmissionsPage />);

  await screen.findByText("CRMP-2026-001");

  await user.type(screen.getByLabelText("Date"), localDateInputValue(PROPOSAL_A.created_at));

  expect(screen.getByText("CRMP-2026-001")).toBeInTheDocument();
  expect(screen.queryByText("CRMP-2026-002")).not.toBeInTheDocument();
});

test("filters submissions by status", async () => {
  const user = userEvent.setup();
  fetchMyProposals.mockResolvedValue([PROPOSAL_A, PROPOSAL_B]);

  render(<UserSubmissionsPage />);

  await screen.findByText("CRMP-2026-001");

  await user.selectOptions(screen.getByLabelText("Status"), "under_review");

  expect(screen.queryByText("CRMP-2026-001")).not.toBeInTheDocument();
  expect(screen.getByText("CRMP-2026-002")).toBeInTheDocument();
});

test("shows a no-matches message when filters exclude everything", async () => {
  const user = userEvent.setup();
  fetchMyProposals.mockResolvedValue([PROPOSAL_A]);

  render(<UserSubmissionsPage />);

  await screen.findByText("CRMP-2026-001");

  await user.selectOptions(screen.getByLabelText("Status"), "addressed");

  expect(await screen.findByText("No submissions match your filters.")).toBeInTheDocument();
});

test("clear filters button appears once a filter is active and resets status and date filters", async () => {
  const user = userEvent.setup();
  fetchMyProposals.mockResolvedValue([PROPOSAL_A, PROPOSAL_B]);

  render(<UserSubmissionsPage />);

  await screen.findByText("CRMP-2026-001");

  expect(screen.queryByRole("button", { name: "Clear Filters" })).not.toBeInTheDocument();

  await user.selectOptions(screen.getByLabelText("Status"), "received");

  expect(screen.queryByText("CRMP-2026-002")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Clear Filters" }));

  expect(screen.getByLabelText("Status")).toHaveValue("all");
  expect(screen.getByLabelText("Reference")).toHaveValue("");
  expect(screen.getByLabelText("Date")).toHaveValue("");
  expect(screen.getByText("CRMP-2026-002")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Clear Filters" })).not.toBeInTheDocument();
});

test("navigates to the proposal view when a reference is clicked", async () => {
  const user = userEvent.setup();
  fetchMyProposals.mockResolvedValue([PROPOSAL_A]);

  render(<UserSubmissionsPage />);

  await user.click(await screen.findByText("CRMP-2026-001"));

  expect(mockNavigate).toHaveBeenCalledWith(`/view/${PROPOSAL_A.id}`);
});

test("navigates to the submit counter-proposal page", async () => {
  const user = userEvent.setup();
  fetchMyProposals.mockResolvedValue([]);

  render(<UserSubmissionsPage />);

  await user.click(screen.getByRole("button", { name: "+ Submit Counter-Proposal" }));

  expect(mockNavigate).toHaveBeenCalledWith("/submit-counter-proposal");
});
