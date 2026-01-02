/**
 * Venue Analytics Service
 *
 * Comprehensive venue analytics system providing:
 * - Heat map generation with geographic clustering
 * - Venue insights and visitation patterns
 * - Geographic analysis using Haversine distance
 * - Performance-optimized with caching (5-minute TTL)
 * - Singleton pattern for consistent state management
 *
 * Performance Target: <500ms for heat map generation
 *
 * @module VenueAnalyzer
 */

import { ExperienceLog } from '../../types/experience';
import {
  HeatMapData,
  VenueInsights,
  VenueRanking,
  VenuePoint,
  ClusteredPoint,
  GeoBounds,
} from '../../types/analytics';
import AnalyticsCacheManager from './AnalyticsCacheManager';
import { sqliteService } from '../database/sqlite';

// ============================================================================
// Constants
// ============================================================================

/** Default clustering radius in meters */
const DEFAULT_CLUSTER_RADIUS = 100;

/** Earth's radius in meters for Haversine calculations */
const EARTH_RADIUS_METERS = 6371000;

/** Cache TTL for venue analytics (5 minutes) */
const CACHE_TTL = 5 * 60 * 1000;

/** Cache key prefixes */
const CACHE_KEYS = {
  HEAT_MAP: 'venue:heat_map',
  INSIGHTS: 'venue:insights',
  MOST_VISITED: 'venue:most_visited',
  TYPES: 'venue:types',
  RATINGS: 'venue:ratings',
};

// ============================================================================
// VenueAnalyzer Class
// ============================================================================

/**
 * Singleton service for venue analytics
 * Provides heat map generation, clustering, and venue insights
 */
