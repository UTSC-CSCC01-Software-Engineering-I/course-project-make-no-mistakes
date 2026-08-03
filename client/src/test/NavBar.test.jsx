import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import NavBar from "../components/NavBar";
import RoleProvider from "../utils/RoleProvider";
import axios from "axios";

let mockCurrentPath = "/";
const mockNavigate = jest.fn();

jest.mock("axios", () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn() },
}));

// builds a syntactically valid JWT with the given expiry offset; NavBar
// decodes the exp claim to decide logged-in state, so a bare placeholder
// string no longer counts as logged in
//
// AI-assisted (claude)
function makeFakeToken(expiresInSeconds = 3600) {
  const payload = btoa(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresInSeconds })
  );
  return `header.${payload}.signature`;
}

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

function renderNavBar() {
  return render(
    <RoleProvider>
      <NavBar />
    </RoleProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  mockNavigate.mockClear();
  axios.post.mockReset();
  axios.get.mockReset();
  mockCurrentPath = "/";
});

// Tests for login/logout and user state
test("shows a Login link when no token is stored", () => {
  renderNavBar();

  expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Logout" })).not.toBeInTheDocument();
});

// AI-assisted (claude)
test("shows a Logout button when a valid token is stored, and logs out on click", async () => {
  const user = userEvent.setup();
  const token = makeFakeToken();
  localStorage.setItem("sb_token", token);

  axios.get.mockResolvedValue({ data: { role: "publicuser" } });
  axios.post.mockResolvedValue({ data: {} });

  renderNavBar();

  // nothing renders until the role lookup resolves, so wait for the button
  const logoutButton = await screen.findByRole("button", { name: "Logout" });
  expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();

  await user.click(logoutButton);

  // logout revokes the session server-side before clearing the local token
  await waitFor(() => {
    expect(localStorage.getItem("sb_token")).toBeNull();
  });

  expect(axios.post).toHaveBeenCalledWith(
    "http://localhost:8080/auth/logout",
    null,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
});

test("treats an expired token as logged out", () => {
  localStorage.setItem("sb_token", makeFakeToken(-3600));

  renderNavBar();

  expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Logout" })).not.toBeInTheDocument();
});

test("treats a malformed token as logged out", () => {
  localStorage.setItem("sb_token", "not-a-jwt");

  renderNavBar();

  expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Logout" })).not.toBeInTheDocument();
});

// AI-assisted (claude)
test("still logs out locally when the revocation request fails", async () => {
  const user = userEvent.setup();

  axios.get.mockResolvedValue({ data: { role: "publicuser" } });
  axios.post.mockRejectedValueOnce(new Error("Network Error"));

  localStorage.setItem("sb_token", makeFakeToken());

  renderNavBar();

  await user.click(await screen.findByRole("button", { name: "Logout" }));
  await waitFor(() => {
    expect(localStorage.getItem("sb_token")).toBeNull();
  });

  expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
});

test("hides the Dashboard link when logged out", () => {
  renderNavBar();

  expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
});

test("hides the Dashboard link for publicusers", async () => {
  localStorage.setItem("sb_token", makeFakeToken());
  axios.get.mockResolvedValue({ data: { role: "publicuser" } });

  renderNavBar();

  // wait for the navbar to render before asserting absence
  await screen.findByRole("link", { name: "My Submissions" });

  expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
});

test("shows the Dashboard link for commissioners", async () => {
  localStorage.setItem("sb_token", makeFakeToken());
  axios.get.mockResolvedValue({ data: { role: "commissioner" } });

  renderNavBar();

  expect(await screen.findByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Review" })).toBeInTheDocument();
});

test("hides the My Submissions link when logged out", () => {
  renderNavBar();

  expect(screen.queryByRole("link", { name: "My Submissions" })).not.toBeInTheDocument();
});

test("shows the My Submissions link for publicusers", async () => {
  localStorage.setItem("sb_token", makeFakeToken());
  axios.get.mockResolvedValue({ data: { role: "publicuser" } });

  renderNavBar();

  expect(await screen.findByRole("link", { name: "My Submissions" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Counterproposal" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Objection" })).toBeInTheDocument();
});

test("hides the My Submissions link for commissioners", async () => {
  localStorage.setItem("sb_token", makeFakeToken());
  axios.get.mockResolvedValue({ data: { role: "commissioner" } });

  renderNavBar();

  // wait for the navbar to render before asserting absence
  await screen.findByRole("link", { name: "Dashboard" });

  expect(screen.queryByRole("link", { name: "My Submissions" })).not.toBeInTheDocument();
});

// Tests for styling when a different page is selected
test("adds different styling to the selected Submissions link", async () => {
  mockCurrentPath = "/user-submissions";
  localStorage.setItem("sb_token", makeFakeToken());
  axios.get.mockResolvedValue({ data: { role: "publicuser" } });

  renderNavBar();

  // nothing renders until the role lookup resolves, so wait for a link first
  expect(await screen.findByRole("link", { name: "My Submissions" }))
    .toHaveClass("activeNavBarLink");

  expect(screen.getByRole("link", { name: "Home" }))
    .not.toHaveClass("activeNavBarLink");
});

test("adds different styling to the selected Dashboard link", async () => {
  mockCurrentPath = "/commissioner-dashboard";
  localStorage.setItem("sb_token", makeFakeToken());
  axios.get.mockResolvedValue({ data: { role: "commissioner" } });

  renderNavBar();

  // nothing renders until the role lookup resolves, so wait for the link first
  expect(await screen.findByRole("link", { name: "Dashboard" }))
    .toHaveClass("activeNavBarLink");

  expect(screen.getByRole("link", { name: "Home" }))
    .not.toHaveClass("activeNavBarLink");
});
