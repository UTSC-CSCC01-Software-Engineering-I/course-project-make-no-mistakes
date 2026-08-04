import {
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ViewProposalPage from "../pages/ViewProposalPage";
import { fetchProposal } from "../utils/proposalsApi";

const MOCK_PROPOSAL_ID =
  "0f8e2c34-9d1a-4b7e-8f2a-6c5d4e3b2a10";

const fakeProposal = {
  id: MOCK_PROPOSAL_ID,
  user_id: "a1b2c3d4-1111-2222-3333-444455556666",
  submission_type: "counter_proposal",
  body: "Counter proposal rationale.",
  created_at: "2026-07-01T12:00:00.000Z",
};

jest.mock("../config/api", () => ({
  __esModule: true,
  SOCKET_URL: "http://localhost:8080",
}));

/*
 * Jest does not understand Vite's import.meta.env syntax.
 * Mock mapData so the real mapData.js file is not evaluated.
 */
jest.mock("../config/mapData", () => ({
  __esModule: true,

  PROVINCE_MAP_DATA: {
    ab: {
      label: "Alberta",
      center: [-114.5, 53.5],
      zoom: 5,

      populationCentres:
        "/mock/ab/ab_population_centres.geojson",

      designatedPlaces:
        "/mock/ab/ab_designated_places.geojson",

      pollingDistricts:
        "/mock/ab/fed2021_ab_polling_districts.geojson",
    },

    on: {
      label: "Ontario",
      center: [-79.3832, 43.6532],
      zoom: 6,

      populationCentres:
        "/mock/on/on_population_centres.geojson",

      designatedPlaces:
        "/mock/on/on_designated_places.geojson",

      // Ontario's polling-district file has not been uploaded.
      pollingDistricts: null,
    },

    pe: {
      label: "Prince Edward Island",
      center: [-63.2, 46.4],
      zoom: 8,

      populationCentres:
        "/mock/pe/pe_population_centres.geojson",

      designatedPlaces: null,

      pollingDistricts:
        "/mock/pe/fed2021_pe_polling_districts.geojson",
    },

    qc: {
      label: "Quebec",
      center: [-71.2, 46.8],
      zoom: 5,

      populationCentres:
        "/mock/qc/qc_population_centres.geojson",

      designatedPlaces:
        "/mock/qc/qc_designated_places.geojson",

      // Quebec's polling-district file has not been uploaded.
      pollingDistricts: null,
    },
  },
}));

jest.mock("socket.io-client", () => {
  const io = jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    close: jest.fn(),
  }));

  return {
    __esModule: true,
    io,
    default: io,
  };
});

jest.mock("react-router", () => ({
  __esModule: true,

  useParams: () => ({
    proposalId: MOCK_PROPOSAL_ID,
  }),
}));

jest.mock("../utils/proposalsApi", () => ({
  __esModule: true,
  fetchProposal: jest.fn(),
}));

/*
 * Mock MapLibre and TerraDraw behavior.
 *
 * forwardRef and useImperativeHandle are needed because
 * ViewProposalPage uses mapComponentRef.current.
 */
jest.mock("../components/Map", () => {
  const React = require("react");

  const MockMap = React.forwardRef(function MockMap(
    {
      mode,
      province,
      boundaryLayer,
      onRegionSelect,
    },
    ref
  ) {
    React.useImperativeHandle(ref, () => ({
      simplifyDrawing: jest.fn(),
      clearSelectedRegion: jest.fn(),
    }));

    return (
      <div
        data-testid="map"
        data-mode={mode}
        data-province={province}
        data-boundary-layer={boundaryLayer}
      >
        <span>Map</span>

        <button
          type="button"
          onClick={() => {
            onRegionSelect?.({
              id: "mock-region-id",
              dguid: "mock-dguid",
              name: "Toronto",
              province: "on",
              provinceLabel: "Ontario",
              geographyType: "populationCentres",
              geographyLabel: "Population centre",
              classification:
                "Large urban population centre",
              regionType: "Population centre",
              landArea: 123.45,
              properties: {},
            });
          }}
        >
          Select mock region
        </button>
      </div>
    );
  });

  return {
    __esModule: true,
    default: MockMap,
  };
});

