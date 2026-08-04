import {
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import UserSubmissionsPage from "../pages/UserSubmissionsPage";
import {
  fetchMyProposals,
} from "../utils/proposalsApi";
import {
  fetchMyObjections,
} from "../utils/objectionsApi";

const mockNavigate = jest.fn();

jest.mock("react-router", () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
}));

jest.mock("../utils/proposalsApi", () => ({
  __esModule: true,
  fetchMyProposals: jest.fn(),
}));

jest.mock("../utils/objectionsApi", () => ({
  __esModule: true,
  fetchMyObjections: jest.fn(),
}));

const PROPOSAL_A = {
  id: "proposal-1",
  public_reference_number: "CRMP-2026-001",
  status: "under_review",
  created_at: "2026-01-15T12:00:00.000Z",
  body: "Move this boundary to better match the local community.",
};

const PROPOSAL_B = {
  id: "proposal-2",
  public_reference_number: "CRMP-2026-002",
  status: "addressed",
  created_at: "2026-02-20T12:00:00.000Z",
  body: "Keep the communities on the east side in one riding.",
};

const OBJECTION_A = {
  id: "objection-1",
  submission_type: "objection",
  public_reference_number: "OBJ-2026-001",
  status: "received",
  created_at: "2026-03-10T12:00:00.000Z",
  body: "This boundary separates communities that should remain together.",
  related_ridings: [35005, 35094],
  related_riding_details: [
    {
      federalDistrictCode: "35005",
      federalDistrictName: "Toronto Centre",
      province: "Ontario",
      boundaryVersion: "2023",
    },
    {
      federalDistrictCode: "35094",
      federalDistrictName: "Toronto—St. Paul's",
      province: "Ontario",
      boundaryVersion: "2023",
    },
  ],
  selected_point: {
    lng: -79.38,
    lat: 43.65,
  },
};

function localDateInputValue(timestamp) {
  const date = new Date(timestamp);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 10);
}

beforeEach(() => {
  jest.clearAllMocks();

  // UserSubmissionsPage calls both functions with Promise.all(),
  // then immediately calls .map() on both returned values.
  fetchMyProposals.mockResolvedValue([
    PROPOSAL_A,
    PROPOSAL_B,
  ]);
  fetchMyObjections.mockResolvedValue([]);
});

test("renders a message when the user has no submissions", async () => {
  fetchMyProposals.mockResolvedValueOnce([]);
  fetchMyObjections.mockResolvedValueOnce([]);

  render(<UserSubmissionsPage />);

  expect(
    await screen.findByText(
      "You haven't submitted anything yet."
    )
  ).toBeInTheDocument();
});

test("renders the user's own submissions in a table", async () => {
  render(<UserSubmissionsPage />);

  expect(
    await screen.findByText("CRMP-2026-001")
  ).toBeInTheDocument();
  expect(
    screen.getByText("CRMP-2026-002")
  ).toBeInTheDocument();

  const table = screen.getByRole("table");
  const rows = within(table).getAllByRole("row");

  expect(rows).toHaveLength(3);
  expect(fetchMyProposals).toHaveBeenCalledTimes(1);
  expect(fetchMyObjections).toHaveBeenCalledTimes(1);
});

test("renders an objection with its riding names and rationale", async () => {
  fetchMyProposals.mockResolvedValueOnce([]);
  fetchMyObjections.mockResolvedValueOnce([
    OBJECTION_A,
  ]);

  render(<UserSubmissionsPage />);

  const referenceCell =
    await screen.findByText("OBJ-2026-001");
  const row = referenceCell.closest("tr");

  expect(row).not.toBeNull();
  expect(
    within(row).getByText("Objection")
  ).toBeInTheDocument();
  expect(
    within(row).getByText(/received/i)
  ).toBeInTheDocument();
  expect(
    within(row).getByText(
      "Toronto Centre, Toronto—St. Paul's"
    )
  ).toBeInTheDocument();
  expect(
    within(row).getByText(
      "This boundary separates communities that should remain together."
    )
  ).toBeInTheDocument();
});

test("sorts proposals and objections together from newest to oldest", async () => {
  fetchMyObjections.mockResolvedValueOnce([
    OBJECTION_A,
  ]);

  render(<UserSubmissionsPage />);

  await screen.findByText("OBJ-2026-001");

  const rows = within(
    screen.getByRole("table")
  )
    .getAllByRole("row")
    .slice(1);

  expect(
    within(rows[0]).getByText("OBJ-2026-001")
  ).toBeInTheDocument();
  expect(
    within(rows[1]).getByText("CRMP-2026-002")
  ).toBeInTheDocument();
  expect(
    within(rows[2]).getByText("CRMP-2026-001")
  ).toBeInTheDocument();
});

