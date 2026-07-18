import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
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

const DEFAULT_CENTER = [
    -79.3832,
    43.6532,
];

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

const BOUNDARY_LAYER_CONFIG =
    Object.fromEntries(
        Object.entries(
            PROVINCE_MAP_DATA
        ).map(
            ([
                provinceCode,
                provinceData,
            ]) => {
                const provinceConfig = {
                    populationCentres: {
                        sourceId:
                            `${provinceCode}-population-centres`,

                        fillLayerId:
                            `${provinceCode}-population-centres-fill`,

                        outlineLayerId:
                            `${provinceCode}-population-centres-outline`,

                        dataUrl:
                            provinceData.populationCentres,

                        nameProperty:
                            "PCNAME",

                        classificationProperty:
                            "PCCLASS",

                        typeProperty:
                            "PCTYPE",

                        geographyLabel:
                            "Population centre",

                        fillColor:
                            "#2563eb",

                        outlineColor:
                            "#1d4ed8",
                    },
                };

                if (
                    provinceData.designatedPlaces
                ) {
                    provinceConfig.designatedPlaces = {
                        sourceId:
                            `${provinceCode}-designated-places`,

                        fillLayerId:
                            `${provinceCode}-designated-places-fill`,

                        outlineLayerId:
                            `${provinceCode}-designated-places-outline`,

                        dataUrl:
                            provinceData.designatedPlaces,

                        nameProperty:
                            "DPLNAME",

                        classificationProperty:
                            "DPLTYPE",

                        typeProperty:
                            "DPLTYPE",

                        geographyLabel:
                            "Designated place",

                        fillColor:
                            "#16a34a",

                        outlineColor:
                            "#15803d",
                    };
                }

                return [
                    provinceCode,
                    provinceConfig,
                ];
            }
        )
    );

function getBoundaryConfig(
    province,
    boundaryLayer
) {
    return (
        BOUNDARY_LAYER_CONFIG[
            province
        ]?.[boundaryLayer] ??
        null
    );
}

function forEachBoundaryConfig(
    callback
) {
    Object.values(
        BOUNDARY_LAYER_CONFIG
    ).forEach(
        (provinceConfig) => {
            Object.values(
                provinceConfig
            ).forEach(
                callback
            );
        }
    );
}

async function ensureBoundaryLayer(
    map,
    province,
    boundaryKey
) {
    const config =
        getBoundaryConfig(
            province,
            boundaryKey
        );

    if (!config) {
        throw new Error(
            `Unknown boundary layer: ` +
            `${province}/${boundaryKey}`
        );
    }

    if (
        !map.getSource(
            config.sourceId
        )
    ) {
        console.log(
            `[BOUNDARY] Loading ` +
            `${province}/${boundaryKey} from:`,
            config.dataUrl
        );

        const response =
            await fetch(
                config.dataUrl,
                {
                    cache:
                        "no-store",
                }
            );

        console.log(
            `[BOUNDARY] ` +
            `${province}/${boundaryKey} response:`,
            response.status,
            response.statusText
        );

        if (!response.ok) {
            throw new Error(
                `Unable to load ` +
                `${province}/${boundaryKey}: ` +
                `${response.status} ` +
                `${response.statusText}`
            );
        }

        let geoJson;

        try {
            geoJson =
                await response.json();
        } catch (error) {
            throw new Error(
                `${province}/${boundaryKey} ` +
                "returned data that is not valid JSON.",
                {
                    cause:
                        error,
                }
            );
        }

        if (
            geoJson?.type !==
                "FeatureCollection" ||
            !Array.isArray(
                geoJson.features
            )
        ) {
            throw new Error(
                `${province}/${boundaryKey} ` +
                "did not return a valid " +
                "GeoJSON FeatureCollection."
            );
        }

        console.log(
            `[BOUNDARY] Loaded ` +
            `${province}/${boundaryKey}:`,
            geoJson.features.length,
            "features"
        );

        map.addSource(
            config.sourceId,
            {
                type:
                    "geojson",

                data:
                    geoJson,

                promoteId:
                    "DGUID",
            }
        );
    }

    if (
        !map.getLayer(
            config.fillLayerId
        )
    ) {
        map.addLayer({
            id:
                config.fillLayerId,

            type:
                "fill",

            source:
                config.sourceId,

            layout: {
                visibility:
                    "none",
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

                    0.55,
                    0.3,
                ],
            },
        });
    }

    if (
        !map.getLayer(
            config.outlineLayerId
        )
    ) {
        map.addLayer({
            id:
                config.outlineLayerId,

            type:
                "line",

            source:
                config.sourceId,

            layout: {
                visibility:
                    "none",
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

                    4,
                    2,
                ],
            },
        });
    }
}

