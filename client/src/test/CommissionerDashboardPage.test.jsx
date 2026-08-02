import { render, screen, within } from "@testing-library/react";

import CommissionerDashboardPage from "../pages/CommissionerDashboardPage";
import { fetchProposals } from "../utils/proposalsApi";

const mockNavigate = jest.fn();

jest.mock("react-router", () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
}));

jest.mock("../utils/proposalsApi", () => ({
  __esModule: true,
  fetchProposals: jest.fn(),
}));

// AI-assisted (claude)
const recentProposals = Array.from({ length: 6 }, (_, index) => ({
  id: `id-${index + 1}`,
  public_reference_number: `CRMP-2026-00${index + 1}`,
  status: "received",
  user_id: `user-${index + 1}`,
  created_at: "2026-06-20T12:00:00.000Z",
}));

beforeEach(() => {
  jest.clearAllMocks();
  fetchProposals.mockReturnValue(new Promise(() => {}));
});

test("calculates overview statistics from commissioner submissions", () => {
  render(<CommissionerDashboardPage />);

  const overviewSection = screen
    .getByRole("heading", { name: "Overview" })
    .closest("section");

  expect(within(overviewSection).getByText("8")).toBeInTheDocument();
  expect(within(overviewSection).getByText("Total Submissions")).toBeInTheDocument();
  expect(within(overviewSection).getByText("Written Comments")).toBeInTheDocument();
  expect(within(overviewSection).getByText("Boundary Objections")).toBeInTheDocument();
  expect(within(overviewSection).getByText("Counter Proposals")).toBeInTheDocument();
  expect(within(overviewSection).getByText("Under Review")).toBeInTheDocument();
});

test("shows riding activity breakdown and heat levels", () => {
  render(<CommissionerDashboardPage />);

  const torontoCentreRow = screen.getByRole("row", {
    name: /Toronto Centre 2 0 1 1 High/i,
  });

  expect(torontoCentreRow).toBeInTheDocument();

  const mississaugaRow = screen.getByRole("row", {
    name: /Mississauga East 1 1 0 0 Low/i,
  });

  expect(mississaugaRow).toBeInTheDocument();
});

test("shows submission volume sorted by newest date first", () => {
  render(<CommissionerDashboardPage />);

  const volumeSection = screen
    .getByRole("heading", { name: "Submission Volume Over Time" })
    .closest("section");

  const volumeRows = within(volumeSection).getAllByRole("row");

  expect(volumeRows[1]).toHaveTextContent("06/20/2026");
  expect(volumeRows[1]).toHaveTextContent("Scarborough North");
});

test("shows the five most recent submissions from the API", async () => {
  fetchProposals.mockResolvedValue(recentProposals);

  render(<CommissionerDashboardPage />);

  expect(await screen.findByText("CRMP-2026-001")).toBeInTheDocument();
  expect(screen.getByText("CRMP-2026-005")).toBeInTheDocument();
  expect(screen.queryByText("CRMP-2026-006")).not.toBeInTheDocument();
});

test("shows an empty message when there are no recent submissions", async () => {
  fetchProposals.mockResolvedValue([]);

  render(<CommissionerDashboardPage />);

  expect(await screen.findByText("No submissions yet.")).toBeInTheDocument();
});

test("shows an error message when the recent-submissions fetch fails", async () => {
  fetchProposals.mockRejectedValue(new Error("Request failed."));

  render(<CommissionerDashboardPage />);

  expect(await screen.findByText("Unable to load recent submissions.")).toBeInTheDocument();
});
