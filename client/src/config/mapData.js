const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL
    ?.trim()
    .replace(/\/$/, "");

const MAP_DATA_BASE_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/storage/v1/object/public/map-data`
  : "/map-data";

export const FED_PROFILES_2011_URL =
  SUPABASE_URL
    ? `${MAP_DATA_BASE_URL}/profiles/fed-profiles-2011.json`
    : null;

/*
 * Statistics Canada province and territory identifiers.
 *
 * Each value matches one of the federal-riding GeoJSON files
 * uploaded to:
 *
 * map-data/federal/<PRUID>.json
 */
const FEDERAL_RIDING_PRUID_BY_PROVINCE = {
  nl: "10",
  pe: "11",
  ns: "12",
  nb: "13",
  qc: "24",
  on: "35",
  mb: "46",
  sk: "47",
  ab: "48",
  bc: "59",
  yt: "60",
  nt: "61",
  nu: "62",
};

/*
 * Provinces and territories whose polling-district GeoJSON
 * files were successfully uploaded.
 *
 * Ontario and Quebec are intentionally excluded because their
 * polling-district files are currently too large for the
 * Supabase upload limit.
 *
 * Federal-riding files remain available for Ontario and Quebec.
 */
const POLLING_DISTRICT_PROVINCES = new Set([
  "ab",
  "bc",
  "mb",
  "nb",
  "nl",
  "ns",
  "nt",
  "nu",
  "pe",
  "sk",
  "yt",
]);

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

  nt: {
    label: "Northwest Territories",
    center: [-114.4, 62.5],
    zoom: 4,
    hasDesignatedPlaces: true,
  },

  nu: {
    label: "Nunavut",
    center: [-96.0, 64.3],
    zoom: 3,
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

  yt: {
    label: "Yukon",
    center: [-135.0, 64.3],
    zoom: 5,
    hasDesignatedPlaces: true,
  },
};

function mapDataUrl(provinceCode, filename) {
  return (
    `${MAP_DATA_BASE_URL}/${provinceCode}/` +
    filename
  );
}

function federalRidingsUrl(provinceCode) {
  const pruid =
    FEDERAL_RIDING_PRUID_BY_PROVINCE[
      provinceCode
    ];

  return pruid
    ? `${MAP_DATA_BASE_URL}/federal/${pruid}.json`
    : null;
}

export const PROVINCE_MAP_DATA =
  Object.fromEntries(
    Object.entries(PROVINCES).map(
      ([provinceCode, province]) => {
        const hasPollingDistricts =
          POLLING_DISTRICT_PROVINCES.has(
            provinceCode
          );

        return [
          provinceCode,
          {
            label: province.label,
            center: province.center,
            zoom: province.zoom,

            populationCentres: mapDataUrl(
              provinceCode,
              `${provinceCode}_population_centres.geojson`
            ),

            designatedPlaces:
              province.hasDesignatedPlaces
                ? mapDataUrl(
                    provinceCode,
                    `${provinceCode}_designated_places.geojson`
                  )
                : null,

            pollingDistricts:
              hasPollingDistricts
                ? mapDataUrl(
                    provinceCode,
                    `fed2021_${provinceCode}_polling_districts.geojson`
                  )
                : null,

            federalDistricts:
              federalRidingsUrl(
                provinceCode
              ),
          },
        ];
      }
    )
  );