async function updateBoundaryVisibility(
    map,
    activeProvince,
    activeBoundaryLayer
) {
    forEachBoundaryConfig(
        (config) => {
            if (
                map.getLayer(
                    config.fillLayerId
                )
            ) {
                map.setLayoutProperty(
                    config.fillLayerId,
                    "visibility",
                    "none"
                );
            }

            if (
                map.getLayer(
                    config.outlineLayerId
                )
            ) {
                map.setLayoutProperty(
                    config.outlineLayerId,
                    "visibility",
                    "none"
                );
            }
        }
    );

    if (
        activeBoundaryLayer ===
        "none"
    ) {
        console.log(
            "[BOUNDARY] All statistical layers hidden"
        );

        return;
    }

    await ensureBoundaryLayer(
        map,
        activeProvince,
        activeBoundaryLayer
    );

    const activeConfig =
        getBoundaryConfig(
            activeProvince,
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
        `[BOUNDARY] Showing ` +
        `${activeProvince}/` +
        `${activeBoundaryLayer}`
    );
}

function moveMapToProvince(
    map,
    provinceCode,
    duration = 800
) {
    const provinceData =
        PROVINCE_MAP_DATA[
            provinceCode
        ];

    if (
        !provinceData ||
        !Array.isArray(
            provinceData.center
        )
    ) {
        return;
    }

    map.easeTo({
        center:
            provinceData.center,

        zoom:
            provinceData.zoom ??
            5,

        duration,
    });
}

function getDistanceInMeters(
    coord1,
    coord2
) {
    const [lon1, lat1] =
        coord1;

    const [lon2, lat2] =
        coord2;

    const earthRadius =
        6371e3;

    const latitude1 =
        lat1 *
        Math.PI /
        180;

    const latitude2 =
        lat2 *
        Math.PI /
        180;

    const latitudeDifference =
        (lat2 - lat1) *
        Math.PI /
        180;

    const longitudeDifference =
        (lon2 - lon1) *
        Math.PI /
        180;

    const haversine =
        Math.sin(
            latitudeDifference /
            2
        ) *
            Math.sin(
                latitudeDifference /
                2
            ) +
        Math.cos(
            latitude1
        ) *
            Math.cos(
                latitude2
            ) *
            Math.sin(
                longitudeDifference /
                2
            ) *
            Math.sin(
                longitudeDifference /
                2
            );

    const angularDistance =
        2 *
        Math.atan2(
            Math.sqrt(
                haversine
            ),

            Math.sqrt(
                1 -
                haversine
            )
        );

    return (
        earthRadius *
        angularDistance
    );
}