test("filters submissions by objection and counter-proposal type", async () => {
  const user = userEvent.setup();

  fetchMyObjections.mockResolvedValueOnce([
    OBJECTION_A,
  ]);

  render(<UserSubmissionsPage />);

  await screen.findByText("OBJ-2026-001");

  const typeFilter = screen.getByLabelText("Type");

  await user.selectOptions(
    typeFilter,
    "objection"
  );

  expect(
    screen.getByText("OBJ-2026-001")
  ).toBeInTheDocument();
  expect(
    screen.queryByText("CRMP-2026-001")
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText("CRMP-2026-002")
  ).not.toBeInTheDocument();

  await user.selectOptions(
    typeFilter,
    "counter_proposal"
  );

  expect(
    screen.queryByText("OBJ-2026-001")
  ).not.toBeInTheDocument();
  expect(
    screen.getByText("CRMP-2026-001")
  ).toBeInTheDocument();
  expect(
    screen.getByText("CRMP-2026-002")
  ).toBeInTheDocument();
});

test("does not navigate when an objection reference is clicked", async () => {
  const user = userEvent.setup();

  fetchMyProposals.mockResolvedValueOnce([]);
  fetchMyObjections.mockResolvedValueOnce([
    OBJECTION_A,
  ]);

  render(<UserSubmissionsPage />);

  await user.click(
    await screen.findByText("OBJ-2026-001")
  );

  expect(mockNavigate).not.toHaveBeenCalled();
});

test("uses a fallback reference when an objection has no public reference", async () => {
  fetchMyProposals.mockResolvedValueOnce([]);
  fetchMyObjections.mockResolvedValueOnce([
    {
      ...OBJECTION_A,
      id: 7,
      public_reference_number: null,
    },
  ]);

  render(<UserSubmissionsPage />);

  expect(
    await screen.findByText("OBJ-000007")
  ).toBeInTheDocument();
});

test("filters submissions by reference number", async () => {
  const user = userEvent.setup();

  render(<UserSubmissionsPage />);

  await screen.findByText("CRMP-2026-001");

  await user.type(
    screen.getByLabelText("Reference"),
    "2026-002"
  );

  expect(
    screen.queryByText("CRMP-2026-001")
  ).not.toBeInTheDocument();
  expect(
    screen.getByText("CRMP-2026-002")
  ).toBeInTheDocument();
});

test("filters submissions by selected date", async () => {
  const user = userEvent.setup();

  render(<UserSubmissionsPage />);

  await screen.findByText("CRMP-2026-001");

  await user.type(
    screen.getByLabelText("Date"),
    localDateInputValue(PROPOSAL_A.created_at)
  );

  expect(
    screen.getByText("CRMP-2026-001")
  ).toBeInTheDocument();
  expect(
    screen.queryByText("CRMP-2026-002")
  ).not.toBeInTheDocument();
});

test("filters submissions by status", async () => {
  const user = userEvent.setup();

  render(<UserSubmissionsPage />);

  await screen.findByText("CRMP-2026-001");

  await user.selectOptions(
    screen.getByLabelText("Status"),
    "under_review"
  );

  expect(
    screen.getByText("CRMP-2026-001")
  ).toBeInTheDocument();
  expect(
    screen.queryByText("CRMP-2026-002")
  ).not.toBeInTheDocument();
});

test("shows a no-matches message when filters exclude everything", async () => {
  const user = userEvent.setup();

  render(<UserSubmissionsPage />);

  await screen.findByText("CRMP-2026-001");

  // PROPOSAL_B is addressed, but its reference does not match 2026-001.
  await user.selectOptions(
    screen.getByLabelText("Status"),
    "addressed"
  );
  await user.type(
    screen.getByLabelText("Reference"),
    "2026-001"
  );

  expect(
    await screen.findByText(
      "No submissions match your filters."
    )
  ).toBeInTheDocument();
});

test("clear filters button appears once a filter is active and resets status and date filters", async () => {
  const user = userEvent.setup();

  render(<UserSubmissionsPage />);

  await screen.findByText("CRMP-2026-001");

  expect(
    screen.queryByRole("button", {
      name: "Clear Filters",
    })
  ).not.toBeInTheDocument();

  const dateInput = screen.getByLabelText("Date");
  const statusInput = screen.getByLabelText("Status");

  await user.type(
    dateInput,
    localDateInputValue(PROPOSAL_A.created_at)
  );
  await user.selectOptions(
    statusInput,
    "under_review"
  );

  const clearButton = screen.getByRole("button", {
    name: "Clear Filters",
  });

  await user.click(clearButton);

  expect(dateInput).toHaveValue("");
  expect(statusInput).toHaveValue("all");
  expect(
    screen.getByText("CRMP-2026-001")
  ).toBeInTheDocument();
  expect(
    screen.getByText("CRMP-2026-002")
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", {
      name: "Clear Filters",
    })
  ).not.toBeInTheDocument();
});

test("navigates to the proposal view when a reference is clicked", async () => {
  const user = userEvent.setup();

  render(<UserSubmissionsPage />);

  await user.click(
    await screen.findByText("CRMP-2026-001")
  );

  expect(mockNavigate).toHaveBeenCalledWith(
    `/view/${PROPOSAL_A.id}`
  );
});