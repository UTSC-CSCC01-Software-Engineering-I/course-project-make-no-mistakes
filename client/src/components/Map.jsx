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

function Map({ mode = "view", center = DEFAULT_CENTER, zoom = 8, onMapClick }) {
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

        return () => {
            selectionMarkerRef.current?.remove();
            mapRef.current?.remove();
        };
    }, [center, modeSettings.interactive, zoom]);

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


}

export default Map;
