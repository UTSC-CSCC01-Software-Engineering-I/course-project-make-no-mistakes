import { render, screen } from "@testing-library/react";

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

// Need to add tests for login, logout when completed *****

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