jest.mock("../components/ProposalComment", () => ({
  __esModule: true,
  default: ({ postComment }) => (
    <div>{postComment}</div>
  ),
}));

function makeApiError(status) {
  const error = new Error("Request failed.");
  error.status = status;
  return error;
}

function mockCommentsResponse(comments = []) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => comments,
  });
}

async function renderReadyProposalPage() {
  fetchProposal.mockResolvedValue(fakeProposal);

  render(<ViewProposalPage />);

  await screen.findByText(
    `ID: ${MOCK_PROPOSAL_ID}`
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  mockCommentsResponse([]);
});

afterAll(() => {
  delete global.fetch;
});

test("shows loading state while fetching", () => {
  fetchProposal.mockReturnValue(
    new Promise(() => {})
  );

  /*
   * Keep the comments request pending as well. Otherwise its resolved
   * promise could update liveComments after this synchronous test ends,
   * which would produce React's act(...) warning.
   */
  global.fetch = jest.fn(
    () => new Promise(() => {})
  );

  render(<ViewProposalPage />);

  expect(
    screen.getByText("Loading proposal…")
  ).toBeInTheDocument();

  expect(
    screen.queryByText(
      `ID: ${MOCK_PROPOSAL_ID}`
    )
  ).not.toBeInTheDocument();
});

test("renders proposal header after successful fetch", async () => {
  fetchProposal.mockResolvedValue(fakeProposal);

  render(<ViewProposalPage />);

  expect(
    await screen.findByText(
      `ID: ${MOCK_PROPOSAL_ID}`
    )
  ).toBeInTheDocument();

  expect(
    screen.getByText("User a1b2c3d4")
  ).toBeInTheDocument();

  expect(
    screen.getByText(
      new Date(
        fakeProposal.created_at
      ).toLocaleDateString()
    )
  ).toBeInTheDocument();

  expect(
    screen.getByText("0 likes")
  ).toBeInTheDocument();
});

test("shows not-found message on 404", async () => {
  fetchProposal.mockRejectedValue(
    makeApiError(404)
  );

  render(<ViewProposalPage />);

  expect(
    await screen.findByText(
      "Error: Proposal not found."
    )
  ).toBeInTheDocument();
});

test("shows not-found message on server error", async () => {
  fetchProposal.mockRejectedValue(
    makeApiError(500)
  );

  render(<ViewProposalPage />);

  expect(
    await screen.findByText(
      "Error: Proposal not found."
    )
  ).toBeInTheDocument();
});

test("increments likes on click", async () => {
  const user = userEvent.setup();

  fetchProposal.mockResolvedValue(
    fakeProposal
  );

  render(<ViewProposalPage />);

  await screen.findByText("0 likes");

  await user.click(
    screen.getByRole("button", {
      name: "Like this proposal",
    })
  );

  expect(
    screen.getByText("1 likes")
  ).toBeInTheDocument();
});

test("shows login prompt when logged out", async () => {
  fetchProposal.mockResolvedValue(
    fakeProposal
  );

  render(<ViewProposalPage />);

  expect(
    await screen.findByText(
      "Join the discussion"
    )
  ).toBeInTheDocument();

  expect(
    screen.getByRole("button", {
      name: "Log in to Comment",
    })
  ).toBeInTheDocument();

  expect(
    screen.queryByRole("textbox")
  ).not.toBeInTheDocument();
});

test("renders comments from the API", async () => {
  fetchProposal.mockResolvedValue(
    fakeProposal
  );

  mockCommentsResponse([
    {
      id: 1,
      content:
        "This is a great addition!",
    },
    {
      id: 2,
      content:
        "Maybe we should add a border here...",
    },
  ]);

  render(<ViewProposalPage />);

  expect(
    await screen.findByText(
      "This is a great addition!"
    )
  ).toBeInTheDocument();

  expect(
    screen.getByText(
      "Maybe we should add a border here..."
    )
  ).toBeInTheDocument();

  expect(
    screen.getByText("2")
  ).toBeInTheDocument();
});

