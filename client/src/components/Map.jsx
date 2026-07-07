import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import maplibregl from "maplibre-gl";

import { MaplibreTerradrawControl, getDefaultModeOptions } from "@watergis/maplibre-gl-terradraw";
import "@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.css";

import "maplibre-gl/dist/maplibre-gl.css";
import "./Map.css";

const MODE_SETTINGS = {
    view: { className: "mapContainerView", interactive: true },
    objection: { className: "mapContainerObjection", interactive: true },
    counterproposal: { className: "mapContainerCounterproposal", interactive: true },
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
    layers: [{ id: "osm", type: "raster", source: "osm" }],
};

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

const Map = forwardRef(({ mode = "view", center = DEFAULT_CENTER, zoom = 8, onMapClick, onDrawChange }, ref) => {
    const mapContainer = useRef(null);
    const mapRef = useRef(null);
    const drawControlRef = useRef(null);
    const selectionMarkerRef = useRef(null);
    const modeSettings = MODE_SETTINGS[mode] || MODE_SETTINGS.view;

    const onDrawChangeRef = useRef(onDrawChange);
    useEffect(() => {
        onDrawChangeRef.current = onDrawChange;
    }, [onDrawChange]);

    useImperativeHandle(ref, () => ({
        simplifyDrawing: () => {
            const terraDraw = drawControlRef.current?.getTerraDrawInstance();
            if (!terraDraw) return;

            const snapshot = terraDraw.getSnapshot();

            const DISTANCE_THRESHOLD = 300;  
            const GAP_SNAP_THRESHOLD = 300; 
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
        }
    }));

    useEffect(() => {
        const map = new maplibregl.Map({
            container: mapContainer.current,
            style: OPEN_STREET_MAP_STYLE,
            center,
            zoom,
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

        return () => {
            selectionMarkerRef.current?.remove();
            map.remove();
        };
    }, []); 

    useEffect(() => {
        const map = mapRef.current;
        if (!map || mode === "view") return undefined;

        const handleClick = (event) => {
            if (drawControlRef.current) {
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