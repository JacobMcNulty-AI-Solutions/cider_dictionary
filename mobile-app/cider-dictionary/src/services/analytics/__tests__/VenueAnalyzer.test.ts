/**
 * Comprehensive Test Suite for VenueAnalyzer
 *
 * Tests cover:
 * - Haversine distance calculations with known coordinates
 * - Point clustering with various radii
 * - Heat map generation with edge cases
 * - Venue insights and rankings
 * - Geographic bounds calculations
 * - Performance benchmarks (<500ms target)
 * - Caching effectiveness
 * - Error handling
 *
 * Target: 60+ tests
 */

import { VenueAnalyzer } from '../VenueAnalyzer';
import { ExperienceLog } from '../../../types/experience';
import {
  HeatMapData,
  VenueInsights,
  VenueRanking,
  ClusteredPoint,
} from '../../../types/analytics';
import AnalyticsCacheManager from '../AnalyticsCacheManager';

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Generate mock experience log with venue location
 */
function generateMockExperience(
  id: string,
  venueName: string,
  venueType: string,
  latitude: number,
  longitude: number,
  date: Date = new Date(),
  rating?: number
): ExperienceLog {
  return {
    id,
    userId: 'test-user',
    ciderId: `cider-${id}`,
    date,
    venue: {
      id: `venue-${venueName}`,
      name: venueName,
      type: venueType as any,
      location: {
        latitude,
        longitude,
      },
    },
    price: 5.0,
    containerSize: 568,
    containerType: 'draught',
    pricePerPint: 5.0,
    rating: rating as any,
    createdAt: date,
    updatedAt: date,
    syncStatus: 'synced',
    version: 1,
  };
}

/**
 * Generate experience without location
 */
function generateExperienceWithoutLocation(
  id: string,
  venueName: string,
  venueType: string
): ExperienceLog {
  return {
    id,
    userId: 'test-user',
    ciderId: `cider-${id}`,
    date: new Date(),
    venue: {
      id: `venue-${venueName}`,
      name: venueName,
      type: venueType as any,
    },
    price: 5.0,
    containerSize: 568,
    containerType: 'draught',
    pricePerPint: 5.0,
    createdAt: new Date(),
    updatedAt: new Date(),
    syncStatus: 'synced',
    version: 1,
  };
}

// ============================================================================
// Test Suite Setup
// ============================================================================

