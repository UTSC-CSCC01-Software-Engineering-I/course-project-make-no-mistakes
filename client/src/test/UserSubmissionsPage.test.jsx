import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import UserSubmissionsPage from "../pages/UserSubmissionsPage";

const mockNavigate = jest.fn();

jest.mock("react-router", () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
}));

jest.mock("../components/Map", () => ({
  __esModule: true,
  default: ({ mode }) => (
    <div data-testid="map" data-mode={mode}>
      Map
    </div>
  ),
}));

beforeEach(() => {
  mockNavigate.mockClear();
});

test("filters my submissions by selected date", async () => {
  const user = userEvent.setup();

  render(<UserSubmissionsPage />);

  expect(screen.getByText("CRMP-2026-001")).toBeInTheDocument();
  expect(screen.getByText("CRMP-2026-004")).toBeInTheDocument();

  await user.type(screen.getByLabelText("Search by Date"), "2026-06-20");

  expect(screen.getByText("CRMP-2026-001")).toBeInTheDocument();
  expect(screen.queryByText("CRMP-2026-004")).not.toBeInTheDocument();
});

test("uses date-only search on my submissions", () => {
  render(<UserSubmissionsPage />);

  expect(screen.getByLabelText("Search by Date")).toHaveAttribute("type", "date");
  expect(screen.queryByText("Search by: User")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Filter proposals")).not.toBeInTheDocument();
});