const Map = forwardRef(
    function Map(
        {
            mode =
                "view",

            center =
                DEFAULT_CENTER,

            zoom =
                8,

            onMapClick,
            onDrawChange,

            province =
                "on",

            boundaryLayer =
                "none",

            onRegionSelect,
        },
        ref
    ) {
        const mapContainer =
            useRef(null);

        const mapRef =
            useRef(null);

        const drawControlRef =
            useRef(null);

        const selectionMarkerRef =
            useRef(null);

        const selectedRegionRef =
            useRef(null);

        const onDrawChangeRef =
            useRef(
                onDrawChange
            );

        const onRegionSelectRef =
            useRef(
                onRegionSelect
            );

        const provinceRef =
            useRef(
                province
            );

        const boundaryLayerRef =
            useRef(
                boundaryLayer
            );

        const modeSettings =
            MODE_SETTINGS[
                mode
            ] ||
            MODE_SETTINGS.view;

        useEffect(() => {
            onDrawChangeRef.current =
                onDrawChange;
        }, [
            onDrawChange,
        ]);

        useEffect(() => {
            onRegionSelectRef.current =
                onRegionSelect;
        }, [
            onRegionSelect,
        ]);

        useEffect(() => {
            provinceRef.current =
                province;
        }, [
            province,
        ]);

        useEffect(() => {
            boundaryLayerRef.current =
                boundaryLayer;
        }, [
            boundaryLayer,
        ]);

        const clearSelectedRegion =
            useCallback(
                () => {
                    const map =
                        mapRef.current;

                    const selectedRegion =
                        selectedRegionRef.current;

                    if (
                        map &&
                        selectedRegion &&
                        map.getSource(
                            selectedRegion.source
                        )
                    ) {
                        try {
                            map.setFeatureState(
                                selectedRegion,
                                {
                                    selected:
                                        false,
                                }
                            );
                        } catch (error) {
                            console.warn(
                                "[BOUNDARY] Unable to clear selected region.",
                                error
                            );
                        }
                    }

                    selectedRegionRef.current =
                        null;

                    onRegionSelectRef.current?.(
                        null
                    );
                },
                []
            );

        const simplifyDrawing =
            useCallback(
                () => {
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
                        300;

                    const BORDER_ALIGN_THRESHOLD =
                        40;

                    const anchorVertices =
                        [];

                    snapshot.forEach(
                        (feature) => {
                            if (
                                feature.geometry.type ===
                                "LineString"
                            ) {
                                feature.geometry.coordinates.forEach(
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
                                feature.geometry.type ===
                                "Polygon"
                            ) {
                                feature.geometry.coordinates.forEach(
                                    (
                                        ring
                                    ) => {
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

                    const getSnappedNeighborCoord =
                        (
                            currentCoord,
                            currentFeatureId
                        ) => {
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
                        };

                    snapshot.forEach(
                        (feature) => {
                            let simplifiedCoordinates =
                                null;

                            let newType =
                                feature.geometry.type;

                            if (
                                feature.geometry.type ===
                                "LineString"
                            ) {
                                const coordinates =
                                    feature.geometry.coordinates;

                                if (
                                    coordinates.length >
                                    2
                                ) {
                                    const newCoordinates =
                                        [
                                            getSnappedNeighborCoord(
                                                coordinates[
                                                    0
                                                ],

                                                feature.id
                                            ),
                                        ];

                                    for (
                                        let index =
                                            1;

                                        index <
                                        coordinates.length -
                                            1;

                                        index +=
                                            1
                                    ) {
                                        const lastAddedPoint =
                                            newCoordinates[
                                                newCoordinates.length -
                                                    1
                                            ];

                                        const currentPoint =
                                            getSnappedNeighborCoord(
                                                coordinates[
                                                    index
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
                                            firstPoint[
                                                0
                                            ],

                                            firstPoint[
                                                1
                                            ],
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
                                feature.geometry.type ===
                                "Polygon"
                            ) {
                                const rings =
                                    feature.geometry.coordinates;

                                const newRings =
                                    [];

                                rings.forEach(
                                    (
                                        ring
                                    ) => {
                                        if (
                                            !ring.length
                                        ) {
                                            return;
                                        }

                                        const newRingCoordinates =
                                            [
                                                getSnappedNeighborCoord(
                                                    ring[
                                                        0
                                                    ],

                                                    feature.id
                                                ),
                                            ];

                                        for (
                                            let index =
                                                1;

                                            index <
                                            ring.length -
                                                1;

                                            index +=
                                                1
                                        ) {
                                            const lastAddedPoint =
                                                newRingCoordinates[
                                                    newRingCoordinates.length -
                                                        1
                                                ];

                                            const currentPoint =
                                                getSnappedNeighborCoord(
                                                    ring[
                                                        index
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

                                            geometry: {
                                                type:
                                                    newType,

                                                coordinates:
                                                    simplifiedCoordinates,
                                            },

                                            properties: {
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

                    onDrawChangeRef.current?.({
                        type:
                            "FeatureCollection",

                        features:
                            terraDraw.getSnapshot(),
                    });
                },
                []
            );

        useImperativeHandle(
            ref,
            () => ({
                simplifyDrawing,

                clearSelectedRegion,
            }),
            [
                simplifyDrawing,
                clearSelectedRegion,
            ]
        );

        useEffect(() => {
            if (
                !mapContainer.current
            ) {
                return undefined;
            }

            const map =
                new maplibregl.Map({
                    container:
                        mapContainer.current,

                    style:
                        OPEN_STREET_MAP_STYLE,

                    center,
                    zoom,

                    interactive:
                        modeSettings.interactive,
                });

            mapRef.current =
                map;

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
                        toCoordinate:
                            true,

                        toLine:
                            true,
                    };
            }

            if (
                modeOptions.linestring
            ) {
                modeOptions.linestring.snapping =
                    {
                        toCoordinate:
                            true,

                        toLine:
                            true,
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

                        open:
                            true,

                        modeOptions,
                    }
                );

            drawControlRef.current =
                drawControl;

            map.addControl(
                drawControl,
                "top-left"
            );

            const handleMapError =
                (
                    event
                ) => {
                    console.error(
                        "[MAP ERROR]",

                        event?.error ||
                        event
                    );
                };

            map.on(
                "error",
                handleMapError
            );

            map.once(
                "load",
                () => {
                    moveMapToProvince(
                        map,
                        provinceRef.current,
                        0
                    );

                    void updateBoundaryVisibility(
                        map,
                        provinceRef.current,
                        boundaryLayerRef.current
                    ).catch(
                        (
                            error
                        ) => {
                            console.error(
                                "[BOUNDARY LOAD ERROR]",
                                error
                            );
                        }
                    );

                    const terraDraw =
                        drawControl.getTerraDrawInstance();

                    if (
                        terraDraw
                    ) {
                        terraDraw.on(
                            "change",
                            () => {
                                onDrawChangeRef.current?.(
                                    {
                                        type:
                                            "FeatureCollection",

                                        features:
                                            terraDraw.getSnapshot(),
                                    }
                                );
                            }
                        );
                    }
                }
            );

            return () => {
                map.off(
                    "error",
                    handleMapError
                );

                selectionMarkerRef.current?.remove();

                selectionMarkerRef.current =
                    null;

                selectedRegionRef.current =
                    null;

                drawControlRef.current =
                    null;

                mapRef.current =
                    null;

                map.remove();
            };
        }, []);

        useEffect(() => {
            const map =
                mapRef.current;

            if (
                !map ||
                !map.isStyleLoaded()
            ) {
                return;
            }

            moveMapToProvince(
                map,
                province
            );
        }, [
            province,
        ]);

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

            map.getCanvas().style.cursor =
                boundaryLayer ===
                "none"
                    ? ""
                    : "pointer";

            void updateBoundaryVisibility(
                map,
                province,
                boundaryLayer
            ).catch(
                (
                    error
                ) => {
                    console.error(
                        "[BOUNDARY LOAD ERROR]",
                        error
                    );
                }
            );
        }, [
            province,
            boundaryLayer,
            clearSelectedRegion,
        ]);

        useEffect(() => {
            const map =
                mapRef.current;

            if (!map) {
                return undefined;
            }

            const handleClick =
                (
                    event
                ) => {
                    const activeProvince =
                        provinceRef.current;

                    const activeBoundaryKey =
                        boundaryLayerRef.current;

                    /*
                     * Statistical-region selection runs
                     * before the TerraDraw restrictions.
                     */
                    if (
                        activeBoundaryKey !==
                        "none"
                    ) {
                        const config =
                            getBoundaryConfig(
                                activeProvince,
                                activeBoundaryKey
                            );

                        if (
                            !config ||
                            !map.getLayer(
                                config.fillLayerId
                            )
                        ) {
                            return;
                        }

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
                            features[
                                0
                            ];

                        if (!feature) {
                            clearSelectedRegion();
                            return;
                        }

                        const properties =
                            feature.properties ??
                            {};

                        const featureId =
                            feature.id ??
                            properties.DGUID;

                        if (
                            featureId ===
                                undefined ||
                            featureId ===
                                null ||
                            featureId ===
                                ""
                        ) {
                            console.warn(
                                "[BOUNDARY] Clicked feature has no DGUID.",
                                properties
                            );

                            return;
                        }

                        if (
                            selectedRegionRef.current
                        ) {
                            try {
                                map.setFeatureState(
                                    selectedRegionRef.current,
                                    {
                                        selected:
                                            false,
                                    }
                                );
                            } catch (
                                error
                            ) {
                                console.warn(
                                    "[BOUNDARY] Could not clear the previous selection.",
                                    error
                                );
                            }
                        }

                        const featureReference =
                            {
                                source:
                                    config.sourceId,

                                id:
                                    featureId,
                            };

                        map.setFeatureState(
                            featureReference,
                            {
                                selected:
                                    true,
                            }
                        );

                        selectedRegionRef.current =
                            featureReference;

                        const landArea =
                            Number(
                                properties.LANDAREA
                            );

                        onRegionSelectRef.current?.(
                            {
                                id:
                                    featureId,

                                province:
                                    activeProvince,

                                provinceLabel:
                                    PROVINCE_MAP_DATA[
                                        activeProvince
                                    ]?.label ??
                                    activeProvince,

                                dguid:
                                    properties.DGUID ??
                                    "",

                                name:
                                    properties[
                                        config.nameProperty
                                    ] ??
                                    "Unknown region",

                                geographyType:
                                    activeBoundaryKey,

                                geographyLabel:
                                    config.geographyLabel,

                                classification:
                                    properties[
                                        config.classificationProperty
                                    ] ??
                                    "",

                                regionType:
                                    properties[
                                        config.typeProperty
                                    ] ??
                                    "",

                                landArea:
                                    Number.isFinite(
                                        landArea
                                    )
                                        ? landArea
                                        : null,

                                properties,
                            }
                        );

                        return;
                    }

                    /*
                     * TerraDraw checks apply only while no
                     * statistical layer is active.
                     */
                    if (
                        drawControlRef.current
                    ) {
                        const terraDraw =
                            drawControlRef.current
                                .getTerraDrawInstance();

                        if (
                            terraDraw
                        ) {
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

                            const drawingIsSelected =
                                snapshot.some(
                                    (
                                        feature
                                    ) =>
                                        feature.properties
                                            ?.selected ===
                                        true
                                );

                            if (
                                drawingIsSelected
                            ) {
                                return;
                            }
                        }
                    }

                    if (
                        mode ===
                        "view"
                    ) {
                        return;
                    }

                    const selectedPoint =
                        {
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

                    selectionMarkerRef.current?.remove();

                    selectionMarkerRef.current =
                        new maplibregl.Marker(
                            {
                                color:
                                    "#332445",
                            }
                        )
                            .setLngLat(
                                event.lngLat
                            )
                            .addTo(
                                map
                            );

                    onMapClick?.(
                        selectedPoint
                    );
                };

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
            clearSelectedRegion,
        ]);

        return (
            <div
                ref={
                    mapContainer
                }
                className={
                    `mapContainer ` +
                    `${modeSettings.className}`
                }
            />
        );
    }
);

export default Map;