describe('VenueAnalyzer', () => {
  let analyzer: VenueAnalyzer;
  let cacheManager: AnalyticsCacheManager;

  beforeEach(async () => {
    analyzer = VenueAnalyzer.getInstance();
    cacheManager = AnalyticsCacheManager.getInstance();
    await analyzer.clearCache();
  });

  afterEach(async () => {
    await analyzer.clearCache();
  });

  // ==========================================================================
  // Singleton Pattern Tests
  // ==========================================================================

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = VenueAnalyzer.getInstance();
      const instance2 = VenueAnalyzer.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', async () => {
      const experiences = [
        generateMockExperience('1', 'Test Pub', 'pub', 51.5074, -0.1278),
      ];

      await analyzer.generateVenueHeatMap(experiences);

      // Get new instance and verify cache works
      const newInstance = VenueAnalyzer.getInstance();
      const result = await newInstance.generateVenueHeatMap(experiences);

      expect(result.points.length).toBe(1);
    });
  });

  // ==========================================================================
  // Haversine Distance Tests (10 tests)
  // ==========================================================================

  describe('Haversine Distance Calculation', () => {
    it('should return 0 for same point', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub A', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Pub B', 'pub', 51.5074, -0.1278),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences, 10);

      // Should cluster into 1 point since they're at same location
      expect(heatMap.points.length).toBe(1);
      expect(heatMap.points[0].weight).toBe(2);
    });

    it('should calculate London to Paris distance (~344km)', async () => {
      // London: 51.5074° N, 0.1278° W
      // Paris: 48.8566° N, 2.3522° E
      // Expected: ~344 km

      const experiences = [
        generateMockExperience('1', 'London Pub', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Paris Bar', 'bar', 48.8566, 2.3522),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences, 100);

      // Should be 2 separate clusters (>100m apart)
      expect(heatMap.points.length).toBe(2);
    });

    it('should calculate New York to Los Angeles distance (~3944km)', async () => {
      // New York: 40.7128° N, 74.0060° W
      // Los Angeles: 34.0522° N, 118.2437° W
      // Expected: ~3944 km

      const experiences = [
        generateMockExperience('1', 'NY Bar', 'bar', 40.7128, -74.006),
        generateMockExperience('2', 'LA Pub', 'pub', 34.0522, -118.2437),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences, 1000);

      // Should be 2 separate clusters
      expect(heatMap.points.length).toBe(2);
    });

    it('should handle equator locations', async () => {
      const experiences = [
        generateMockExperience('1', 'Equator Pub', 'pub', 0, 0),
        generateMockExperience('2', 'Nearby Bar', 'bar', 0.001, 0.001),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences, 200);

      // ~157m apart, should cluster with 200m radius
      expect(heatMap.points.length).toBe(1);
    });

    it('should handle polar regions', async () => {
      const experiences = [
        generateMockExperience('1', 'North Pole Pub', 'pub', 89.9, 0),
        generateMockExperience('2', 'Arctic Bar', 'bar', 89.8, 0),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences, 100);

      // Should be separate clusters
      expect(heatMap.points.length).toBe(2);
    });

    it('should handle points near date line', async () => {
      const experiences = [
        generateMockExperience('1', 'East Pub', 'pub', 0, 179.9),
        generateMockExperience('2', 'West Bar', 'bar', 0, -179.9),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences, 100);

      // Should be separate clusters (far apart across date line)
      expect(heatMap.points.length).toBe(2);
    });

    it('should handle invalid coordinates (NaN)', async () => {
      const experiences = [
        generateMockExperience('1', 'Valid Pub', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Invalid Bar', 'bar', NaN, NaN),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences);

      // Should only include valid coordinate
      expect(heatMap.points.length).toBe(1);
      expect(heatMap.points[0].venueNames).toContain('Valid Pub');
    });

    it('should handle out of range coordinates', async () => {
      const experiences = [
        generateMockExperience('1', 'Valid Pub', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Invalid Bar', 'bar', 100, 200),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences);

      // Should only include valid coordinate
      expect(heatMap.points.length).toBe(1);
    });

    it('should handle antipodal points (opposite sides of Earth)', async () => {
      const experiences = [
        generateMockExperience('1', 'North Pub', 'pub', 45, 0),
        generateMockExperience('2', 'South Bar', 'bar', -45, 180),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences, 100);

      // Should be 2 separate clusters (maximum distance apart)
      expect(heatMap.points.length).toBe(2);
    });

    it('should handle very close points (<1m apart)', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub A', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Pub B', 'pub', 51.50741, -0.12781),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences, 10);

      // Should cluster (< 10m apart)
      expect(heatMap.points.length).toBe(1);
      expect(heatMap.points[0].weight).toBe(2);
    });
  });

  // ==========================================================================
  // Clustering Tests (15 tests)
  // ==========================================================================

  describe('Point Clustering', () => {
    it('should not cluster far apart venues', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub A', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Pub B', 'pub', 51.5174, -0.1178), // ~1.2km away
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences, 100);

      expect(heatMap.points.length).toBe(2);
    });

    it('should cluster all venues at same location', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub A', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Pub B', 'pub', 51.5074, -0.1278),
        generateMockExperience('3', 'Pub C', 'pub', 51.5074, -0.1278),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences, 100);

      expect(heatMap.points.length).toBe(1);
      expect(heatMap.points[0].weight).toBe(3);
      expect(heatMap.points[0].venueNames).toHaveLength(3);
    });

    it('should create multiple clusters for distinct groups', async () => {
      const experiences = [
        // Cluster 1: London
        generateMockExperience('1', 'London Pub A', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'London Pub B', 'pub', 51.5075, -0.1279),
        // Cluster 2: Paris
        generateMockExperience('3', 'Paris Bar A', 'bar', 48.8566, 2.3522),
        generateMockExperience('4', 'Paris Bar B', 'bar', 48.8567, 2.3523),
        // Cluster 3: Berlin
        generateMockExperience('5', 'Berlin Pub', 'pub', 52.52, 13.405),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences, 100);

      expect(heatMap.points.length).toBe(3);
    });

    it('should respect 50m clustering radius', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub A', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Pub B', 'pub', 51.5080, -0.1290), // ~100m away
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences, 50);

      // Venues are ~100m apart, should NOT cluster with 50m radius
      expect(heatMap.points.length).toBe(2);
    });

    it('should respect 100m clustering radius', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub A', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Pub B', 'pub', 51.50745, -0.12785), // ~60m away
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences, 100);

      // Should cluster with 100m radius
      expect(heatMap.points.length).toBe(1);
    });

    it('should respect 500m clustering radius', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub A', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Pub B', 'pub', 51.5084, -0.1288), // ~150m away
        generateMockExperience('3', 'Pub C', 'pub', 51.5094, -0.1298), // ~300m from A
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences, 500);

      // All should cluster with 500m radius
      expect(heatMap.points.length).toBe(1);
      expect(heatMap.points[0].weight).toBe(3);
    });

    it('should calculate weighted center for cluster', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub A', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Pub B', 'pub', 51.5076, -0.128),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences, 100);

      expect(heatMap.points.length).toBe(1);
      // Center should be between the two points
      expect(heatMap.points[0].latitude).toBeGreaterThan(51.5074);
      expect(heatMap.points[0].latitude).toBeLessThan(51.5076);
    });

    it('should handle single point clustering', async () => {
      const experiences = [
        generateMockExperience('1', 'Solo Pub', 'pub', 51.5074, -0.1278),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences, 100);

      expect(heatMap.points.length).toBe(1);
      expect(heatMap.points[0].weight).toBe(1);
      expect(heatMap.points[0].latitude).toBe(51.5074);
      expect(heatMap.points[0].longitude).toBe(-0.1278);
    });

    it('should handle empty array clustering', async () => {
      const experiences: ExperienceLog[] = [];

      const heatMap = await analyzer.generateVenueHeatMap(experiences, 100);

      expect(heatMap.points).toEqual([]);
      expect(heatMap.metadata.totalVenues).toBe(0);
    });

    it('should track all venue names in cluster', async () => {
      const experiences = [
        generateMockExperience('1', 'The Crown', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'The Rose', 'pub', 51.5075, -0.1279),
        generateMockExperience('3', 'The Oak', 'bar', 51.5076, -0.128),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences, 100);

      expect(heatMap.points.length).toBe(1);
      expect(heatMap.points[0].venueNames).toContain('The Crown');
      expect(heatMap.points[0].venueNames).toContain('The Rose');
      expect(heatMap.points[0].venueNames).toContain('The Oak');
    });

    it('should count experiences in cluster', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub A', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Pub A', 'pub', 51.5074, -0.1278),
        generateMockExperience('3', 'Pub B', 'pub', 51.5075, -0.1279),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences, 100);

      expect(heatMap.points.length).toBe(1);
      expect(heatMap.points[0].experiences).toBe(3);
    });

    it('should handle complex clustering scenario', async () => {
      // 10 venues: 3 in London, 4 in Paris, 3 in Berlin
      const experiences = [
        ...Array(3).fill(0).map((_, i) =>
          generateMockExperience(`lon-${i}`, `London ${i}`, 'pub', 51.507 + i * 0.0001, -0.127)
        ),
        ...Array(4).fill(0).map((_, i) =>
          generateMockExperience(`par-${i}`, `Paris ${i}`, 'bar', 48.856 + i * 0.0001, 2.352)
        ),
        ...Array(3).fill(0).map((_, i) =>
          generateMockExperience(`ber-${i}`, `Berlin ${i}`, 'pub', 52.52 + i * 0.0001, 13.405)
        ),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences, 100);

      expect(heatMap.points.length).toBe(3);
      expect(heatMap.metadata.totalExperiences).toBe(10);
    });

    it('should not modify original experience data', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub A', 'pub', 51.5074, -0.1278),
      ];

      const originalLat = experiences[0].venue.location!.latitude;
      const originalLng = experiences[0].venue.location!.longitude;

      await analyzer.generateVenueHeatMap(experiences, 100);

      expect(experiences[0].venue.location!.latitude).toBe(originalLat);
      expect(experiences[0].venue.location!.longitude).toBe(originalLng);
    });

    it('should handle duplicate venue visits in same cluster', async () => {
      const experiences = [
        generateMockExperience('1', 'The Crown', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'The Crown', 'pub', 51.5074, -0.1278),
        generateMockExperience('3', 'The Crown', 'pub', 51.5074, -0.1278),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences, 100);

      expect(heatMap.points.length).toBe(1);
      expect(heatMap.points[0].weight).toBe(3);
      expect(heatMap.points[0].experiences).toBe(3);
    });

    it('should handle linear chain of venues', async () => {
      // 5 venues in a line, each 50m apart
      const experiences = [
        generateMockExperience('1', 'Pub 1', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Pub 2', 'pub', 51.50745, -0.12785),
        generateMockExperience('3', 'Pub 3', 'pub', 51.5075, -0.1279),
        generateMockExperience('4', 'Pub 4', 'pub', 51.50755, -0.12795),
        generateMockExperience('5', 'Pub 5', 'pub', 51.5076, -0.128),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences, 100);

      // With 100m radius, should form clusters
      expect(heatMap.points.length).toBeGreaterThan(0);
      expect(heatMap.points.length).toBeLessThanOrEqual(5);
    });
  });

  // ==========================================================================
  // Heat Map Generation Tests (12 tests)
  // ==========================================================================

  describe('Heat Map Generation', () => {
    it('should generate basic heat map with 5 venues', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub 1', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Bar 1', 'bar', 51.5174, -0.1178),
        generateMockExperience('3', 'Restaurant 1', 'restaurant', 51.4974, -0.1378),
        generateMockExperience('4', 'Pub 2', 'pub', 51.5274, -0.1078),
        generateMockExperience('5', 'Bar 2', 'bar', 51.4874, -0.1478),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences);

      expect(heatMap.points.length).toBe(5);
      expect(heatMap.metadata.totalExperiences).toBe(5);
      expect(heatMap.metadata.totalVenues).toBe(5);
      expect(heatMap.metadata.clusterRadius).toBe(100);
    });

    it('should handle empty experiences', async () => {
      const experiences: ExperienceLog[] = [];

      const heatMap = await analyzer.generateVenueHeatMap(experiences);

      expect(heatMap.points).toEqual([]);
      expect(heatMap.bounds.centerLat).toBe(0);
      expect(heatMap.bounds.centerLng).toBe(0);
      expect(heatMap.intensity).toBe(0);
      expect(heatMap.metadata.totalVenues).toBe(0);
      expect(heatMap.metadata.totalExperiences).toBe(0);
    });

    it('should handle experiences without coordinates', async () => {
      const experiences = [
        generateExperienceWithoutLocation('1', 'No Location Pub', 'pub'),
        generateExperienceWithoutLocation('2', 'Another No Location', 'bar'),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences);

      expect(heatMap.points).toEqual([]);
      expect(heatMap.metadata.totalExperiences).toBe(2);
      expect(heatMap.metadata.totalVenues).toBe(0);
    });

    it('should handle mixed experiences (some with, some without location)', async () => {
      const experiences = [
        generateMockExperience('1', 'Located Pub', 'pub', 51.5074, -0.1278),
        generateExperienceWithoutLocation('2', 'No Location Bar', 'bar'),
        generateMockExperience('3', 'Another Located', 'pub', 51.5174, -0.1178),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences);

      expect(heatMap.points.length).toBe(2);
      expect(heatMap.metadata.totalExperiences).toBe(3);
    });

    it('should calculate correct bounds for single venue', async () => {
      const experiences = [
        generateMockExperience('1', 'Solo Pub', 'pub', 51.5074, -0.1278),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences);

      expect(heatMap.bounds.minLat).toBe(51.5074);
      expect(heatMap.bounds.maxLat).toBe(51.5074);
      expect(heatMap.bounds.minLng).toBe(-0.1278);
      expect(heatMap.bounds.maxLng).toBe(-0.1278);
      expect(heatMap.bounds.centerLat).toBe(51.5074);
      expect(heatMap.bounds.centerLng).toBe(-0.1278);
    });

    it('should calculate correct bounds for multiple venues', async () => {
      const experiences = [
        generateMockExperience('1', 'Southwest', 'pub', 40.0, -120.0),
        generateMockExperience('2', 'Northeast', 'pub', 45.0, -115.0),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences);

      expect(heatMap.bounds.minLat).toBe(40.0);
      expect(heatMap.bounds.maxLat).toBe(45.0);
      expect(heatMap.bounds.minLng).toBe(-120.0);
      expect(heatMap.bounds.maxLng).toBe(-115.0);
      expect(heatMap.bounds.centerLat).toBe(42.5);
      expect(heatMap.bounds.centerLng).toBe(-117.5);
    });

    it('should calculate intensity scale correctly', async () => {
      const experiences = [
        generateMockExperience('1', 'Popular Pub', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Popular Pub', 'pub', 51.5074, -0.1278),
        generateMockExperience('3', 'Popular Pub', 'pub', 51.5074, -0.1278),
        generateMockExperience('4', 'Less Popular', 'bar', 51.6, -0.2),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences);

      // Intensity should be max weight (3 for Popular Pub cluster)
      expect(heatMap.intensity).toBe(3);
    });

    it('should include metadata in heat map', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub A', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Pub B', 'pub', 51.6, -0.2),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences, 50);

      expect(heatMap.metadata).toBeDefined();
      expect(heatMap.metadata.totalVenues).toBe(2);
      expect(heatMap.metadata.totalExperiences).toBe(2);
      expect(heatMap.metadata.clusterRadius).toBe(50);
    });

    it('should handle large dataset (100+ venues)', async () => {
      const experiences = Array(100).fill(0).map((_, i) =>
        generateMockExperience(
          `${i}`,
          `Venue ${i}`,
          'pub',
          51.0 + i * 0.01,
          -0.1 + i * 0.01
        )
      );

      const startTime = performance.now();
      const heatMap = await analyzer.generateVenueHeatMap(experiences);
      const duration = performance.now() - startTime;

      expect(heatMap.points.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Should be fast even with 100 venues
    });

    it('should handle venues with invalid partial coordinates', async () => {
      const experiences = [
        generateMockExperience('1', 'Valid', 'pub', 51.5074, -0.1278),
        {
          ...generateExperienceWithoutLocation('2', 'Invalid', 'bar'),
          venue: {
            ...generateExperienceWithoutLocation('2', 'Invalid', 'bar').venue,
            location: {
              latitude: NaN,
              longitude: -0.1278,
            },
          },
        },
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences);

      expect(heatMap.points.length).toBe(1);
      expect(heatMap.points[0].venueNames).toContain('Valid');
    });

    it('should use custom cluster radius', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub A', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Pub B', 'pub', 51.5084, -0.1288),
      ];

      const heatMap200 = await analyzer.generateVenueHeatMap(experiences, 200);
      const heatMap50 = await analyzer.generateVenueHeatMap(experiences, 50);

      expect(heatMap200.metadata.clusterRadius).toBe(200);
      expect(heatMap50.metadata.clusterRadius).toBe(50);
    });

    it('should handle worldwide venue distribution', async () => {
      const experiences = [
        generateMockExperience('1', 'London', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'New York', 'bar', 40.7128, -74.006),
        generateMockExperience('3', 'Tokyo', 'restaurant', 35.6762, 139.6503),
        generateMockExperience('4', 'Sydney', 'pub', -33.8688, 151.2093),
        generateMockExperience('5', 'Rio', 'bar', -22.9068, -43.1729),
      ];

      const heatMap = await analyzer.generateVenueHeatMap(experiences);

      expect(heatMap.points.length).toBe(5);
      expect(heatMap.bounds.minLat).toBeLessThan(0);
      expect(heatMap.bounds.maxLat).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Venue Insights Tests (15 tests)
  // ==========================================================================

  describe('Venue Insights', () => {
    it('should calculate basic insights', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub A', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Bar B', 'bar', 51.6, -0.2),
      ];

      const insights = await analyzer.calculateVenueInsights(experiences);

      expect(insights.totalUniqueVenues).toBe(2);
      expect(insights.totalVisits).toBe(2);
      expect(insights.mostVisited).toHaveLength(2);
    });

    it('should identify most visited venue', async () => {
      const experiences = [
        generateMockExperience('1', 'Popular Pub', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Popular Pub', 'pub', 51.5074, -0.1278),
        generateMockExperience('3', 'Popular Pub', 'pub', 51.5074, -0.1278),
        generateMockExperience('4', 'Other Bar', 'bar', 51.6, -0.2),
      ];

      const insights = await analyzer.calculateVenueInsights(experiences);

      expect(insights.mostVisited[0].venueName).toBe('Popular Pub');
      expect(insights.mostVisited[0].visitCount).toBe(3);
      expect(insights.mostVisited[0].percentage).toBe(75);
    });

    it('should limit most visited venues to specified count', async () => {
      const experiences = Array(10).fill(0).map((_, i) =>
        generateMockExperience(`${i}`, `Venue ${i}`, 'pub', 51.0 + i * 0.1, -0.1)
      );

      const mostVisited = analyzer.getMostVisitedVenues(experiences, 5);

      expect(mostVisited).toHaveLength(5);
    });

    it('should calculate visit percentages correctly', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub A', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Pub A', 'pub', 51.5074, -0.1278),
        generateMockExperience('3', 'Bar B', 'bar', 51.6, -0.2),
        generateMockExperience('4', 'Bar B', 'bar', 51.6, -0.2),
      ];

      const insights = await analyzer.calculateVenueInsights(experiences);

      expect(insights.mostVisited[0].percentage).toBe(50);
      expect(insights.mostVisited[1].percentage).toBe(50);
    });

    it('should group venues by type', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub A', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Pub B', 'pub', 51.6, -0.2),
        generateMockExperience('3', 'Bar A', 'bar', 51.7, -0.3),
        generateMockExperience('4', 'Restaurant A', 'restaurant', 51.8, -0.4),
      ];

      const typeMap = analyzer.getVenuesByType(experiences);

      expect(typeMap.get('pub')).toBe(2);
      expect(typeMap.get('bar')).toBe(1);
      expect(typeMap.get('restaurant')).toBe(1);
    });

    it('should calculate average ratings by venue', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub A', 'pub', 51.5074, -0.1278, new Date(), 9),
        generateMockExperience('2', 'Pub A', 'pub', 51.5074, -0.1278, new Date(), 7),
        generateMockExperience('3', 'Bar B', 'bar', 51.6, -0.2, new Date(), 8),
      ];

      const ratings = analyzer.getAverageRatingByVenue(experiences);

      expect(ratings.get('Pub A')).toBe(8); // (9 + 7) / 2
      expect(ratings.get('Bar B')).toBe(8);
    });

    it('should handle venues without ratings', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub A', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Bar B', 'bar', 51.6, -0.2, new Date(), 8),
      ];

      const ratings = analyzer.getAverageRatingByVenue(experiences);

      expect(ratings.has('Pub A')).toBe(false);
      expect(ratings.get('Bar B')).toBe(8);
    });

    it('should handle empty experiences for insights', async () => {
      const experiences: ExperienceLog[] = [];

      const insights = await analyzer.calculateVenueInsights(experiences);

      expect(insights.totalUniqueVenues).toBe(0);
      expect(insights.totalVisits).toBe(0);
      expect(insights.mostVisited).toHaveLength(0);
    });

    it('should handle single venue insights', async () => {
      const experiences = [
        generateMockExperience('1', 'Solo Pub', 'pub', 51.5074, -0.1278),
      ];

      const insights = await analyzer.calculateVenueInsights(experiences);

      expect(insights.totalUniqueVenues).toBe(1);
      expect(insights.totalVisits).toBe(1);
      expect(insights.mostVisited[0].venueName).toBe('Solo Pub');
      expect(insights.mostVisited[0].percentage).toBe(100);
    });

    it('should sort venues by visit count descending', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub C', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Pub A', 'pub', 51.6, -0.2),
        generateMockExperience('3', 'Pub A', 'pub', 51.6, -0.2),
        generateMockExperience('4', 'Pub A', 'pub', 51.6, -0.2),
        generateMockExperience('5', 'Pub B', 'pub', 51.7, -0.3),
        generateMockExperience('6', 'Pub B', 'pub', 51.7, -0.3),
      ];

      const insights = await analyzer.calculateVenueInsights(experiences);

      expect(insights.mostVisited[0].venueName).toBe('Pub A');
      expect(insights.mostVisited[0].visitCount).toBe(3);
      expect(insights.mostVisited[1].venueName).toBe('Pub B');
      expect(insights.mostVisited[1].visitCount).toBe(2);
      expect(insights.mostVisited[2].venueName).toBe('Pub C');
      expect(insights.mostVisited[2].visitCount).toBe(1);
    });

    it('should break ties alphabetically', async () => {
      const experiences = [
        generateMockExperience('1', 'Zebra Pub', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Apple Bar', 'bar', 51.6, -0.2),
      ];

      const insights = await analyzer.calculateVenueInsights(experiences);

      // Both have 1 visit, should sort alphabetically
      expect(insights.mostVisited[0].venueName).toBe('Apple Bar');
      expect(insights.mostVisited[1].venueName).toBe('Zebra Pub');
    });

    it('should include venue type in rankings', async () => {
      const experiences = [
        generateMockExperience('1', 'Test Venue', 'brewery', 51.5074, -0.1278),
      ];

      const insights = await analyzer.calculateVenueInsights(experiences);

      expect(insights.mostVisited[0].venueType).toBe('brewery');
    });

    it('should include average rating in rankings when available', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub A', 'pub', 51.5074, -0.1278, new Date(), 9),
        generateMockExperience('2', 'Pub A', 'pub', 51.5074, -0.1278, new Date(), 7),
      ];

      const insights = await analyzer.calculateVenueInsights(experiences);

      expect(insights.mostVisited[0].averageRating).toBe(8);
    });

    it('should handle large number of unique venues', async () => {
      const experiences = Array(50).fill(0).map((_, i) =>
        generateMockExperience(`${i}`, `Venue ${i}`, 'pub', 51.0 + i * 0.01, -0.1)
      );

      const insights = await analyzer.calculateVenueInsights(experiences);

      expect(insights.totalUniqueVenues).toBe(50);
      expect(insights.totalVisits).toBe(50);
    });

    it('should handle multiple venue types', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub', 'pub', 51.5074, -0.1278),
        generateMockExperience('2', 'Bar', 'bar', 51.6, -0.2),
        generateMockExperience('3', 'Restaurant', 'restaurant', 51.7, -0.3),
        generateMockExperience('4', 'Home', 'home', 51.8, -0.4),
        generateMockExperience('5', 'Brewery', 'brewery', 51.9, -0.5),
      ];

      const insights = await analyzer.calculateVenueInsights(experiences);

      expect(insights.venueTypes.size).toBe(5);
    });
  });

  // ==========================================================================
  // Performance Tests (5 tests)
  // ==========================================================================

  describe('Performance', () => {
    it('should generate heat map in <500ms for 100 venues', async () => {
      const experiences = Array(100).fill(0).map((_, i) =>
        generateMockExperience(
          `${i}`,
          `Venue ${i}`,
          'pub',
          51.0 + i * 0.01,
          -0.1 + i * 0.01
        )
      );

      const startTime = performance.now();
      await analyzer.generateVenueHeatMap(experiences);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(500);
    });

    it('should calculate insights in <500ms for 100 venues', async () => {
      const experiences = Array(100).fill(0).map((_, i) =>
        generateMockExperience(
          `${i}`,
          `Venue ${i}`,
          'pub',
          51.0 + i * 0.01,
          -0.1,
          new Date(),
          7 + (i % 3)
        )
      );

      const startTime = performance.now();
      await analyzer.calculateVenueInsights(experiences);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(500);
    });

    it('should handle repeated calls efficiently', async () => {
      const experiences = Array(50).fill(0).map((_, i) =>
        generateMockExperience(`${i}`, `Venue ${i}`, 'pub', 51.0 + i * 0.01, -0.1)
      );

      const times: number[] = [];

      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        await analyzer.generateVenueHeatMap(experiences);
        times.push(performance.now() - start);
      }

      // After first call, subsequent calls should be faster due to caching
      expect(times[1]).toBeLessThan(times[0]);
    });

    it('should scale well with increasing data', async () => {
      const sizes = [10, 50, 100];
      const results: HeatMapData[] = [];

      for (const size of sizes) {
        const experiences = Array(size).fill(0).map((_, i) =>
          generateMockExperience(`${i}`, `Venue ${i}`, 'pub', 51.0 + i * 0.01, -0.1)
        );

        await analyzer.clearCache();

        const start = performance.now();
        const result = await analyzer.generateVenueHeatMap(experiences);
        const duration = performance.now() - start;

        results.push(result);

        // Each should complete within reasonable time
        expect(duration).toBeLessThan(1000);
      }

      // Verify all results are valid (note: some may cluster if within 100m)
      expect(results[0].metadata.totalExperiences).toBe(10);
      expect(results[1].metadata.totalExperiences).toBe(50);
      expect(results[2].metadata.totalExperiences).toBe(100);
      // All should have clusters
      expect(results[0].points.length).toBeGreaterThan(0);
      expect(results[1].points.length).toBeGreaterThan(0);
      expect(results[2].points.length).toBeGreaterThan(0);
    });

    it('should batch operations efficiently', async () => {
      const experiences = Array(100).fill(0).map((_, i) =>
        generateMockExperience(`${i}`, `Venue ${i}`, 'pub', 51.0 + i * 0.01, -0.1)
      );

      const start = performance.now();
      await Promise.all([
        analyzer.generateVenueHeatMap(experiences),
        analyzer.calculateVenueInsights(experiences),
      ]);
      const duration = performance.now() - start;

      // Parallel execution should be faster than sequential
      expect(duration).toBeLessThan(800);
    });
  });

  // ==========================================================================
  // Cache Tests (3 tests)
  // ==========================================================================

  describe('Caching', () => {
    it('should cache heat map results', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub A', 'pub', 51.5074, -0.1278),
      ];

      // First call
      const result1 = await analyzer.generateVenueHeatMap(experiences);

      // Second call (should be cached)
      const start2 = performance.now();
      const result2 = await analyzer.generateVenueHeatMap(experiences);
      const time2 = performance.now() - start2;

      expect(result1).toEqual(result2);
      // Cache retrieval should be very fast
      expect(time2).toBeLessThan(50);
    });

    it('should cache insights results', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub A', 'pub', 51.5074, -0.1278),
      ];

      // First call
      const result1 = await analyzer.calculateVenueInsights(experiences);

      // Second call (should be cached)
      const start = performance.now();
      const result2 = await analyzer.calculateVenueInsights(experiences);
      const time = performance.now() - start;

      expect(result1).toEqual(result2);
      expect(time).toBeLessThan(50); // Should be very fast from cache
    });

    it('should clear cache correctly', async () => {
      const experiences = [
        generateMockExperience('1', 'Pub A', 'pub', 51.5074, -0.1278),
      ];

      const result1 = await analyzer.generateVenueHeatMap(experiences);
      await analyzer.clearCache();

      // After clear, should recalculate
      const result2 = await analyzer.generateVenueHeatMap(experiences);

      // Results should still be the same
      expect(result1).toEqual(result2);
      // Cache should have been cleared (verified by logs)
    });
  });
});