export class VenueAnalyzer {
  private static instance: VenueAnalyzer;
  private cacheManager: AnalyticsCacheManager;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.cacheManager = AnalyticsCacheManager.getInstance();
  }

  /**
   * Get singleton instance of VenueAnalyzer
   * @returns The VenueAnalyzer instance
   */
  public static getInstance(): VenueAnalyzer {
    if (!VenueAnalyzer.instance) {
      VenueAnalyzer.instance = new VenueAnalyzer();
    }
    return VenueAnalyzer.instance;
  }

  // ==========================================================================
  // Public Methods
  // ==========================================================================

  /**
   * Generate venue heat map from experiences
   * Clusters nearby venues and provides geographic visualization data
   *
   * Algorithm follows pseudocode lines 881-918
   *
   * @param experiences - Array of experience logs
   * @param radiusMeters - Clustering radius (default: 100m)
   * @returns Heat map data with clustered points and bounds
   *
   * @performance Target: <500ms
   * @complexity O(e + n²) where e = experiences, n = venues with coordinates
   */
  public async generateVenueHeatMap(
    experiences: ExperienceLog[],
    radiusMeters: number = DEFAULT_CLUSTER_RADIUS
  ): Promise<HeatMapData> {
    const startTime = performance.now();

    try {
      // Check cache first
      const cacheKey = `${CACHE_KEYS.HEAT_MAP}:${experiences.length}:${radiusMeters}`;
      const cached = await this.cacheManager.get<HeatMapData>(cacheKey);
      if (cached) {
        console.log('[VenueAnalyzer] Heat map retrieved from cache');
        return cached;
      }

      console.log(`[VenueAnalyzer] Generating heat map for ${experiences.length} experiences`);

      // Get venue points directly from the venues table
      const venuePoints = await this.getVenuePointsFromTable();

      // Handle empty case
      if (venuePoints.length === 0) {
        console.log('[VenueAnalyzer] No venues with location data found');
        const emptyData: HeatMapData = {
          points: [],
          bounds: this.getDefaultBounds(),
          intensity: 0,
          metadata: {
            totalVenues: 0,
            totalExperiences: experiences.length,
            clusterRadius: radiusMeters,
          },
        };
        return emptyData;
      }

      // Cluster nearby points
      const clusters = this.clusterPoints(venuePoints, radiusMeters);

      // Calculate geographic bounds
      const bounds = this.calculateBounds(venuePoints);

      // Calculate intensity scale
      const intensity = this.calculateIntensityScale(clusters);

      // Calculate total experiences from venue visit counts
      const totalExperiences = venuePoints.reduce((sum, p) => sum + p.weight, 0);

      const heatMapData: HeatMapData = {
        points: clusters,
        bounds,
        intensity,
        metadata: {
          totalVenues: clusters.length,
          totalExperiences: totalExperiences,
          clusterRadius: radiusMeters,
        },
      };

      // Cache the result
      await this.cacheManager.set(cacheKey, heatMapData, {
        ttl: CACHE_TTL,
        dependencies: ['experiences'],
      });

      const duration = performance.now() - startTime;
      console.log(`[VenueAnalyzer] Heat map generated in ${duration.toFixed(2)}ms`);

      return heatMapData;
    } catch (error) {
      console.error('[VenueAnalyzer] Error generating heat map:', error);
      throw new Error('Failed to generate venue heat map');
    }
  }

  /**
   * Calculate comprehensive venue insights
   * Provides statistics about venue usage patterns
   *
   * @param experiences - Array of experience logs
   * @returns Venue insights with rankings and statistics
   */
  public async calculateVenueInsights(
    experiences: ExperienceLog[]
  ): Promise<VenueInsights> {
    try {
      // Check cache first
      const cacheKey = `${CACHE_KEYS.INSIGHTS}:${experiences.length}`;
      const cached = await this.cacheManager.get<VenueInsights>(cacheKey);
      if (cached) {
        console.log('[VenueAnalyzer] Insights retrieved from cache');
        return cached;
      }

      console.log(`[VenueAnalyzer] Calculating insights for ${experiences.length} experiences`);

      const mostVisited = this.getMostVisitedVenues(experiences, 5);
      const venueTypes = this.getVenuesByType(experiences);
      const averageRatings = this.getAverageRatingByVenue(experiences);
      const totalUniqueVenues = this.countUniqueVenues(experiences);

      const insights: VenueInsights = {
        mostVisited,
        venueTypes,
        averageRatings,
        totalUniqueVenues,
        totalVisits: experiences.length,
      };

      // Cache the result
      await this.cacheManager.set(cacheKey, insights, {
        ttl: CACHE_TTL,
        dependencies: ['experiences'],
      });

      return insights;
    } catch (error) {
      console.error('[VenueAnalyzer] Error calculating insights:', error);
      throw new Error('Failed to calculate venue insights');
    }
  }

  /**
   * Get most visited venues ranked by visit count
   *
   * @param experiences - Array of experience logs
   * @param limit - Maximum number of venues to return (default: 10)
   * @returns Array of venue rankings
   */
  public getMostVisitedVenues(
    experiences: ExperienceLog[],
    limit: number = 10
  ): VenueRanking[] {
    try {
      const venueCounts = new Map<string, { count: number; type: string; ratings: number[] }>();

      // Count visits per venue and collect ratings
      for (const exp of experiences) {
        const venueName = exp.venue.name;
        const existing = venueCounts.get(venueName);

        if (existing) {
          existing.count++;
          if (exp.rating) {
            existing.ratings.push(exp.rating);
          }
        } else {
          venueCounts.set(venueName, {
            count: 1,
            type: exp.venue.type,
            ratings: exp.rating ? [exp.rating] : [],
          });
        }
      }

      // Convert to rankings
      const rankings: VenueRanking[] = Array.from(venueCounts.entries()).map(
        ([venueName, data]) => {
          const averageRating =
            data.ratings.length > 0
              ? data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length
              : undefined;

          return {
            venueName,
            venueType: data.type,
            visitCount: data.count,
            percentage: (data.count / experiences.length) * 100,
            averageRating,
          };
        }
      );

      // Sort by visit count descending, then by name for tie-breaking
      rankings.sort((a, b) => {
        if (b.visitCount !== a.visitCount) {
          return b.visitCount - a.visitCount;
        }
        return a.venueName.localeCompare(b.venueName);
      });

      return rankings.slice(0, limit);
    } catch (error) {
      console.error('[VenueAnalyzer] Error getting most visited venues:', error);
      return [];
    }
  }

  /**
   * Group experiences by venue type
   *
   * @param experiences - Array of experience logs
   * @returns Map of venue type to count
   */
  public getVenuesByType(experiences: ExperienceLog[]): Map<string, number> {
    try {
      const typeCounts = new Map<string, number>();

      for (const exp of experiences) {
        const type = exp.venue.type;
        typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
      }

      return typeCounts;
    } catch (error) {
      console.error('[VenueAnalyzer] Error grouping venues by type:', error);
      return new Map();
    }
  }

  /**
   * Calculate average rating per venue
   *
   * @param experiences - Array of experience logs
   * @returns Map of venue name to average rating
   */
  public getAverageRatingByVenue(
    experiences: ExperienceLog[]
  ): Map<string, number> {
    try {
      const venueRatings = new Map<string, number[]>();

      for (const exp of experiences) {
        if (exp.rating) {
          const venueName = exp.venue.name;
          if (!venueRatings.has(venueName)) {
            venueRatings.set(venueName, []);
          }
          venueRatings.get(venueName)!.push(exp.rating);
        }
      }

      const averages = new Map<string, number>();
      for (const [venue, ratings] of venueRatings.entries()) {
        const average = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
        averages.set(venue, average);
      }

      return averages;
    } catch (error) {
      console.error('[VenueAnalyzer] Error calculating average ratings:', error);
      return new Map();
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Get venue points directly from the venues table
   * This is the primary data source for heat map visualization
   *
   * @returns Array of venue points with valid coordinates
   */
  private async getVenuePointsFromTable(): Promise<VenuePoint[]> {
    const points: VenuePoint[] = [];

    try {
      const allVenues = await sqliteService.getAllVenues();
      console.log(`[VenueAnalyzer] getVenuePointsFromTable: Found ${allVenues.length} total venues`);

      // Debug: Log first 3 venues to see their structure
      if (allVenues.length > 0) {
        console.log('[VenueAnalyzer] Sample venues:', allVenues.slice(0, 3).map(v => ({
          name: v.name,
          type: v.type,
          location: v.location,
          visitCount: v.visitCount
        })));
      }

      let withLocation = 0;
      let withoutLocation = 0;
      let invalidCoords = 0;

      for (const venue of allVenues) {
        if (!venue.location) {
          withoutLocation++;
          console.log(`[VenueAnalyzer] Venue "${venue.name}" has no location data`);
          continue;
        }

        const { latitude, longitude } = venue.location;

        if (!this.isValidCoordinate(latitude, longitude)) {
          invalidCoords++;
          console.log(`[VenueAnalyzer] Invalid coords for venue ${venue.name}: lat=${latitude}, lng=${longitude}`);
          continue;
        }

        withLocation++;
        points.push({
          latitude,
          longitude,
          weight: venue.visitCount || 1,
          venueName: venue.name,
          venueType: venue.type,
        });
      }

      console.log(`[VenueAnalyzer] getVenuePointsFromTable: ${withLocation} venues with valid location, ${withoutLocation} without location, ${invalidCoords} invalid coords`);
      console.log(`[VenueAnalyzer] Returning ${points.length} venue points for heat map`);

      return points;
    } catch (error) {
      console.error('[VenueAnalyzer] Error getting venues from table:', error);
      return [];
    }
  }

  /**
   * Extract venue points from experiences with valid coordinates
   * Falls back to venues table if experience doesn't have location data
   *
   * @param experiences - Array of experience logs
   * @returns Array of venue points
   * @deprecated Use getVenuePointsFromTable instead
   */
  private async extractVenuePointsAsync(experiences: ExperienceLog[]): Promise<VenuePoint[]> {
    const points: VenuePoint[] = [];
    let withLocation = 0;
    let withoutLocation = 0;
    let fromVenuesTable = 0;
    let invalidCoords = 0;

    // Build a cache of venues from the venues table for fallback
    let venuesCache: Map<string, { latitude: number; longitude: number }> = new Map();
    try {
      const allVenues = await sqliteService.getAllVenues();
      for (const venue of allVenues) {
        if (venue.location) {
          venuesCache.set(venue.name.toLowerCase(), {
            latitude: venue.location.latitude,
            longitude: venue.location.longitude
          });
        }
      }
      console.log(`[VenueAnalyzer] Loaded ${venuesCache.size} venues with locations from venues table`);
    } catch (error) {
      console.warn('[VenueAnalyzer] Could not load venues table for fallback:', error);
    }

    for (const exp of experiences) {
      let location = exp.venue.location;

      // If no location in experience, try to get it from venues table
      if (!location && venuesCache.has(exp.venue.name.toLowerCase())) {
        location = venuesCache.get(exp.venue.name.toLowerCase());
        if (location) {
          fromVenuesTable++;
        }
      }

      if (!location) {
        withoutLocation++;
        continue;
      }

      if (!this.isValidCoordinate(location.latitude, location.longitude)) {
        invalidCoords++;
        console.log(`[VenueAnalyzer] Invalid coords for ${exp.venue.name}: lat=${location.latitude}, lng=${location.longitude}`);
        continue;
      }

      withLocation++;
      points.push({
        latitude: location.latitude,
        longitude: location.longitude,
        weight: 1,
        venueName: exp.venue.name,
        venueType: exp.venue.type,
      });
    }

    console.log(`[VenueAnalyzer] extractVenuePoints: ${experiences.length} experiences, ${withLocation} with valid location (${fromVenuesTable} from venues table), ${withoutLocation} without location, ${invalidCoords} invalid coords`);

    return points;
  }

  /**
   * Synchronous version for backward compatibility (deprecated)
   */
  private extractVenuePoints(experiences: ExperienceLog[]): VenuePoint[] {
    const points: VenuePoint[] = [];

    for (const exp of experiences) {
      const location = exp.venue.location;
      if (location && this.isValidCoordinate(location.latitude, location.longitude)) {
        points.push({
          latitude: location.latitude,
          longitude: location.longitude,
          weight: 1,
          venueName: exp.venue.name,
          venueType: exp.venue.type,
        });
      }
    }

    return points;
  }

  /**
   * Validate geographic coordinates
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns True if coordinates are valid
   */
  private isValidCoordinate(lat: number, lng: number): boolean {
    return (
      !isNaN(lat) &&
      !isNaN(lng) &&
      isFinite(lat) &&
      isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  /**
   * Cluster nearby venue points using spatial grouping
   * Implements algorithm from pseudocode lines 920-976
   *
   * @param points - Array of venue points
   * @param radiusMeters - Clustering radius in meters
   * @returns Array of clustered points
   *
   * @complexity O(n²) where n = number of points
   */
  private clusterPoints(
    points: VenuePoint[],
    radiusMeters: number
  ): ClusteredPoint[] {
    if (points.length === 0) {
      return [];
    }

    const clusters: ClusteredPoint[] = [];
    const visited = new Set<number>();

    for (let i = 0; i < points.length; i++) {
      if (visited.has(i)) {
        continue;
      }

      // Start new cluster with current point
      // Use the venue's weight (visitCount) for experiences
      const cluster: ClusteredPoint = {
        latitude: points[i].latitude,
        longitude: points[i].longitude,
        weight: 1, // Number of venues in cluster
        venueNames: [points[i].venueName],
        experiences: points[i].weight, // Total visits from all venues in cluster
      };

      visited.add(i);

      // Find nearby points to add to cluster
      for (let j = i + 1; j < points.length; j++) {
        if (visited.has(j)) {
          continue;
        }

        const distance = this.haversineDistance(
          points[i].latitude,
          points[i].longitude,
          points[j].latitude,
          points[j].longitude
        );

        if (distance <= radiusMeters) {
          // Add to cluster
          const oldWeight = cluster.weight;
          cluster.weight += 1; // Increment venue count
          cluster.experiences += points[j].weight; // Add this venue's visits
          cluster.venueNames.push(points[j].venueName);
          visited.add(j);

          // Update cluster center as weighted average
          cluster.latitude =
            (cluster.latitude * oldWeight + points[j].latitude) /
            cluster.weight;
          cluster.longitude =
            (cluster.longitude * oldWeight + points[j].longitude) /
            cluster.weight;
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  }

  /**
   * Calculate distance between two geographic points using Haversine formula
   * Implements algorithm from pseudocode lines 978-999
   *
   * @param lat1 - First point latitude
   * @param lon1 - First point longitude
   * @param lat2 - Second point latitude
   * @param lon2 - Second point longitude
   * @returns Distance in meters
   *
   * @complexity O(1)
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    // Handle same point
    if (lat1 === lat2 && lon1 === lon2) {
      return 0;
    }

    // Validate coordinates
    if (!this.isValidCoordinate(lat1, lon1) || !this.isValidCoordinate(lat2, lon2)) {
      return Infinity;
    }

    // Convert to radians
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    // Haversine formula
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = EARTH_RADIUS_METERS * c;

    return distance;
  }

  /**
   * Calculate geographic bounds encompassing all venue points
   *
   * @param points - Array of venue points
   * @returns Geographic bounding box
   */
  private calculateBounds(points: VenuePoint[]): GeoBounds {
    if (points.length === 0) {
      return this.getDefaultBounds();
    }

    let minLat = points[0].latitude;
    let maxLat = points[0].latitude;
    let minLng = points[0].longitude;
    let maxLng = points[0].longitude;

    for (const point of points) {
      minLat = Math.min(minLat, point.latitude);
      maxLat = Math.max(maxLat, point.latitude);
      minLng = Math.min(minLng, point.longitude);
      maxLng = Math.max(maxLng, point.longitude);
    }

    // Calculate center
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    return {
      minLat,
      maxLat,
      minLng,
      maxLng,
      centerLat,
      centerLng,
    };
  }

  /**
   * Calculate intensity scale factor based on cluster weights
   * Used for heat map visualization
   *
   * @param clusters - Array of clustered points
   * @returns Intensity scale factor
   */
  private calculateIntensityScale(clusters: ClusteredPoint[]): number {
    if (clusters.length === 0) {
      return 0;
    }

    const maxWeight = Math.max(...clusters.map(c => c.weight));
    return maxWeight;
  }

  /**
   * Get default bounds for empty map
   * Centers on a neutral location (0, 0)
   *
   * @returns Default geographic bounds
   */
  private getDefaultBounds(): GeoBounds {
    return {
      minLat: -1,
      maxLat: 1,
      minLng: -1,
      maxLng: 1,
      centerLat: 0,
      centerLng: 0,
    };
  }

  /**
   * Count unique venues in experiences
   *
   * @param experiences - Array of experience logs
   * @returns Number of unique venues
   */
  private countUniqueVenues(experiences: ExperienceLog[]): number {
    const uniqueVenues = new Set<string>();
    for (const exp of experiences) {
      uniqueVenues.add(exp.venue.name);
    }
    return uniqueVenues.size;
  }

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  /**
   * Clear all venue analytics caches
   * Useful when data is updated or for testing
   */
  public async clearCache(): Promise<void> {
    try {
      // Invalidate venue-related caches
      await this.cacheManager.invalidate('experiences');
      console.log('[VenueAnalyzer] Cache cleared');
    } catch (error) {
      console.error('[VenueAnalyzer] Error clearing cache:', error);
    }
  }
}

// Export singleton instance getter as default
export default VenueAnalyzer.getInstance;
