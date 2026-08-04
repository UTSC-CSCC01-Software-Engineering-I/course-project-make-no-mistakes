import {
    useEffect,
    useRef,
    forwardRef,
    useImperativeHandle,
} from "react";

import maplibregl from "maplibre-gl";

import {
    MaplibreTerradrawControl,
    getDefaultModeOptions,
} from "@watergis/maplibre-gl-terradraw";

import "@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.css";

import "maplibre-gl/dist/maplibre-gl.css";
import "./Map.css";

import {
    PROVINCE_MAP_DATA,
    FED_PROFILES_2011_URL,
} from "../config/mapData";

const MODE_SETTINGS = {
    view: {
        className: "mapContainerView",
        interactive: true,
    },

    objection: {
        className: "mapContainerObjection",
        interactive: true,
    },

    counterproposal: {
        className: "mapContainerCounterproposal",
        interactive: true,
    },
};

const DEFAULT_CENTER = [-79.3832, 43.6532];
const DEFAULT_ZOOM = 6;

const OPEN_STREET_MAP_STYLE = {
    version: 8,

    sources: {
        osm: {
            type: "raster",

            tiles: [
                "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
                "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
                "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],

            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
        },
    },

    layers: [
        {
            id: "osm",
            type: "raster",
            source: "osm",
        },
    ],
};

function getBoundaryLayerConfig(province) {
    const provinceData =
        PROVINCE_MAP_DATA[province];

    return {
        populationCentres:
            provinceData?.populationCentres
                ? {
                      sourceId:
                          `${province}-population-centres`,

                      fillLayerId:
                          `${province}-population-centres-fill`,

                      outlineLayerId:
                          `${province}-population-centres-outline`,

                      dataUrl:
                          provinceData.populationCentres,

                      idProperty: "DGUID",
                      nameProperty: "PCNAME",

                      classificationProperty:
                          "PCCLASS",

                      typeProperty: "PCTYPE",

                      geographyLabel:
                          "Population centre",

                      identifierLabel: "DGUID",

                      fillColor: "#2563eb",
                      outlineColor: "#1d4ed8",
                      fillOpacity: 0.3,
                      lineWidth: 2,
                  }
                : null,

        designatedPlaces:
            provinceData?.designatedPlaces
                ? {
                      sourceId:
                          `${province}-designated-places`,

                      fillLayerId:
                          `${province}-designated-places-fill`,

                      outlineLayerId:
                          `${province}-designated-places-outline`,

                      dataUrl:
                          provinceData.designatedPlaces,

                      idProperty: "DGUID",
                      nameProperty: "DPLNAME",

                      classificationProperty:
                          "DPLTYPE",

                      typeProperty: "DPLTYPE",

                      geographyLabel:
                          "Designated place",

                      identifierLabel: "DGUID",

                      fillColor: "#16a34a",
                      outlineColor: "#15803d",
                      fillOpacity: 0.3,
                      lineWidth: 2,
                  }
                : null,

        pollingDistricts:
            provinceData?.pollingDistricts
                ? {
                      sourceId:
                          `${province}-polling-districts`,

                      fillLayerId:
                          `${province}-polling-districts-fill`,

                      outlineLayerId:
                          `${province}-polling-districts-outline`,

                      dataUrl:
                          provinceData.pollingDistricts,

                      idProperty: "pd_id",
                      nameProperty: "ed_name",

                      classificationProperty:
                          "ed_name",

                      typeProperty: "PD_NUM",

                      geographyLabel:
                          "Federal polling district",

                      identifierLabel:
                          "Polling district ID",

                      fillColor: "#9333ea",
                      outlineColor: "#6b21a8",
                      fillOpacity: 0.06,
                      lineWidth: 0.6,
                  }
                : null,

        federalDistricts:
            provinceData?.federalDistricts
                ? {
                      sourceId:
                          `${province}-federal-districts`,

                      fillLayerId:
                          `${province}-federal-districts-fill`,

                      outlineLayerId:
                          `${province}-federal-districts-outline`,

                      dataUrl:
                          provinceData.federalDistricts,

                      idProperty: "FEDUID",
                      nameProperty: "FEDNAME",

                      classificationProperty:
                          "PRUID",

                      typeProperty: "FEDUID",

                      geographyLabel:
                          "Federal electoral district",

                      identifierLabel:
                          "Federal district code",

                      fillColor: "#dc2626",
                      outlineColor: "#991b1b",
                      fillOpacity: 0.12,
                      lineWidth: 1.5,
                  }
                : null,
    };
}

function hideAllBoundaryLayers(map) {
    const styleLayers =
        map.getStyle()?.layers ?? [];

    styleLayers
        .filter(
            (layer) =>
                layer.metadata
                    ?.statisticalBoundaryLayer ===
                true
        )
        .forEach((layer) => {
            map.setLayoutProperty(
                layer.id,
                "visibility",
                "none"
            );
        });
}

function ensureBoundaryLayer(
    map,
    province,
    boundaryKey
) {
    const config =
        getBoundaryLayerConfig(province)[
            boundaryKey
        ];

    if (!config?.dataUrl) {
        console.warn(
            `[BOUNDARY] ${boundaryKey} is unavailable for ${province}`
        );

        return null;
    }

    if (!map.getSource(config.sourceId)) {
        console.log(
            `[BOUNDARY] Loading ${boundaryKey} for ${province} from:`,
            config.dataUrl
        );

        map.addSource(config.sourceId, {
            type: "geojson",
            data: config.dataUrl,

            /*
             * promoteId allows MapLibre feature-state to
             * highlight selected polygons.
             */
            promoteId: config.idProperty,

            maxzoom: 14,
            buffer: 32,
        });
    }

    if (!map.getLayer(config.fillLayerId)) {
        map.addLayer({
            id: config.fillLayerId,
            type: "fill",
            source: config.sourceId,

            metadata: {
                statisticalBoundaryLayer: true,
            },

            layout: {
                visibility: "none",
            },

            paint: {
                "fill-color": [
                    "case",

                    [
                        "boolean",
                        [
                            "feature-state",
                            "selected",
                        ],
                        false,
                    ],

                    "#f59e0b",
                    config.fillColor,
                ],

                "fill-opacity": [
                    "case",

                    [
                        "boolean",
                        [
                            "feature-state",
                            "selected",
                        ],
                        false,
                    ],

                    0.45,
                    config.fillOpacity,
                ],
            },
        });
    }

    if (!map.getLayer(config.outlineLayerId)) {
        map.addLayer({
            id: config.outlineLayerId,
            type: "line",
            source: config.sourceId,

            metadata: {
                statisticalBoundaryLayer: true,
            },

            layout: {
                visibility: "none",
            },

            paint: {
                "line-color": [
                    "case",

                    [
                        "boolean",
                        [
                            "feature-state",
                            "selected",
                        ],
                        false,
                    ],

                    "#b45309",
                    config.outlineColor,
                ],

                "line-width": [
                    "case",

                    [
                        "boolean",
                        [
                            "feature-state",
                            "selected",
                        ],
                        false,
                    ],

                    3,
                    config.lineWidth,
                ],
            },
        });
    }

    return config;
}

function updateBoundaryVisibility(
    map,
    province,
    activeBoundaryLayer
) {
    hideAllBoundaryLayers(map);

    if (activeBoundaryLayer === "none") {
        console.log(
            "[BOUNDARY] All statistical layers hidden"
        );

        return;
    }

    const activeConfig =
        ensureBoundaryLayer(
            map,
            province,
            activeBoundaryLayer
        );

    if (!activeConfig) {
        return;
    }

    if (
        map.getLayer(
            activeConfig.fillLayerId
        )
    ) {
        map.setLayoutProperty(
            activeConfig.fillLayerId,
            "visibility",
            "visible"
        );
    }

    if (
        map.getLayer(
            activeConfig.outlineLayerId
        )
    ) {
        map.setLayoutProperty(
            activeConfig.outlineLayerId,
            "visibility",
            "visible"
        );
    }

    console.log(
        `[BOUNDARY] Showing ${activeBoundaryLayer} for ${province}`
    );
}

function formatCount(value) {
    if (
        value == null ||
        value === ""
    ) {
        return "";
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? number.toLocaleString("en-CA")
        : "";
}

function formatProfileNumber(value) {
    if (
        value == null ||
        value === ""
    ) {
        return "";
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? number.toLocaleString(
              "en-CA",
              {
                  maximumFractionDigits: 1,
              }
          )
        : "";
}

function formatProfilePercent(value) {
    const formattedValue =
        formatProfileNumber(value);

    return formattedValue
        ? `${formattedValue}%`
        : "";
}

function formatProfileCurrency(value) {
    if (
        value == null ||
        value === ""
    ) {
        return "";
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? new Intl.NumberFormat(
              "en-CA",
              {
                  style: "currency",
                  currency: "CAD",
                  maximumFractionDigits: 0,
              }
          ).format(number)
        : "";
}

function normalizeFederalDistrictCode(
    value
) {
    if (
        value == null ||
        value === ""
    ) {
        return null;
    }

    const text =
        String(value).trim();

    /*
     * A federal electoral district code is
     * normally five digits.
     */
    const exactCode =
        text.match(
            /(?:^|\D)(\d{5})(?:\D|$)/
        );

    if (exactCode) {
        return exactCode[1];
    }

    /*
     * Some converted polling-district IDs
     * begin with the five-digit riding code.
     */
    const leadingCode =
        text.match(/^(\d{5})/);

    if (leadingCode) {
        return leadingCode[1];
    }

    /*
     * Handle a numeric code that may have
     * lost leading zeroes.
     */
    if (/^\d{1,5}$/.test(text)) {
        return text.padStart(5, "0");
    }

    return null;
}

function getFederalDistrictCode(
    properties
) {
    const directCandidates = [
        properties.FEDUID,
        properties.FED_NUM,
        properties.FED_ID,
        properties.ED_ID,
        properties.ED_NUM,

        properties.feduid,
        properties.fed_num,
        properties.fed_id,
        properties.ed_id,
        properties.ed_num,
    ];

    for (
        const candidate of
        directCandidates
    ) {
        const code =
            normalizeFederalDistrictCode(
                candidate
            );

        if (code) {
            return code;
        }
    }

    /*
     * The converted polling-district data
     * currently uses pd_id. Its first five
     * digits may identify the containing
     * federal electoral district.
     */
    return normalizeFederalDistrictCode(
        properties.pd_id ??
        properties.PD_ID
    );
}

function normalizeDistrictName(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /[^a-zA-Z0-9]+/g,
            " "
        )
        .trim()
        .toLowerCase();
}

function findFederalProfile(
    profiles,
    properties,
    provinceLabel
) {
    const code =
        getFederalDistrictCode(
            properties
        );

    /*
     * Code matching is the preferred method.
     */
    if (
        code &&
        profiles[code]
    ) {
        return {
            code,
            profile: profiles[code],
            matchedBy: "code",
        };
    }

    /*
     * Name matching is a fallback in case
     * a GeoJSON feature has no usable code.
     */
    const districtName =
        normalizeDistrictName(
            properties.ed_name ??
            properties.ED_NAME ??
            properties.FEDNAME ??
            properties.FEDENAME ??
            properties.FEDFNAME
        );

    const normalizedProvince =
        normalizeDistrictName(
            provinceLabel
        );

    if (!districtName) {
        return {
            code,
            profile: null,
            matchedBy: null,
        };
    }

    const profile =
        Object.values(
            profiles
        ).find((candidate) => {
            const sameName =
                normalizeDistrictName(
                    candidate?.name
                ) === districtName;

            const sameProvince =
                !normalizedProvince ||
                normalizeDistrictName(
                    candidate?.province
                ) ===
                    normalizedProvince;

            return (
                sameName &&
                sameProvince
            );
        }) ?? null;

    return {
        code:
            profile?.geoCode ??
            code,

        profile,

        matchedBy:
            profile
                ? "name"
                : null,
    };
}

function getDistanceInMeters(
    coord1,
    coord2
) {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;

    const R = 6371e3;

    const φ1 =
        lat1 *
        Math.PI /
        180;

    const φ2 =
        lat2 *
        Math.PI /
        180;

    const Δφ =
        (lat2 - lat1) *
        Math.PI /
        180;

    const Δλ =
        (lon2 - lon1) *
        Math.PI /
        180;

    const a =
        Math.sin(Δφ / 2) *
            Math.sin(Δφ / 2) +
        Math.cos(φ1) *
            Math.cos(φ2) *
            Math.sin(Δλ / 2) *
            Math.sin(Δλ / 2);

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;
}

const Map = forwardRef(
    (
        {
            mode = "view",
            center,
            zoom,
            onMapClick,
            onDrawChange,
            province = "on",
            boundaryLayer = "none",
            onRegionSelect,
            multiSelectRegions = false,
            initialDrawMode = "select",
        },
        ref
    ) => {
        const mapContainer =
            useRef(null);

        const mapRef =
            useRef(null);

        const drawControlRef =
            useRef(null);

        const selectionMarkerRef =
            useRef(null);

        const federalProfilesRef =
            useRef({});

        const modeSettings =
            MODE_SETTINGS[mode] ||
            MODE_SETTINGS.view;

        const initialProvinceData =
            PROVINCE_MAP_DATA[
                province
            ];

        const initialCenter =
            center ??
            initialProvinceData
                ?.center ??
            DEFAULT_CENTER;

        const initialZoom =
            zoom ??
            initialProvinceData
                ?.zoom ??
            DEFAULT_ZOOM;

        const onDrawChangeRef =
            useRef(onDrawChange);

        const provinceRef =
            useRef(province);

        const boundaryLayerRef =
            useRef(boundaryLayer);

        const multiSelectRegionsRef =
            useRef(multiSelectRegions);

        /*
         * Selection key -> {
         *   featureReference,
         *   region,
         * }
         *
         * A Map is used so several federal
         * ridings can remain highlighted.
         */
        const selectedRegionsRef =
            useRef(new globalThis.Map());

        const onRegionSelectRef =
            useRef(onRegionSelect);

        useEffect(() => {
            onDrawChangeRef.current =
                onDrawChange;
        }, [onDrawChange]);

        useEffect(() => {
            provinceRef.current =
                province;
        }, [province]);

        useEffect(() => {
            boundaryLayerRef.current =
                boundaryLayer;
        }, [boundaryLayer]);

        useEffect(() => {
            multiSelectRegionsRef.current =
                multiSelectRegions;
        }, [multiSelectRegions]);

        useEffect(() => {
            onRegionSelectRef.current =
                onRegionSelect;
        }, [onRegionSelect]);

        /*
         * Load federal Census/NHS profiles
         * from Supabase once.
         */
        useEffect(() => {
            let cancelled = false;

            async function loadFederalProfiles() {
                if (
                    !FED_PROFILES_2011_URL
                ) {
                    console.error(
                        "[FED PROFILE] VITE_SUPABASE_URL is not configured"
                    );

                    return;
                }

                try {
                    const response =
                        await fetch(
                            FED_PROFILES_2011_URL
                        );

                    if (!response.ok) {
                        throw new Error(
                            `HTTP ${response.status}: ${response.statusText}`
                        );
                    }

                    const profiles =
                        await response.json();

                    if (!cancelled) {
                        federalProfilesRef.current =
                            profiles;

                        console.log(
                            "[FED PROFILE] Loaded profiles:",
                            Object.keys(
                                profiles
                            ).length
                        );
                    }
                } catch (error) {
                    console.error(
                        "[FED PROFILE] Failed to load profiles:",
                        error
                    );
                }
            }

            loadFederalProfiles();

            return () => {
                cancelled = true;
            };
        }, []);

        function getRegionSelectionKey(
            source,
            id
        ) {
            return `${source}:${String(id)}`;
        }

        function notifySelectedRegions() {
            const selectedRegions =
                Array.from(
                    selectedRegionsRef.current
                        .values()
                ).map(
                    (entry) => entry.region
                );

            if (
                multiSelectRegionsRef.current
            ) {
                onRegionSelectRef.current?.(
                    selectedRegions
                );
            } else {
                onRegionSelectRef.current?.(
                    selectedRegions[0] ??
                        null
                );
            }
        }

        function clearSelectedRegion() {
            const map =
                mapRef.current;

            selectedRegionsRef.current
                .forEach(
                    ({ featureReference }) => {
                        if (
                            map &&
                            map.getSource(
                                featureReference
                                    .source
                            )
                        ) {
                            map.setFeatureState(
                                featureReference,
                                {
                                    selected:
                                        false,
                                }
                            );
                        }
                    }
                );

            selectedRegionsRef.current
                .clear();

            notifySelectedRegions();
        }

        function deselectRegion(region) {
            const source =
                region?.sourceId;

            const id =
                region?.id;

            if (
                !source ||
                id == null
            ) {
                return;
            }

            const selectionKey =
                getRegionSelectionKey(
                    source,
                    id
                );

            const selectedEntry =
                selectedRegionsRef.current
                    .get(selectionKey);

            if (!selectedEntry) {
                return;
            }

            const map =
                mapRef.current;

            if (
                map &&
                map.getSource(source)
            ) {
                map.setFeatureState(
                    selectedEntry
                        .featureReference,
                    {
                        selected: false,
                    }
                );
            }

            selectedRegionsRef.current
                .delete(selectionKey);

            notifySelectedRegions();
        }

        useImperativeHandle(
            ref,
            () => ({
                simplifyDrawing: () => {
                    const terraDraw =
                        drawControlRef.current
                            ?.getTerraDrawInstance();

                    if (!terraDraw) {
                        return;
                    }

                    const snapshot =
                        terraDraw.getSnapshot();

                    const DISTANCE_THRESHOLD =
                        300;

                    const GAP_SNAP_THRESHOLD =
                        3000;

                    const BORDER_ALIGN_THRESHOLD =
                        40;

                    const anchorVertices =
                        [];

                    snapshot.forEach(
                        (feature) => {
                            if (
                                feature.geometry
                                    .type ===
                                "LineString"
                            ) {
                                feature.geometry.coordinates
                                    .forEach(
                                        (
                                            coordinate
                                        ) => {
                                            anchorVertices.push(
                                                {
                                                    coord:
                                                        coordinate,

                                                    parentId:
                                                        feature.id,
                                                }
                                            );
                                        }
                                    );
                            } else if (
                                feature.geometry
                                    .type ===
                                "Polygon"
                            ) {
                                feature.geometry.coordinates
                                    .forEach(
                                        (ring) => {
                                            ring.forEach(
                                                (
                                                    coordinate
                                                ) => {
                                                    anchorVertices.push(
                                                        {
                                                            coord:
                                                                coordinate,

                                                            parentId:
                                                                feature.id,
                                                        }
                                                    );
                                                }
                                            );
                                        }
                                    );
                            }
                        }
                    );

                    function getSnappedNeighborCoord(
                        currentCoord,
                        currentFeatureId
                    ) {
                        let bestCoord =
                            currentCoord;

                        let closestDistance =
                            BORDER_ALIGN_THRESHOLD;

                        anchorVertices.forEach(
                            ({
                                coord,
                                parentId,
                            }) => {
                                if (
                                    parentId ===
                                    currentFeatureId
                                ) {
                                    return;
                                }

                                const distance =
                                    getDistanceInMeters(
                                        currentCoord,
                                        coord
                                    );

                                if (
                                    distance <
                                    closestDistance
                                ) {
                                    closestDistance =
                                        distance;

                                    bestCoord =
                                        coord;
                                }
                            }
                        );

                        return bestCoord;
                    }

                    snapshot.forEach(
                        (feature) => {
                            let simplifiedCoordinates =
                                null;

                            let newType =
                                feature.geometry
                                    .type;

                            if (
                                feature.geometry
                                    .type ===
                                "LineString"
                            ) {
                                const coordinates =
                                    feature.geometry
                                        .coordinates;

                                if (
                                    coordinates.length >
                                    2
                                ) {
                                    const newCoordinates =
                                        [
                                            getSnappedNeighborCoord(
                                                coordinates[0],
                                                feature.id
                                            ),
                                        ];

                                    for (
                                        let i = 1;
                                        i <
                                        coordinates.length -
                                            1;
                                        i += 1
                                    ) {
                                        const lastAddedPoint =
                                            newCoordinates[
                                                newCoordinates.length -
                                                    1
                                            ];

                                        const currentPoint =
                                            getSnappedNeighborCoord(
                                                coordinates[
                                                    i
                                                ],
                                                feature.id
                                            );

                                        if (
                                            getDistanceInMeters(
                                                lastAddedPoint,
                                                currentPoint
                                            ) >=
                                            DISTANCE_THRESHOLD
                                        ) {
                                            newCoordinates.push(
                                                currentPoint
                                            );
                                        }
                                    }

                                    newCoordinates.push(
                                        getSnappedNeighborCoord(
                                            coordinates[
                                                coordinates.length -
                                                    1
                                            ],
                                            feature.id
                                        )
                                    );

                                    const firstPoint =
                                        newCoordinates[
                                            0
                                        ];

                                    const lastPoint =
                                        newCoordinates[
                                            newCoordinates.length -
                                                1
                                        ];

                                    if (
                                        getDistanceInMeters(
                                            firstPoint,
                                            lastPoint
                                        ) <=
                                        GAP_SNAP_THRESHOLD
                                    ) {
                                        newCoordinates[
                                            newCoordinates.length -
                                                1
                                        ] = [
                                            firstPoint[0],
                                            firstPoint[1],
                                        ];

                                        newType =
                                            "Polygon";

                                        simplifiedCoordinates =
                                            [
                                                newCoordinates,
                                            ];
                                    } else {
                                        simplifiedCoordinates =
                                            newCoordinates;
                                    }
                                }
                            } else if (
                                feature.geometry
                                    .type ===
                                "Polygon"
                            ) {
                                const rings =
                                    feature.geometry
                                        .coordinates;

                                const newRings =
                                    [];

                                rings.forEach(
                                    (ring) => {
                                        const newRingCoordinates =
                                            [
                                                getSnappedNeighborCoord(
                                                    ring[0],
                                                    feature.id
                                                ),
                                            ];

                                        for (
                                            let i = 1;
                                            i <
                                            ring.length -
                                                1;
                                            i += 1
                                        ) {
                                            const lastAddedPoint =
                                                newRingCoordinates[
                                                    newRingCoordinates.length -
                                                        1
                                                ];

                                            const currentPoint =
                                                getSnappedNeighborCoord(
                                                    ring[
                                                        i
                                                    ],
                                                    feature.id
                                                );

                                            if (
                                                getDistanceInMeters(
                                                    lastAddedPoint,
                                                    currentPoint
                                                ) >=
                                                DISTANCE_THRESHOLD
                                            ) {
                                                newRingCoordinates.push(
                                                    currentPoint
                                                );
                                            }
                                        }

                                        newRingCoordinates.push(
                                            [
                                                newRingCoordinates[
                                                    0
                                                ][0],

                                                newRingCoordinates[
                                                    0
                                                ][1],
                                            ]
                                        );

                                        newRings.push(
                                            newRingCoordinates
                                        );
                                    }
                                );

                                simplifiedCoordinates =
                                    newRings;
                            }

                            if (
                                !simplifiedCoordinates
                            ) {
                                return;
                            }

                            if (
                                newType ===
                                feature.geometry.type
                            ) {
                                terraDraw.updateFeatureGeometry(
                                    feature.id,
                                    {
                                        type:
                                            newType,

                                        coordinates:
                                            simplifiedCoordinates,
                                    }
                                );
                            } else {
                                /*
                                 * When changing LineString
                                 * into Polygon, remove and
                                 * re-add only that feature.
                                 */
                                terraDraw.removeFeatures(
                                    [
                                        feature.id,
                                    ]
                                );

                                terraDraw.addFeatures(
                                    [
                                        {
                                            type:
                                                "Feature",

                                            id:
                                                feature.id,

                                            geometry:
                                                {
                                                    type:
                                                        newType,

                                                    coordinates:
                                                        simplifiedCoordinates,
                                                },

                                            properties:
                                                {
                                                    ...feature.properties,

                                                    mode:
                                                        "polygon",
                                                },
                                        },
                                    ]
                                );
                            }
                        }
                    );

                    if (
                        onDrawChangeRef.current
                    ) {
                        onDrawChangeRef.current(
                            {
                                type:
                                    "FeatureCollection",

                                features:
                                    terraDraw.getSnapshot(),
                            }
                        );
                    }
                },

                clearSelectedRegion:
                    () => {
                        clearSelectedRegion();
                    },

                deselectRegion:
                    (region) => {
                        deselectRegion(region);
                    },
            })
        );

        /*
         * Create the MapLibre map.
         */
        useEffect(() => {
            const map =
                new maplibregl.Map({
                    container:
                        mapContainer.current,

                    style:
                        OPEN_STREET_MAP_STYLE,

                    center:
                        initialCenter,

                    zoom:
                        initialZoom,

                    interactive:
                        modeSettings.interactive,
                });

            mapRef.current = map;

            map.addControl(
                new maplibregl.NavigationControl(),
                "top-right"
            );

            const modeOptions =
                getDefaultModeOptions();

            if (
                modeOptions.polygon
            ) {
                modeOptions.polygon.snapping =
                    {
                        toCoordinate: true,
                        toLine: true,
                    };
            }

            if (
                modeOptions.linestring
            ) {
                modeOptions.linestring.snapping =
                    {
                        toCoordinate: true,
                        toLine: true,
                    };
            }

            const drawControl =
                new MaplibreTerradrawControl(
                    {
                        modes: [
                            "linestring",
                            "polygon",
                            "select",
                            "delete-selection",
                            "delete",
                            "undo",
                            "redo",
                        ],

                        open: true,

                        modeOptions,
                    }
                );

            drawControlRef.current =
                drawControl;

            map.addControl(
                drawControl,
                "top-left"
            );

            map.once(
                "load",
                () => {
                    updateBoundaryVisibility(
                        map,
                        provinceRef.current,
                        boundaryLayerRef.current
                    );

                    const terraDraw =
                        drawControl
                            .getTerraDrawInstance();

                    if (terraDraw) {
                        /*
                         * Start in map-selection mode rather
                         * than immediately drawing a line or
                         * polygon.
                         */
                        if (
                            initialDrawMode &&
                            terraDraw.getMode() !==
                                initialDrawMode
                        ) {
                            terraDraw.setMode(
                                initialDrawMode
                            );
                        }

                        terraDraw.on(
                            "change",
                            () => {
                                if (
                                    onDrawChangeRef.current
                                ) {
                                    onDrawChangeRef.current(
                                        {
                                            type:
                                                "FeatureCollection",

                                            features:
                                                terraDraw.getSnapshot(),
                                        }
                                    );
                                }
                            }
                        );
                    }
                }
            );

            function handleMapError(
                event
            ) {
                console.error(
                    "[MAP ERROR]",
                    event?.error ||
                        event
                );
            }

            map.on(
                "error",
                handleMapError
            );

            return () => {
                map.off(
                    "error",
                    handleMapError
                );

                selectionMarkerRef.current
                    ?.remove();

                map.remove();
            };
        }, []);

        /*
         * Move to the selected province.
         */
        useEffect(() => {
            const map =
                mapRef.current;

            if (
                !map ||
                !map.isStyleLoaded()
            ) {
                return;
            }

            const provinceData =
                PROVINCE_MAP_DATA[
                    province
                ];

            map.easeTo({
                center:
                    center ??
                    provinceData
                        ?.center ??
                    DEFAULT_CENTER,

                zoom:
                    zoom ??
                    provinceData
                        ?.zoom ??
                    DEFAULT_ZOOM,

                duration: 500,
            });
        }, [
            province,
            center,
            zoom,
        ]);

        /*
         * Show the selected statistical layer.
         */
        useEffect(() => {
            const map =
                mapRef.current;

            if (
                !map ||
                !map.isStyleLoaded()
            ) {
                return;
            }

            clearSelectedRegion();

            updateBoundaryVisibility(
                map,
                province,
                boundaryLayer
            );
        }, [
            province,
            boundaryLayer,
        ]);

        /*
         * Select a statistical region when
         * the user clicks the map.
         */
        useEffect(() => {
            const map =
                mapRef.current;

            if (!map) {
                return undefined;
            }

            function handleClick(event) {
                /*
                 * In drawing modes, only let
                 * region inspection happen
                 * while TerraDraw is using
                 * Select or Render mode.
                 */
                if (
                    mode !== "view" &&
                    drawControlRef.current
                ) {
                    const terraDraw =
                        drawControlRef.current
                            .getTerraDrawInstance();

                    if (terraDraw) {
                        const drawMode =
                            terraDraw.getMode();

                        if (
                            drawMode !==
                                "select" &&
                            drawMode !==
                                "render"
                        ) {
                            return;
                        }

                        const snapshot =
                            terraDraw.getSnapshot();

                        if (
                            snapshot.some(
                                (feature) =>
                                    feature
                                        .properties
                                        .selected ===
                                    true
                            )
                        ) {
                            return;
                        }
                    }
                }

                const activeBoundaryKey =
                    boundaryLayerRef.current;

                if (
                    activeBoundaryKey !==
                    "none"
                ) {
                    const activeProvince =
                        provinceRef.current;

                    const config =
                        getBoundaryLayerConfig(
                            activeProvince
                        )[
                            activeBoundaryKey
                        ];

                    if (
                        config &&
                        map.getLayer(
                            config.fillLayerId
                        )
                    ) {
                        const features =
                            map.queryRenderedFeatures(
                                event.point,
                                {
                                    layers: [
                                        config.fillLayerId,
                                    ],
                                }
                            );

                        const feature =
                            features[0];

                        if (!feature) {
                            /*
                             * In multi-select mode, clicking
                             * outside a riding should not
                             * erase the current selection.
                             */
                            if (
                                !multiSelectRegionsRef
                                    .current
                            ) {
                                clearSelectedRegion();
                            }

                            return;
                        }

                        const properties =
                            feature.properties ??
                            {};

                        const isPollingDistrict =
                            activeBoundaryKey ===
                            "pollingDistricts";

                        const isFederalDistrict =
                            activeBoundaryKey ===
                            "federalDistricts";

                        const provinceData =
                            PROVINCE_MAP_DATA[
                                provinceRef.current
                            ];

                        const profileMatch =
                            isPollingDistrict ||
                            isFederalDistrict
                                ? findFederalProfile(
                                      federalProfilesRef.current,
                                      properties,
                                      provinceData
                                          ?.label ??
                                          ""
                                  )
                                : {
                                      code:
                                          null,

                                      profile:
                                          null,

                                      matchedBy:
                                          null,
                                  };

                        const federalDistrictCode =
                            profileMatch.code;

                        const federalProfile =
                            profileMatch.profile;

                        console.log(
                            "[FED PROFILE] Match result:",
                            {
                                federalDistrictCode,

                                matchedBy:
                                    profileMatch.matchedBy,

                                federalProfile,

                                featureProperties:
                                    properties,
                            }
                        );

                        const featureId =
                            feature.id ??
                            properties[
                                config.idProperty
                            ];

                        if (
                            featureId == null
                        ) {
                            console.warn(
                                "[BOUNDARY] Selected feature has no usable ID",
                                properties
                            );

                            if (
                                !multiSelectRegionsRef
                                    .current
                            ) {
                                clearSelectedRegion();
                            }

                            return;
                        }

                        const featureReference =
                            {
                                source:
                                    config.sourceId,

                                id:
                                    featureId,
                            };

                        const landArea =
                            Number(
                                properties.LANDAREA
                            );

                        const pollingDistrictNumber =
                            properties.PD_NUM ??
                            "";

                        const electoralDistrictName =
                            properties.ed_name ??
                            "";

                        const pollingDistrictName =
                            [
                                electoralDistrictName,

                                pollingDistrictNumber !==
                                ""
                                    ? `Poll ${pollingDistrictNumber}`
                                    : "",
                            ]
                                .filter(Boolean)
                                .join(" — ");

                        const pollingDistrictDetails =
                            isPollingDistrict
                                ? [
                                      {
                                          label:
                                              "Estimated electors",

                                          value:
                                              formatCount(
                                                  properties.electors_est
                                              ),
                                      },

                                      {
                                          label:
                                              "Total votes",

                                          value:
                                              formatCount(
                                                  properties.total_votes
                                              ),
                                      },
                                  ]
                                : [];

                        const federalProfileDetails =
                            federalProfile
                                ? [
                                      {
                                          label:
                                              "2011 federal riding",

                                          value:
                                              federalProfile.name ??
                                              electoralDistrictName,
                                      },

                                      {
                                          label:
                                              "Federal district code",

                                          value:
                                              federalProfile.geoCode ??
                                              federalDistrictCode,
                                      },

                                      {
                                          label:
                                              "2011 riding population",

                                          value:
                                              formatProfileNumber(
                                                  federalProfile.population
                                              ),
                                      },

                                      {
                                          label:
                                              "Median age",

                                          value:
                                              formatProfileNumber(
                                                  federalProfile.medianAge
                                              ),
                                      },

                                      {
                                          label:
                                              "Employment rate",

                                          value:
                                              formatProfilePercent(
                                                  federalProfile.employmentRate
                                              ),
                                      },

                                      {
                                          label:
                                              "Unemployment rate",

                                          value:
                                              formatProfilePercent(
                                                  federalProfile.unemploymentRate
                                              ),
                                      },

                                      {
                                          label:
                                              "Median individual income",

                                          value:
                                              formatProfileCurrency(
                                                  federalProfile.medianIndividualIncome
                                              ),
                                      },

                                      {
                                          label:
                                              "Median household income",

                                          value:
                                              formatProfileCurrency(
                                                  federalProfile.medianHouseholdIncome
                                              ),
                                      },

                                      {
                                          label:
                                              "Immigrant population",

                                          value:
                                              formatProfileNumber(
                                                  federalProfile.immigrantPopulation
                                              ),
                                      },

                                      {
                                          label:
                                              "Visible minority population",

                                          value:
                                              formatProfileNumber(
                                                  federalProfile.visibleMinorityPopulation
                                              ),
                                      },

                                      {
                                          label:
                                              "Bachelor's degree or above",

                                          value:
                                              formatProfileNumber(
                                                  federalProfile.bachelorOrAbove
                                              ),
                                      },

                                      {
                                          label:
                                              "NHS non-response rate",

                                          value:
                                              formatProfilePercent(
                                                  federalProfile.gnr
                                              ),
                                      },

                                      {
                                          label:
                                              "Statistics scope",

                                          value:
                                              isFederalDistrict
                                                  ? "Selected federal riding"
                                                  : "Entire federal riding, not only this polling district",
                                      },

                                      {
                                          label:
                                              "Statistics source",

                                          value:
                                              "2011 Census and 2011 National Household Survey",
                                      },
                                  ]
                                : (
                                      isPollingDistrict ||
                                      isFederalDistrict
                                  )
                                  ? [
                                        {
                                            label:
                                                "2011 riding profile",

                                            value:
                                                "No matching federal riding profile found",
                                        },
                                    ]
                                  : [];

                        const extraDetails =
                            [
                                ...pollingDistrictDetails,
                                ...federalProfileDetails,
                            ].filter(
                                (
                                    detail
                                ) =>
                                    detail.value !=
                                        null &&
                                    detail.value !==
                                        ""
                            );

                        const regionDetails =
                            {
                                id:
                                    featureId,

                                sourceId:
                                    config.sourceId,

                                provinceLabel:
                                    provinceData
                                        ?.label ??
                                    "",

                                geographyLabel:
                                    config.geographyLabel,

                                name:
                                    isPollingDistrict
                                        ? pollingDistrictName ||
                                          "Unknown polling district"
                                        : isFederalDistrict
                                          ? federalProfile
                                                ?.name ??
                                            properties.FEDNAME ??
                                            "Unknown federal riding"
                                          : properties[
                                                config.nameProperty
                                            ] ??
                                            "Unknown region",

                                identifierLabel:
                                    config.identifierLabel,

                                identifier:
                                    properties[
                                        config.idProperty
                                    ] ??
                                    featureId,

                                classificationLabel:
                                    isPollingDistrict
                                        ? "Electoral district"
                                        : isFederalDistrict
                                          ? "Province/territory code"
                                          : "Classification",

                                classification:
                                    isFederalDistrict
                                        ? properties.PRUID ??
                                          ""
                                        : properties[
                                              config.classificationProperty
                                          ] ??
                                          "",

                                typeLabel:
                                    isPollingDistrict
                                        ? "Polling district number"
                                        : isFederalDistrict
                                          ? "Boundary basis"
                                          : "Type",

                                regionType:
                                    isFederalDistrict
                                        ? "2013 Representation Order"
                                        : properties[
                                              config.typeProperty
                                          ] ??
                                          "",

                                landArea:
                                    Number.isFinite(
                                        landArea
                                    )
                                        ? landArea
                                        : null,

                                federalDistrictCode,
                                federalProfile,

                                profileSource:
                                    federalProfile !=
                                    null
                                        ? "2011 Census and 2011 National Household Survey"
                                        : null,

                                extraDetails,
                                properties,
                            };

                        const selectionKey =
                            getRegionSelectionKey(
                                config.sourceId,
                                featureId
                            );

                        const selectedRegions =
                            selectedRegionsRef.current;

                        if (
                            multiSelectRegionsRef.current
                        ) {
                            const existingSelection =
                                selectedRegions.get(
                                    selectionKey
                                );

                            if (existingSelection) {
                                map.setFeatureState(
                                    existingSelection
                                        .featureReference,
                                    {
                                        selected:
                                            false,
                                    }
                                );

                                selectedRegions.delete(
                                    selectionKey
                                );
                            } else {
                                map.setFeatureState(
                                    featureReference,
                                    {
                                        selected:
                                            true,
                                    }
                                );

                                selectedRegions.set(
                                    selectionKey,
                                    {
                                        featureReference,
                                        region:
                                            regionDetails,
                                    }
                                );
                            }
                        } else {
                            selectedRegions.forEach(
                                ({
                                    featureReference:
                                        previousFeature,
                                }) => {
                                    if (
                                        map.getSource(
                                            previousFeature
                                                .source
                                        )
                                    ) {
                                        map.setFeatureState(
                                            previousFeature,
                                            {
                                                selected:
                                                    false,
                                            }
                                        );
                                    }
                                }
                            );

                            selectedRegions.clear();

                            map.setFeatureState(
                                featureReference,
                                {
                                    selected: true,
                                }
                            );

                            selectedRegions.set(
                                selectionKey,
                                {
                                    featureReference,
                                    region:
                                        regionDetails,
                                }
                            );
                        }

                        notifySelectedRegions();

                        /*
                         * Record the point that was
                         * clicked without placing the
                         * normal standalone marker.
                         */
                        onMapClick?.({
                            lng:
                                Number(
                                    event.lngLat.lng
                                        .toFixed(5)
                                ),

                            lat:
                                Number(
                                    event.lngLat.lat
                                        .toFixed(5)
                                ),

                            mode,
                        });

                        /*
                         * The selected riding is already
                         * highlighted, so do not add the
                         * ordinary point marker.
                         */
                        return;
                    }
                }

                const selectedPoint = {
                    lng:
                        Number(
                            event.lngLat.lng.toFixed(
                                5
                            )
                        ),

                    lat:
                        Number(
                            event.lngLat.lat.toFixed(
                                5
                            )
                        ),

                    mode,
                };

                selectionMarkerRef.current
                    ?.remove();

                selectionMarkerRef.current =
                    new maplibregl.Marker({
                        color:
                            "#332445",
                    })
                        .setLngLat(
                            event.lngLat
                        )
                        .addTo(map);

                onMapClick?.(
                    selectedPoint
                );
            }

            map.on(
                "click",
                handleClick
            );

            return () => {
                map.off(
                    "click",
                    handleClick
                );
            };
        }, [
            mode,
            onMapClick,
        ]);

        return (
            <div
                ref={mapContainer}
                className={
                    `mapContainer ${modeSettings.className}`
                }
            />
        );
    }
);

Map.displayName = "Map";

export default Map;