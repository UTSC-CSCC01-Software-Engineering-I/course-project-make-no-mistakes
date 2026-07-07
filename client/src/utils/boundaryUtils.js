/**
 * Calculates the great-circle distance in meters between two [longitude, latitude] coordinates 
 * using the Haversine formula.
 */
export function getDistanceInMeters(coord1, coord2) {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

/**
 * Checks if a [longitude, latitude] coordinate point resides inside a Polygon outer ring 
 * using the classic Ray-Casting algorithm.
 */
export function isPointInPolygon(point, polygonCoords) {
    const [x, y] = point;
    let inside = false;
    const ring = polygonCoords[0];
    if (!ring) return false;
    
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        
        const intersect = ((yi > y) !== (yj > y)) &&
            (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

/**
 * Spatial Area Overlap Estimator (Grid-Based Sampling).
 * Samples the interior surface area of Poly A to determine what percentage resides inside Poly B.
 */
export function getPolygonAreaOverlapPercentage(polyA, polyB) {
    const coordsA = polyA.geometry?.coordinates?.[0]; 
    const coordsB = polyB.geometry?.coordinates;    
    
    if (!coordsA || !coordsB) return 0;

    // 1. Calculate Bounding Box of Poly A
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    coordsA.forEach(([x, y]) => {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    });

    // 2. Generate sample grid inside bounding box to approximate area
    const GRID_RESOLUTION = 12; // 144 points
    let totalPointsInA = 0;
    let pointsInAAndB = 0;

    const stepX = (maxX - minX) / (GRID_RESOLUTION - 1);
    const stepY = (maxY - minY) / (GRID_RESOLUTION - 1);

    for (let i = 0; i < GRID_RESOLUTION; i++) {
        for (let j = 0; j < GRID_RESOLUTION; j++) {
            const px = minX + i * stepX;
            const py = minY + j * stepY;
            const samplePoint = [px, py];

            if (isPointInPolygon(samplePoint, polyA.geometry.coordinates)) {
                totalPointsInA++;
                if (isPointInPolygon(samplePoint, coordsB)) {
                    pointsInAAndB++;
                }
            }
        }
    }

    if (totalPointsInA === 0) return 0;
    return pointsInAAndB / totalPointsInA;
}