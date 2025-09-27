// Venue Management Service
// Handles venue storage, retrieval, and selection with location data

import { VenueInfo, Location } from '../../types/experience';
import { VenueType, ConsolidatedVenue } from '../../types/cider';
import { sqliteService } from '../database/sqlite';
import { VenueConsolidationService } from '../../utils/venueConsolidation';

export interface VenueCreationData {
  name: string;
  type: VenueType;
  location: Location;
  address?: string;
}

export interface VenueSearchResult extends VenueInfo {
  distance?: number;
  lastVisited?: Date;
  visitCount?: number;
}

class VenueService {
  private static instance: VenueService;
  private venueCache: Map<string, VenueInfo> = new Map();

  static getInstance(): VenueService {
    if (!VenueService.instance) {
      VenueService.instance = new VenueService();
    }
    return VenueService.instance;
  }

  /**
   * Get all stored venues
   */
  async getAllVenues(): Promise<VenueInfo[]> {
    try {
      const venues: VenueInfo[] = [];

      // Get venues from experiences
      const experiences = await sqliteService.getAllExperiences();
      const seenVenueIds = new Set<string>();

      for (const experience of experiences) {
        if (experience.venue && experience.venue.id && !seenVenueIds.has(experience.venue.id)) {
          venues.push(experience.venue);
          seenVenueIds.add(experience.venue.id);
        }
      }

      // Get venues from ciders (where they might have been logged)
      const ciders = await sqliteService.getAllCiders();
      for (const cider of ciders) {
        if (cider.venue && typeof cider.venue === 'object' && 'id' in cider.venue) {
          const venue = cider.venue as VenueInfo;
          if (venue.id && !seenVenueIds.has(venue.id)) {
            venues.push(venue);
            seenVenueIds.add(venue.id);
          }
        }
      }

      return venues;
    } catch (error) {
      console.error('Failed to load venues:', error);
      return [];
    }
  }

