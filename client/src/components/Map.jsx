import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./Map.css";

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
const EMPTY_GEOMETRY = { type: "FeatureCollection", features: [] };
const DRAWING_SOURCE = "counter-proposal-boundaries";
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

function Map({
    mode = "view",
    center = DEFAULT_CENTER,
    zoom = 8,
    onMapClick,
    geometry = EMPTY_GEOMETRY,
}) {
    const mapContainer = useRef(null);
    const mapRef = useRef(null);
    const selectionMarkerRef = useRef(null);
    const modeSettings = MODE_SETTINGS[mode] || MODE_SETTINGS.view;

    useEffect(() => {
        mapRef.current = new maplibregl.Map({

        container: mapContainer.current,

        style: OPEN_STREET_MAP_STYLE,

        center,

        zoom,

        interactive: modeSettings.interactive

    });

        mapRef.current.addControl(new maplibregl.NavigationControl(), "top-right");

        mapRef.current.on("load", () => {
            mapRef.current.addSource(DRAWING_SOURCE, {
                type: "geojson",
                data: EMPTY_GEOMETRY,
            });

            mapRef.current.addLayer({
                id: "counter-proposal-fill",
                type: "fill",
                source: DRAWING_SOURCE,
                filter: ["==", ["geometry-type"], "Polygon"],
                paint: {
                    "fill-color": ["match", ["get", "riding"], "A", "#68509b", "#317a51"],
                    "fill-opacity": 0.28,
                },
            });

            mapRef.current.addLayer({
                id: "counter-proposal-line",
                type: "line",
                source: DRAWING_SOURCE,
                filter: ["in", ["geometry-type"], ["literal", ["LineString", "Polygon"]]],
                paint: {
                    "line-color": ["match", ["get", "riding"], "A", "#4c367c", "#1e5d2d"],
                    "line-width": 4,
                },
            });

            mapRef.current.addLayer({
                id: "counter-proposal-points",
                type: "circle",
                source: DRAWING_SOURCE,
                filter: ["==", ["geometry-type"], "Point"],
                paint: {
                    "circle-radius": 6,
                    "circle-color": ["match", ["get", "riding"], "A", "#4c367c", "#1e5d2d"],
                    "circle-stroke-color": "#ffffff",
                    "circle-stroke-width": 2,
                },
            });
        });

        return () => {
            selectionMarkerRef.current?.remove();
            mapRef.current?.remove();
        };
    }, [center, modeSettings.interactive, zoom]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return undefined;

        const updateGeometry = () => map.getSource(DRAWING_SOURCE)?.setData(geometry);
        if (map.isStyleLoaded()) {
            updateGeometry();
            return undefined;
        }

        map.once("load", updateGeometry);
        return () => map.off("load", updateGeometry);
    }, [geometry]);

    useEffect(() => {
        const map = mapRef.current;

        if (!map || mode === "view") {
            return undefined;
        }

        const handleClick = (event) => {
            const selectedPoint = {
                lng: Number(event.lngLat.lng.toFixed(5)),
                lat: Number(event.lngLat.lat.toFixed(5)),
                mode,
            };

            if (mode === "objection") {
                selectionMarkerRef.current?.remove();
                selectionMarkerRef.current = new maplibregl.Marker({ color: "#332445" })
                    .setLngLat(event.lngLat)
                    .addTo(map);
            }

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


}

export default Map;
