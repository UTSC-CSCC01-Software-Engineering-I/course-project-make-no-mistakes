import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import NavBar from "../components/NavBar";

let mockCurrentPath = "/";
const mockNavigate = jest.fn();

// Mock router
jest.mock("react-router", () => {
  const React = require("react");

  return {
    __esModule: true,

    useNavigate: () => mockNavigate,

    NavLink: ({ to, className, children }) => {
      const isActive = mockCurrentPath === to;

      const resolvedClassName =
        typeof className === "function"
          ? className({ isActive })
          : className;

      return React.createElement(
        "a",
        {
          href: to,
          className: resolvedClassName,
        },
        children
      );
    },
  };
});

beforeEach(() => {
  localStorage.clear();
  mockNavigate.mockClear();
  mockCurrentPath = "/";
});

// Tests for login/logout state
test("shows a Login link when no token is stored", () => {
  render(<NavBar />);

  expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Logout" })).not.toBeInTheDocument();
});

test("shows a Logout button when a token is stored, and logs out on click", async () => {
  const user = userEvent.setup();
  localStorage.setItem("sb_token", "test-token");

  render(<NavBar />);

  expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
  const logoutButton = screen.getByRole("button", { name: "Logout" });

  await user.click(logoutButton);

  expect(localStorage.getItem("sb_token")).toBeNull();
  expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
});

// Tests for styling when a different page is selected
test("adds different styling to the selected page", () => {
  mockCurrentPath = "/user-submissions";

  render(<NavBar />);

  expect(screen.getByRole("link", { name: "My Submissions" }))
    .toHaveClass("activeNavBarLink");

  expect(screen.getByRole("link", { name: "Home" }))
    .not.toHaveClass("activeNavBarLink");

  expect(screen.getByRole("link", { name: "Dashboard" }))
    .not.toHaveClass("activeNavBarLink");
});
