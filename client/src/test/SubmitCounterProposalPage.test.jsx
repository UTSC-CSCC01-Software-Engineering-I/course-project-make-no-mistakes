import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SubmitCounterProposalPage from "../pages/SubmitCounterProposalPage";
import { createProposal } from "../utils/proposalsApi";

const mockNavigate = jest.fn();

jest.mock("react-router", () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
}));

jest.mock("../components/Map", () => ({
  __esModule: true,
  default: ({ onDrawChange }) => (
    <button
      type="button"
      onClick={() => onDrawChange({
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-79.38, 43.65] },
        }],
      })}
    >
      Draw boundary
    </button>
  ),
}));

jest.mock("../utils/proposalsApi", () => ({
  __esModule: true,
  createProposal: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  createProposal.mockResolvedValue({ id: "proposal-123" });
});

test("submits counter proposal with the selected affected riding", async () => {
  const user = userEvent.setup();

  render(<SubmitCounterProposalPage />);

  await user.click(screen.getByRole("button", { name: "Draw boundary" }));
  await user.selectOptions(screen.getByLabelText("Affected Riding"), "3");
  await user.type(
    screen.getByLabelText("Proposal Rationale"),
    "Move this boundary to better match the local community."
  );
  await user.click(screen.getByRole("button", { name: "Submit Counter-Proposal" }));

  expect(createProposal).toHaveBeenCalledWith({
    body: "Move this boundary to better match the local community.",
    relatedRidings: [3],
    mapData: {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [-79.38, 43.65] },
      }],
    },
  });
  expect(mockNavigate).toHaveBeenCalledWith("/view/proposal-123");
});