test("shows empty message when there are no comments", async () => {
  fetchProposal.mockResolvedValue(
    fakeProposal
  );

  render(<ViewProposalPage />);

  expect(
    await screen.findByText(
      "No approved comments yet."
    )
  ).toBeInTheDocument();
});

test("displays selected region details", async () => {
  const user = userEvent.setup();

  await renderReadyProposalPage();

  await user.click(
    screen.getByRole("button", {
      name: "Select mock region",
    })
  );

  expect(
    screen.getByRole("heading", {
      name: "Toronto",
    })
  ).toBeInTheDocument();

  const selectedRegionCard =
    screen.getByRole("region", {
      name: "Selected region details",
    });

  expect(
    within(
      selectedRegionCard
    ).getByText("Ontario", {
      exact: true,
    })
  ).toBeInTheDocument();

  expect(
    within(
      selectedRegionCard
    ).getByText("123.45 km²")
  ).toBeInTheDocument();

  expect(
    within(
      selectedRegionCard
    ).getByText("mock-dguid")
  ).toBeInTheDocument();
});

test("passes the initial Ontario selection and federal ridings layer to Map", async () => {
  await renderReadyProposalPage();

  expect(
    screen.getByTestId("map")
  ).toHaveAttribute(
    "data-province",
    "on"
  );

  expect(
    screen.getByTestId("map")
  ).toHaveAttribute(
    "data-boundary-layer",
    "federalDistricts"
  );
});

test("shows available Ontario statistical layers", async () => {
  await renderReadyProposalPage();

  const layerSelect =
    screen.getByLabelText(
      "Statistical layer"
    );

  expect(
    within(layerSelect).getByRole(
      "option",
      {
        name: "None",
      }
    )
  ).toBeInTheDocument();

  expect(
    within(layerSelect).getByRole(
      "option",
      {
        name: "Population centres",
      }
    )
  ).toBeInTheDocument();

  expect(
    within(layerSelect).getByRole(
      "option",
      {
        name: "Designated places",
      }
    )
  ).toBeInTheDocument();
});

test("hides polling districts for Ontario", async () => {
  await renderReadyProposalPage();

  const layerSelect =
    screen.getByLabelText(
      "Statistical layer"
    );

  expect(
    within(layerSelect).queryByRole(
      "option",
      {
        name: "Polling districts",
      }
    )
  ).not.toBeInTheDocument();
});

test("hides polling districts for Quebec", async () => {
  const user = userEvent.setup();

  await renderReadyProposalPage();

  const provinceSelect =
    screen.getByLabelText("Province");

  await user.selectOptions(
    provinceSelect,
    "qc"
  );

  const layerSelect =
    screen.getByLabelText(
      "Statistical layer"
    );

  expect(
    provinceSelect
  ).toHaveValue("qc");

  expect(
    within(layerSelect).queryByRole(
      "option",
      {
        name: "Polling districts",
      }
    )
  ).not.toBeInTheDocument();

  expect(
    screen.getByTestId("map")
  ).toHaveAttribute(
    "data-province",
    "qc"
  );
});

test("shows polling districts for Alberta", async () => {
  const user = userEvent.setup();

  await renderReadyProposalPage();

  const provinceSelect =
    screen.getByLabelText("Province");

  await user.selectOptions(
    provinceSelect,
    "ab"
  );

  const layerSelect =
    screen.getByLabelText(
      "Statistical layer"
    );

  expect(
    provinceSelect
  ).toHaveValue("ab");

  expect(
    within(layerSelect).getByRole(
      "option",
      {
        name: "Polling districts",
      }
    )
  ).toBeInTheDocument();

  expect(
    screen.getByTestId("map")
  ).toHaveAttribute(
    "data-province",
    "ab"
  );
});