  /**
   * Search venues by name and location
   */
  async searchVenues(
    query: string,
    currentLocation?: Location,
    maxResults: number = 10
  ): Promise<VenueSearchResult[]> {
    try {
      const allVenues = await this.getAllVenues();
      let results: VenueSearchResult[] = [];

      if (query.trim()) {
        // Filter by name similarity
        results = allVenues
          .filter(venue =>
            venue.name.toLowerCase().includes(query.toLowerCase()) ||
            query.toLowerCase().includes(venue.name.toLowerCase())
          )
          .map(venue => this.enrichVenueResult(venue, currentLocation));
      } else {
        // Return all venues if no query
        results = allVenues.map(venue => this.enrichVenueResult(venue, currentLocation));
      }

      // Sort by relevance (distance if location available, then alphabetically)
      results.sort((a, b) => {
        if (currentLocation && a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        return a.name.localeCompare(b.name);
      });

      return results.slice(0, maxResults);
    } catch (error) {
      console.error('Failed to search venues:', error);
      return [];
    }
  }

  /**
   * Get venues near a location
   */
  async getVenuesNearLocation(
    location: Location,
    radiusKm: number = 5,
    venueTypes?: VenueType[]
  ): Promise<VenueSearchResult[]> {
    try {
      const allVenues = await this.getAllVenues();
      const nearbyVenues: VenueSearchResult[] = [];

      for (const venue of allVenues) {
        if (!venue.location) continue;

        const distance = this.calculateDistance(location, venue.location);
        if (distance <= radiusKm * 1000) { // Convert km to meters
          const enrichedVenue = this.enrichVenueResult(venue, location);

          if (!venueTypes || venueTypes.includes(venue.type)) {
            nearbyVenues.push(enrichedVenue);
          }
        }
      }

      // Sort by distance
      nearbyVenues.sort((a, b) => (a.distance || 0) - (b.distance || 0));

      return nearbyVenues;
    } catch (error) {
      console.error('Failed to get nearby venues:', error);
      return [];
    }
  }

  /**
   * Create or consolidate a new venue
   */
  async createVenue(venueData: VenueCreationData): Promise<VenueInfo> {
    try {
      // Use venue consolidation to check for existing matches
      const consolidatedVenue = await VenueConsolidationService.consolidateVenueName(
        venueData.name,
        venueData.location
      );

      // If it's an existing venue, return it
      if (consolidatedVenue.isExisting) {
        const existingVenue: VenueInfo = {
          id: consolidatedVenue.id,
          name: consolidatedVenue.name,
          type: consolidatedVenue.type,
          location: consolidatedVenue.location || venueData.location,
          address: venueData.address
        };

        // Cache the venue
        this.venueCache.set(existingVenue.id, existingVenue);
        return existingVenue;
      }

      // Create new venue
      const newVenue: VenueInfo = {
        id: this.generateVenueId(venueData.name, venueData.location),
        name: venueData.name.trim(),
        type: venueData.type,
        location: venueData.location,
        address: venueData.address
      };

      // Cache the venue
      this.venueCache.set(newVenue.id, newVenue);

      console.log('Created new venue:', newVenue.name);
      return newVenue;
    } catch (error) {
      console.error('Failed to create venue:', error);
      throw error;
    }
  }

  /**
   * Get venue by ID
   */
  async getVenueById(venueId: string): Promise<VenueInfo | null> {
    try {
      // Check cache first
      if (this.venueCache.has(venueId)) {
        return this.venueCache.get(venueId)!;
      }

      // Search in stored venues
      const allVenues = await this.getAllVenues();
      const venue = allVenues.find(v => v.id === venueId);

      if (venue) {
        this.venueCache.set(venueId, venue);
        return venue;
      }

      return null;
    } catch (error) {
      console.error('Failed to get venue by ID:', error);
      return null;
    }
  }

  /**
   * Update venue information
   */
  async updateVenue(venueId: string, updates: Partial<VenueCreationData>): Promise<VenueInfo | null> {
    try {
      const existingVenue = await this.getVenueById(venueId);
      if (!existingVenue) {
        throw new Error('Venue not found');
      }

      const updatedVenue: VenueInfo = {
        ...existingVenue,
        ...updates
      };

      // Update cache
      this.venueCache.set(venueId, updatedVenue);

      // Note: In a real implementation, you would update all experiences
      // that reference this venue. For now, the update only affects new experiences.

      console.log('Updated venue:', updatedVenue.name);
      return updatedVenue;
    } catch (error) {
      console.error('Failed to update venue:', error);
      return null;
    }
  }

  /**
   * Get venue usage statistics
   */
  async getVenueStats(venueId: string): Promise<{
    visitCount: number;
    lastVisited: Date | null;
    firstVisited: Date | null;
    totalSpent: number;
    averageRating: number;
  }> {
    try {
      const experiences = await sqliteService.getAllExperiences();
      const venueExperiences = experiences.filter(exp => exp.venue.id === venueId);

      if (venueExperiences.length === 0) {
        return {
          visitCount: 0,
          lastVisited: null,
          firstVisited: null,
          totalSpent: 0,
          averageRating: 0
        };
      }

      const sortedByDate = venueExperiences.sort((a, b) => a.date.getTime() - b.date.getTime());
      const totalSpent = venueExperiences.reduce((sum, exp) => sum + exp.price, 0);
      const ratedExperiences = venueExperiences.filter(exp => exp.rating !== undefined);
      const averageRating = ratedExperiences.length > 0
        ? ratedExperiences.reduce((sum, exp) => sum + (exp.rating || 0), 0) / ratedExperiences.length
        : 0;

      return {
        visitCount: venueExperiences.length,
        lastVisited: sortedByDate[sortedByDate.length - 1].date,
        firstVisited: sortedByDate[0].date,
        totalSpent,
        averageRating
      };
    } catch (error) {
      console.error('Failed to get venue stats:', error);
      return {
        visitCount: 0,
        lastVisited: null,
        firstVisited: null,
        totalSpent: 0,
        averageRating: 0
      };
    }
  }

  /**
   * Get venue suggestions for autocomplete
   */
  getVenueSuggestions(query: string): string[] {
    return VenueConsolidationService.getVenueSuggestions(query);
  }

  // Private helper methods

  private enrichVenueResult(venue: VenueInfo, currentLocation?: Location): VenueSearchResult {
    const result: VenueSearchResult = { ...venue };

    if (currentLocation && venue.location) {
      result.distance = this.calculateDistance(currentLocation, venue.location);
    }

    return result;
  }

  private calculateDistance(loc1: Location, loc2: Location): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = loc1.latitude * Math.PI / 180;
    const φ2 = loc2.latitude * Math.PI / 180;
    const Δφ = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const Δλ = (loc2.longitude - loc1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private generateVenueId(name: string, location: Location): string {
    const nameHash = name.replace(/\s+/g, '').toLowerCase().substring(0, 20);
    const locationHash = `${Math.round(location.latitude * 1000)}_${Math.round(location.longitude * 1000)}`;
    const timestamp = Date.now().toString(36);

    return `venue_${nameHash}_${locationHash}_${timestamp}`;
  }

  /**
   * Clear venue cache (useful for testing or memory management)
   */
  clearCache(): void {
    this.venueCache.clear();
  }
}

// Export singleton instance
export const venueService = VenueService.getInstance();
export default VenueService;