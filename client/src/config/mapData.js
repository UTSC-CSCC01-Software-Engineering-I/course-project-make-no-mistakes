const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL
    ?.trim()
    .replace(/\/$/, "");

const MAP_DATA_BASE_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/storage/v1/object/public/map-data`
  : "/map-data";

const PROVINCES = {
  ab: {
    label: "Alberta",
    center: [-114.5, 53.5],
    zoom: 5,
    hasDesignatedPlaces: true,
  },

  bc: {
    label: "British Columbia",
    center: [-123.1, 49.8],
    zoom: 5,
    hasDesignatedPlaces: true,
  },

  mb: {
    label: "Manitoba",
    center: [-97.1, 49.9],
    zoom: 5,
    hasDesignatedPlaces: true,
  },

  nb: {
    label: "New Brunswick",
    center: [-66.5, 46.5],
    zoom: 6,
    hasDesignatedPlaces: true,
  },

  nl: {
    label: "Newfoundland and Labrador",
    center: [-56.1, 48.7],
    zoom: 5,
    hasDesignatedPlaces: true,
  },

  ns: {
    label: "Nova Scotia",
    center: [-63.6, 45.1],
    zoom: 6,
    hasDesignatedPlaces: true,
  },

  on: {
    label: "Ontario",
    center: [-79.3832, 43.6532],
    zoom: 6,
    hasDesignatedPlaces: true,
  },

  pe: {
    label: "Prince Edward Island",
    center: [-63.2, 46.4],
    zoom: 8,
    hasDesignatedPlaces: false,
  },

  qc: {
    label: "Quebec",
    center: [-71.2, 46.8],
    zoom: 5,
    hasDesignatedPlaces: true,
  },

  sk: {
    label: "Saskatchewan",
    center: [-106.7, 52.1],
    zoom: 5,
    hasDesignatedPlaces: true,
  },
};

export const PROVINCE_MAP_DATA =
  Object.fromEntries(
    Object.entries(PROVINCES).map(
      ([provinceCode, province]) => [
        provinceCode,
        {
          ...province,

          populationCentres:
            `${MAP_DATA_BASE_URL}/${provinceCode}/` +
            `${provinceCode}_population_centres.geojson`,

          designatedPlaces:
            province.hasDesignatedPlaces
              ? `${MAP_DATA_BASE_URL}/${provinceCode}/` +
                `${provinceCode}_designated_places.geojson`
              : null,
        },
      ]
    )
  );