test("hides designated places for Prince Edward Island", async () => {
  const user = userEvent.setup();

  await renderReadyProposalPage();

  const provinceSelect =
    screen.getByLabelText("Province");

  await user.selectOptions(
    provinceSelect,
    "pe"
  );

  const layerSelect =
    screen.getByLabelText(
      "Statistical layer"
    );

  expect(
    within(layerSelect).queryByRole(
      "option",
      {
        name: "Designated places",
      }
    )
  ).not.toBeInTheDocument();

  expect(
    within(layerSelect).getByRole(
      "option",
      {
        name: "Polling districts",
      }
    )
  ).toBeInTheDocument();
});

test("passes the selected statistical layer to Map", async () => {
  const user = userEvent.setup();

  await renderReadyProposalPage();

  const layerSelect =
    screen.getByLabelText(
      "Statistical layer"
    );

  await user.selectOptions(
    layerSelect,
    "populationCentres"
  );

  expect(
    layerSelect
  ).toHaveValue(
    "populationCentres"
  );

  expect(
    screen.getByTestId("map")
  ).toHaveAttribute(
    "data-boundary-layer",
    "populationCentres"
  );
});

test("passes polling districts to Map when selected", async () => {
  const user = userEvent.setup();

  await renderReadyProposalPage();

  const provinceSelect =
    screen.getByLabelText("Province");

  await user.selectOptions(
    provinceSelect,
    "ab"
  );

  const layerSelect =
    screen.getByLabelText(
      "Statistical layer"
    );

  await user.selectOptions(
    layerSelect,
    "pollingDistricts"
  );

  expect(
    layerSelect
  ).toHaveValue(
    "pollingDistricts"
  );

  expect(
    screen.getByTestId("map")
  ).toHaveAttribute(
    "data-province",
    "ab"
  );

  expect(
    screen.getByTestId("map")
  ).toHaveAttribute(
    "data-boundary-layer",
    "pollingDistricts"
  );
});

test("resets the statistical layer when province changes", async () => {
  const user = userEvent.setup();

  await renderReadyProposalPage();

  const provinceSelect =
    screen.getByLabelText("Province");

  const layerSelect =
    screen.getByLabelText(
      "Statistical layer"
    );

  await user.selectOptions(
    provinceSelect,
    "ab"
  );

  await user.selectOptions(
    layerSelect,
    "pollingDistricts"
  );

  expect(
    layerSelect
  ).toHaveValue(
    "pollingDistricts"
  );

  await user.selectOptions(
    provinceSelect,
    "pe"
  );

  expect(
    provinceSelect
  ).toHaveValue("pe");

  expect(
    layerSelect
  ).toHaveValue("none");

  expect(
    screen.getByTestId("map")
  ).toHaveAttribute(
    "data-province",
    "pe"
  );

  expect(
    screen.getByTestId("map")
  ).toHaveAttribute(
    "data-boundary-layer",
    "none"
  );
});

test("closes the selected-region statistics card", async () => {
  const user = userEvent.setup();

  await renderReadyProposalPage();

  await user.click(
    screen.getByRole("button", {
      name: "Select mock region",
    })
  );

  expect(
    screen.getByRole("region", {
      name: "Selected region details",
    })
  ).toBeInTheDocument();

  await user.click(
    screen.getByRole("button", {
      name: "Close region details",
    })
  );

  expect(
    screen.queryByRole("region", {
      name: "Selected region details",
    })
  ).not.toBeInTheDocument();
});

test("clears selected-region details when province changes", async () => {
  const user = userEvent.setup();

  await renderReadyProposalPage();

  await user.click(
    screen.getByRole("button", {
      name: "Select mock region",
    })
  );

  expect(
    screen.getByRole("region", {
      name: "Selected region details",
    })
  ).toBeInTheDocument();

  await user.selectOptions(
    screen.getByLabelText("Province"),
    "ab"
  );

  expect(
    screen.queryByRole("region", {
      name: "Selected region details",
    })
  ).not.toBeInTheDocument();
});