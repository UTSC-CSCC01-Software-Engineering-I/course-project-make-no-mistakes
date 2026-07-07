import assert from 'node:assert';
import { 
    getDistanceInMeters, 
    isPointInPolygon, 
    getPolygonAreaOverlapPercentage 
} from './src/utils/boundaryUtils.js';

console.log("Starting boundary validation tests...\n");

try {
    // --- distance tests ---
    const toronto = [-79.3832, 43.6532];
    const torontoNorth = [-79.3832, 43.6622];
    
    assert.strictEqual(getDistanceInMeters(toronto, toronto), 0);
    console.log("✓ getDistanceInMeters: identical points calculate to 0m");

    const distance = getDistanceInMeters(toronto, torontoNorth);
    assert.ok(distance > 990 && distance < 1010, `Calculated distance ${distance}m was out of 990m-1010m range`);
    console.log("✓ getDistanceInMeters: nearby points distance is accurate (~1km)");


    // --- point in polygon tests ---
    const simpleSquare = [
        [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], [0.0, 0.0]]
    ];

    assert.strictEqual(isPointInPolygon([0.5, 0.5], simpleSquare), true);
    console.log("✓ isPointInPolygon: point inside square returned true");

    assert.strictEqual(isPointInPolygon([1.5, 1.5], simpleSquare), false);
    console.log("✓ isPointInPolygon: point outside square returned false");


    // --- area overlap tests ---
    const polyA = {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [[[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], [0.0, 0.0]]]
        }
    };

    // disjoint
    const polyDisjoint = {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [[[5.0, 5.0], [6.0, 5.0], [6.0, 6.0], [5.0, 6.0], [5.0, 5.0]]]
        }
    };
    assert.strictEqual(getPolygonAreaOverlapPercentage(polyA, polyDisjoint), 0);
    console.log("✓ getPolygonAreaOverlapPercentage: disjoint shapes evaluate to 0% overlap");

    // adjacent
    const polyAdjacent = {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [[[1.0, 0.0], [2.0, 0.0], [2.0, 1.0], [1.0, 1.0], [1.0, 0.0]]]
        }
    };
    assert.strictEqual(getPolygonAreaOverlapPercentage(polyA, polyAdjacent), 0);
    console.log("✓ getPolygonAreaOverlapPercentage: adjacent sharing borders evaluate to 0% overlap");

    // overlapping (50%)
    const polyHalfOverlap = {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [[[0.5, 0.0], [1.5, 0.0], [1.5, 1.0], [0.5, 1.0], [0.5, 0.0]]]
        }
    };
    const overlap = getPolygonAreaOverlapPercentage(polyA, polyHalfOverlap);
    assert.ok(overlap > 0.4 && overlap < 0.6, `Calculated overlap ${overlap * 100}% was out of 40%-60% range`);
    console.log(`✓ getPolygonAreaOverlapPercentage: overlapping shapes calculated accurately (${Math.round(overlap * 100)}%)`);

    console.log("\nAll tests passed successfully!");

} catch (error) {
    console.error("\n❌ Test failed!");
    console.error(error.message);
    process.exit(1);
}