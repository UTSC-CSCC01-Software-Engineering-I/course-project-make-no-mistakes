import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import maplibregl from "maplibre-gl";

import { MaplibreTerradrawControl, getDefaultModeOptions } from "@watergis/maplibre-gl-terradraw";
import "@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.css";

import "maplibre-gl/dist/maplibre-gl.css";
import "./Map.css";

import {
    PROVINCE_MAP_DATA,
    FED_PROFILES_2011_URL,
} from "../config/mapData";

const MODE_SETTINGS = {
    view: { className: "mapContainerView", interactive: true },
    objection: { className: "mapContainerObjection", interactive: true },
    counterproposal: { className: "mapContainerCounterproposal", interactive: true },
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
    layers: [{ id: "osm", type: "raster", source: "osm" }],
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
                      classificationProperty: "PRUID",
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
    const styleLayers = map.getStyle()?.layers ?? [];

    styleLayers
        .filter(
            (layer) =>
                layer.metadata?.statisticalBoundaryLayer === true
        )
        .forEach((layer) => {
            map.setLayoutProperty(
                layer.id,
                "visibility",
                "none"
            );
        });
}

function ensureBoundaryLayer(map, province, boundaryKey) {
    const config =
        getBoundaryLayerConfig(province)[boundaryKey];

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
                        ["feature-state", "selected"],
                        false,
                    ],
                    "#f59e0b",
                    config.fillColor,
                ],
                "fill-opacity": [
                    "case",
                    [
                        "boolean",
                        ["feature-state", "selected"],
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
                        ["feature-state", "selected"],
                        false,
                    ],
                    "#b45309",
                    config.outlineColor,
                ],
                "line-width": [
                    "case",
                    [
                        "boolean",
                        ["feature-state", "selected"],
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
        console.log("[BOUNDARY] All statistical layers hidden");
        return;
    }

    const activeConfig = ensureBoundaryLayer(
        map,
        province,
        activeBoundaryLayer
    );

    if (!activeConfig) {
        return;
    }

    if (map.getLayer(activeConfig.fillLayerId)) {
        map.setLayoutProperty(
            activeConfig.fillLayerId,
            "visibility",
            "visible"
        );
    }

    if (map.getLayer(activeConfig.outlineLayerId)) {
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
    if (value == null || value === "") {
        return "";
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? number.toLocaleString("en-CA")
        : "";
}

function formatProfileNumber(value) {
    if (value == null || value === "") {
        return "";
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? number.toLocaleString("en-CA", {
              maximumFractionDigits: 1,
          })
        : "";
}

function formatProfilePercent(value) {
    const formattedValue = formatProfileNumber(value);

    return formattedValue ? `${formattedValue}%` : "";
}

function formatProfileCurrency(value) {
    if (value == null || value === "") {
        return "";
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? new Intl.NumberFormat("en-CA", {
              style: "currency",
              currency: "CAD",
              maximumFractionDigits: 0,
          }).format(number)
        : "";
}

function normalizeFederalDistrictCode(value) {
    if (value == null || value === "") {
        return null;
    }

    const text = String(value).trim();

    // A federal electoral district code is five digits.
    const exactCode = text.match(/(?:^|\D)(\d{5})(?:\D|$)/);
    if (exactCode) {
        return exactCode[1];
    }

    // Some converted polling-district IDs begin with the
    // five-digit federal district code, followed by the poll number.
    const leadingCode = text.match(/^(\d{5})/);
    if (leadingCode) {
        return leadingCode[1];
    }

    // Handle a numeric code that may have lost leading zeroes.
    if (/^\d{1,5}$/.test(text)) {
        return text.padStart(5, "0");
    }

    return null;
}

function getFederalDistrictCode(properties) {
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

    for (const candidate of directCandidates) {
        const code = normalizeFederalDistrictCode(candidate);
        if (code) {
            return code;
        }
    }

    // Your converted polling-district data currently uses pd_id.
    // In many Elections Canada files, its first five digits identify
    // the containing federal electoral district.
    return normalizeFederalDistrictCode(
        properties.pd_id ?? properties.PD_ID
    );
}

function normalizeDistrictName(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, " ")
        .trim()
        .toLowerCase();
}

function findFederalProfile(profiles, properties, provinceLabel) {
    const code = getFederalDistrictCode(properties);

    if (code && profiles[code]) {
        return {
            code,
            profile: profiles[code],
            matchedBy: "code",
        };
    }

    // Name matching is only a fallback in case the converted GeoJSON
    // does not retain a usable federal district code.
    const districtName = normalizeDistrictName(
        properties.ed_name ??
        properties.ED_NAME ??
        properties.FEDNAME ??
        properties.FEDENAME ??
        properties.FEDFNAME
    );
    const normalizedProvince = normalizeDistrictName(provinceLabel);

    if (!districtName) {
        return {
            code,
            profile: null,
            matchedBy: null,
        };
    }

    const profile = Object.values(profiles).find((candidate) => {
        const sameName =
            normalizeDistrictName(candidate?.name) === districtName;
        const sameProvince =
            !normalizedProvince ||
            normalizeDistrictName(candidate?.province) === normalizedProvince;

        return sameName && sameProvince;
    }) ?? null;

    return {
        code: profile?.geoCode ?? code,
        profile,
        matchedBy: profile ? "name" : null,
    };
}

function getDistanceInMeters(coord1, coord2) {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

const Map = forwardRef(({
    mode = "view",
    center,
    zoom,
    onMapClick,
    onDrawChange,
    province = "on",
    boundaryLayer = "none",
    onRegionSelect,
}, ref) => {
    const mapContainer = useRef(null);
    const mapRef = useRef(null);
    const drawControlRef = useRef(null);
    const selectionMarkerRef = useRef(null);
    const federalProfilesRef = useRef({});
    const modeSettings = MODE_SETTINGS[mode] || MODE_SETTINGS.view;

    const initialProvinceData =
        PROVINCE_MAP_DATA[province];

    const initialCenter =
        center ??
        initialProvinceData?.center ??
        DEFAULT_CENTER;

    const initialZoom =
        zoom ??
        initialProvinceData?.zoom ??
        DEFAULT_ZOOM;

    const onDrawChangeRef = useRef(onDrawChange);
    const provinceRef = useRef(province);
    const boundaryLayerRef = useRef(boundaryLayer);

    const selectedRegionRef = useRef(null);
    const onRegionSelectRef = useRef(onRegionSelect);

    useEffect(() => {
        onDrawChangeRef.current = onDrawChange;
    }, [onDrawChange]);

    useEffect(() => {
        provinceRef.current = province;
    }, [province]);

    useEffect(() => {
        boundaryLayerRef.current = boundaryLayer;
    }, [boundaryLayer]);

    useEffect(() => {
        onRegionSelectRef.current = onRegionSelect;
    }, [onRegionSelect]);
    
    useEffect(() => {
        let cancelled = false;
    
        async function loadFederalProfiles() {
            if (!FED_PROFILES_2011_URL) {
                console.error(
                    "[FED PROFILE] VITE_SUPABASE_URL is not configured"
                );
                return;
            }
    
            try {
                const response = await fetch(
                    FED_PROFILES_2011_URL
                );
    
                if (!response.ok) {
                    throw new Error(
                        `HTTP ${response.status}: ${response.statusText}`
                    );
                }
    
                const profiles = await response.json();
    
                if (!cancelled) {
                    federalProfilesRef.current = profiles;
    
                    console.log(
                        "[FED PROFILE] Loaded profiles:",
                        Object.keys(profiles).length
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
    
    function clearSelectedRegion() {
        const map = mapRef.current;
        const selectedRegion = selectedRegionRef.current;
    
        if (
            map &&
            selectedRegion &&
            map.getSource(selectedRegion.source)
        ) {
            map.setFeatureState(
                selectedRegion,
                { selected: false }
            );
        }
    
        selectedRegionRef.current = null;
        onRegionSelectRef.current?.(null);
    }

    useImperativeHandle(ref, () => ({
        simplifyDrawing: () => {
            const terraDraw = drawControlRef.current?.getTerraDrawInstance();
            if (!terraDraw) return;

            const snapshot = terraDraw.getSnapshot();

            const DISTANCE_THRESHOLD = 300;  
            const GAP_SNAP_THRESHOLD = 3000; 
            const BORDER_ALIGN_THRESHOLD = 40; 

            const anchorVertices = [];
            snapshot.forEach(f => {
                if (f.geometry.type === 'LineString') {
                    f.geometry.coordinates.forEach(c => anchorVertices.push({ coord: c, parentId: f.id }));
                } else if (f.geometry.type === 'Polygon') {
                    f.geometry.coordinates.forEach(ring => {
                        ring.forEach(c => anchorVertices.push({ coord: c, parentId: f.id }));
                    });
                }
            });

            const getSnappedNeighborCoord = (currentCoord, currentFeatureId) => {
                let bestCoord = currentCoord;
                let closestDist = BORDER_ALIGN_THRESHOLD;

                anchorVertices.forEach(({ coord, parentId }) => {
                    if (parentId === currentFeatureId) return; 
                    
                    const dist = getDistanceInMeters(currentCoord, coord);
                    if (dist < closestDist) {
                        closestDist = dist;
                        bestCoord = coord;
                    }
                });
                return bestCoord;
            };

            snapshot.forEach(feature => {
                let simplifiedCoords = null;
                let newType = feature.geometry.type;

                if (feature.geometry.type === 'LineString') {
                    const coords = feature.geometry.coordinates;
                    if (coords.length > 2) {
                        const newCoords = [getSnappedNeighborCoord(coords[0], feature.id)]; 
                        
                        for (let i = 1; i < coords.length - 1; i++) {
                            const lastAddedPoint = newCoords[newCoords.length - 1];
                            const currentPoint = getSnappedNeighborCoord(coords[i], feature.id);
                            
                            if (getDistanceInMeters(lastAddedPoint, currentPoint) >= DISTANCE_THRESHOLD) {
                                newCoords.push(currentPoint);
                            }
                        }
                        newCoords.push(getSnappedNeighborCoord(coords[coords.length - 1], feature.id)); 

                        const firstPoint = newCoords[0];
                        const lastPoint = newCoords[newCoords.length - 1];
                        
                        if (getDistanceInMeters(firstPoint, lastPoint) <= GAP_SNAP_THRESHOLD) {
                            newCoords[newCoords.length - 1] = [firstPoint[0], firstPoint[1]];
                            newType = 'Polygon';
                            simplifiedCoords = [newCoords]; 
                        } else {
                            simplifiedCoords = newCoords;
                        }
                    }
                } else if (feature.geometry.type === 'Polygon') {
                     const rings = feature.geometry.coordinates;
                     const newRings = [];
                     
                     rings.forEach(ring => {
                         const newRingCoords = [getSnappedNeighborCoord(ring[0], feature.id)];
                         for (let i = 1; i < ring.length - 1; i++) {
                             const lastAddedPoint = newRingCoords[newRingCoords.length - 1];
                             const currentPoint = getSnappedNeighborCoord(ring[i], feature.id);
                             
                             if (getDistanceInMeters(lastAddedPoint, currentPoint) >= DISTANCE_THRESHOLD) {
                                 newRingCoords.push(currentPoint);
                             }
                         }
                         newRingCoords.push([newRingCoords[0][0], newRingCoords[0][1]]);
                         newRings.push(newRingCoords);
                     });
                     simplifiedCoords = newRings;
                }

                if (simplifiedCoords) {
                    if (newType === feature.geometry.type) {
                        // Type is unchanged: Update in-place to preserve undo history for this specific shape
                        terraDraw.updateFeatureGeometry(feature.id, {
                            type: newType,
                            coordinates: simplifiedCoords
                        });
                    } else {
                        // --- THE CRITICAL TYPE MISMATCH FIX ---
                        // Type is changed (LineString -> Polygon). We remove and add only this feature.
                        // This prevents the mismatch error while leaving other shapes untouched.
                        terraDraw.removeFeatures([feature.id]);
                        
                        terraDraw.addFeatures([{
                            type: 'Feature',
                            id: feature.id, // Keep original feature ID
                            geometry: {
                                type: newType,
                                coordinates: simplifiedCoords
                            },
                            properties: {
                                ...feature.properties,
                                mode: 'polygon' 
                            }
                        }]);
                    }
                }
            });

            if (onDrawChangeRef.current) {
                onDrawChangeRef.current({
                    type: 'FeatureCollection',
                    features: terraDraw.getSnapshot()
                });
            }
        },

        clearSelectedRegion: () => {
            clearSelectedRegion();
        },
    }));

    useEffect(() => {
        const map = new maplibregl.Map({
            container: mapContainer.current,
            style: OPEN_STREET_MAP_STYLE,
            center: initialCenter,
            zoom: initialZoom,
            interactive: modeSettings.interactive
        });
        
        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl(), "top-right");

        const modeOptions = getDefaultModeOptions();
        
        if (modeOptions.polygon) {
            modeOptions.polygon.snapping = {
                toCoordinate: true,
                toLine: true
            };
        }
        
        if (modeOptions.linestring) {
            modeOptions.linestring.snapping = {
                toCoordinate: true,
                toLine: true
            };
        }

        const drawControl = new MaplibreTerradrawControl({
            modes: [
                'linestring', 
                'polygon', 
                'select', 
                'delete-selection', 
                'delete',
                'undo', 
                'redo'  
            ],
            open: true,
            modeOptions: modeOptions 
        });
        
        drawControlRef.current = drawControl;
        map.addControl(drawControl, "top-left");

        map.once('load', () => {
            updateBoundaryVisibility(
                map,
                provinceRef.current,
                boundaryLayerRef.current
            );

            const terraDraw = drawControl.getTerraDrawInstance();
            if (terraDraw) {
                terraDraw.on('change', () => {
                    if (onDrawChangeRef.current) {
                        onDrawChangeRef.current({
                            type: 'FeatureCollection',
                            features: terraDraw.getSnapshot()
                        });
                    }
                });
            }
        });

        const handleMapError = (event) => {
            console.error("[MAP ERROR]", event?.error || event);
        };

        map.on("error", handleMapError);

        return () => {
            map.off("error", handleMapError);
            selectionMarkerRef.current?.remove();
            map.remove();
        };
    }, []); 

    useEffect(() => {
        const map = mapRef.current;

        if (!map || !map.isStyleLoaded()) {
            return;
        }

        const provinceData =
            PROVINCE_MAP_DATA[province];

        map.easeTo({
            center:
                center ??
                provinceData?.center ??
                DEFAULT_CENTER,
            zoom:
                zoom ??
                provinceData?.zoom ??
                DEFAULT_ZOOM,
            duration: 500,
        });
    }, [province, center, zoom]);

    useEffect(() => {
        const map = mapRef.current;

        if (!map || !map.isStyleLoaded()) {
            return;
        }

        clearSelectedRegion();

        updateBoundaryVisibility(
            map,
            province,
            boundaryLayer
        );
    }, [province, boundaryLayer]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return undefined;

        const handleClick = (event) => {
            // Drawing-mode checks should not block ordinary map
            // inspection while the component is in view mode.
            if (mode !== "view" && drawControlRef.current) {
                const terraDraw = drawControlRef.current.getTerraDrawInstance();
                if (terraDraw) {
                    const drawMode = terraDraw.getMode();
                    if (drawMode !== 'select' && drawMode !== 'render') {
                        return; 
                    }

                    const snapshot = terraDraw.getSnapshot();
                    if (snapshot.some(f => f.properties.selected === true)) {
                        return; 
                    }
                }
            }

            const activeBoundaryKey =
                boundaryLayerRef.current;

            if (activeBoundaryKey !== "none") {
                const activeProvince =
                    provinceRef.current;

                const config =
                    getBoundaryLayerConfig(activeProvince)[
                        activeBoundaryKey
                    ];

                if (
                    config &&
                    map.getLayer(config.fillLayerId)
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

                    const feature = features[0];

                    if (!feature) {
                        clearSelectedRegion();
                        return;
                    }

                    if (selectedRegionRef.current) {
                        map.setFeatureState(
                            selectedRegionRef.current,
                            { selected: false }
                        );
                    }

                    const properties =
                        feature.properties ?? {};

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
                                  provinceData?.label ?? ""
                              )
                            : {
                                  code: null,
                                  profile: null,
                                  matchedBy: null,
                              };

                    const federalDistrictCode =
                        profileMatch.code;
                    const federalProfile =
                        profileMatch.profile;

                    console.log(
                        "[FED PROFILE] Match result:",
                        {
                            federalDistrictCode,
                            matchedBy: profileMatch.matchedBy,
                            federalProfile,
                            featureProperties: properties,
                        }
                    );

                    const featureId =
                        feature.id ??
                        properties[config.idProperty];

                    if (featureId == null) {
                        console.warn(
                            "[BOUNDARY] Selected feature has no usable ID",
                            properties
                        );
                        clearSelectedRegion();
                        return;
                    }

                    const featureReference = {
                        source: config.sourceId,
                        id: featureId,
                    };

                    map.setFeatureState(
                        featureReference,
                        { selected: true }
                    );

                    selectedRegionRef.current =
                        featureReference;

                    const landArea =
                        Number(properties.LANDAREA);

                    const pollingDistrictNumber =
                        properties.PD_NUM ?? "";

                    const electoralDistrictName =
                        properties.ed_name ?? "";

                    const pollingDistrictName =
                        [
                            electoralDistrictName,
                            pollingDistrictNumber !== ""
                                ? `Poll ${pollingDistrictNumber}`
                                : "",
                        ]
                            .filter(Boolean)
                            .join(" — ");

                    const pollingDistrictDetails =
                        isPollingDistrict
                            ? [
                                  {
                                      label: "Estimated electors",
                                      value: formatCount(
                                          properties.electors_est
                                      ),
                                  },
                                  {
                                      label: "Total votes",
                                      value: formatCount(
                                          properties.total_votes
                                      ),
                                  },
                              ]
                            : [];

                    const federalProfileDetails =
                        federalProfile
                            ? [
                                  {
                                      label: "2011 federal riding",
                                      value:
                                          federalProfile.name ??
                                          electoralDistrictName,
                                  },
                                  {
                                      label: "Federal district code",
                                      value:
                                          federalProfile.geoCode ??
                                          federalDistrictCode,
                                  },
                                  {
                                      label: "2011 riding population",
                                      value: formatProfileNumber(
                                          federalProfile.population
                                      ),
                                  },
                                  {
                                      label: "Median age",
                                      value: formatProfileNumber(
                                          federalProfile.medianAge
                                      ),
                                  },
                                  {
                                      label: "Employment rate",
                                      value: formatProfilePercent(
                                          federalProfile.employmentRate
                                      ),
                                  },
                                  {
                                      label: "Unemployment rate",
                                      value: formatProfilePercent(
                                          federalProfile.unemploymentRate
                                      ),
                                  },
                                  {
                                      label: "Median individual income",
                                      value: formatProfileCurrency(
                                          federalProfile.medianIndividualIncome
                                      ),
                                  },
                                  {
                                      label: "Median household income",
                                      value: formatProfileCurrency(
                                          federalProfile.medianHouseholdIncome
                                      ),
                                  },
                                  {
                                      label: "Immigrant population",
                                      value: formatProfileNumber(
                                          federalProfile.immigrantPopulation
                                      ),
                                  },
                                  {
                                      label: "Visible minority population",
                                      value: formatProfileNumber(
                                          federalProfile.visibleMinorityPopulation
                                      ),
                                  },
                                  {
                                      label: "Bachelor's degree or above",
                                      value: formatProfileNumber(
                                          federalProfile.bachelorOrAbove
                                      ),
                                  },
                                  {
                                      label: "NHS non-response rate",
                                      value: formatProfilePercent(
                                          federalProfile.gnr
                                      ),
                                  },
                                  {
                                      label: "Statistics scope",
                                      value: isFederalDistrict
                                          ? "Selected federal riding"
                                          : "Entire federal riding, not only this polling district",
                                  },
                                  {
                                      label: "Statistics source",
                                      value:
                                          "2011 Census and 2011 National Household Survey",
                                  },
                              ]
                            : isPollingDistrict || isFederalDistrict
                              ? [
                                    {
                                        label: "2011 riding profile",
                                        value:
                                            "No matching federal riding profile found",
                                    },
                                ]
                              : [];

                    const extraDetails = [
                        ...pollingDistrictDetails,
                        ...federalProfileDetails,
                    ].filter(
                        (detail) =>
                            detail.value != null &&
                            detail.value !== ""
                    );

                    onRegionSelectRef.current?.({
                        id: featureId,
                        provinceLabel:
                            provinceData?.label ?? "",
                        geographyLabel:
                            config.geographyLabel,

                        name: isPollingDistrict
                            ? pollingDistrictName ||
                              "Unknown polling district"
                            : isFederalDistrict
                              ? federalProfile?.name ??
                                properties.FEDNAME ??
                                "Unknown federal riding"
                              : properties[
                                    config.nameProperty
                                ] ?? "Unknown region",

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
                                ? properties.PRUID ?? ""
                                : properties[
                                      config.classificationProperty
                                  ] ?? "",

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
                                  ] ?? "",

                        landArea:
                            Number.isFinite(landArea)
                                ? landArea
                                : null,

                        federalDistrictCode,
                        federalProfile,
                        profileSource:
                            federalProfile != null
                                ? "2011 Census and 2011 National Household Survey"
                                : null,

                        extraDetails,
                        properties,
                    });

                    // Do not place the normal point marker too.
                    return;
                }
            }

            console.log("PRESSED MOUSE");
            const selectedPoint = {
                lng: Number(event.lngLat.lng.toFixed(5)),
                lat: Number(event.lngLat.lat.toFixed(5)),
                mode,
            };

            selectionMarkerRef.current?.remove();
            selectionMarkerRef.current = new maplibregl.Marker({ color: "#332445" })
                .setLngLat(event.lngLat)
                .addTo(map);

            onMapClick?.(selectedPoint);
        };

        map.on("click", handleClick);

        return () => {
            map.off("click", handleClick);
        };
    }, [mode, onMapClick]);

    return (
        <div
            ref={mapContainer}
            className={`mapContainer ${modeSettings.className}`}>
        </div>
    );
});

export default Map;