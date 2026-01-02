// Venue Management Service
// Handles venue storage, retrieval, and selection with location data
// REFACTORED: Now uses dedicated SQLite venues table instead of extracting from experiences

import { VenueInfo, Location } from '../../types/experience';
import { Venue, VenueCreationData } from '../../types/venue';
import { VenueType } from '../../types/cider';
import { sqliteService } from '../database/sqlite';
import { syncManager } from '../sync/SyncManager';
import { VenueConsolidationService } from '../../utils/venueConsolidation';
import { getCurrentUserId } from '../../utils/auth';

export interface VenueSearchResult extends VenueInfo {
  distance?: number;
  lastVisited?: Date;
  visitCount?: number;
}

class VenueService {
  private static instance: VenueService;
  private venueCache: Map<string, Venue> = new Map();

  static getInstance(): VenueService {
    if (!VenueService.instance) {
      VenueService.instance = new VenueService();
    }
    return VenueService.instance;
  }

  /**
   * Get all stored venues from the venues table
   */
  async getAllVenues(): Promise<Venue[]> {
    try {
      const venues = await sqliteService.getAllVenues();

      // Update cache
      for (const venue of venues) {
        this.venueCache.set(venue.id, venue);
      }

      return venues;
    } catch (error) {
      console.error('Failed to load venues:', error);
      return [];
    }
  }

  /**
   * Get all venues as VenueInfo (backward compatible)
   */
  async getAllVenuesAsVenueInfo(): Promise<VenueInfo[]> {
    const venues = await this.getAllVenues();
    return venues.map(v => this.toVenueInfo(v));
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
      let venues: Venue[];

      if (query.trim()) {
        // Use SQLite search
        venues = await sqliteService.searchVenues(query, maxResults * 2);
      } else {
        // Return all venues if no query
        venues = await this.getAllVenues();
      }

      let results: VenueSearchResult[] = venues.map(venue =>
        this.enrichVenueResult(this.toVenueInfo(venue), currentLocation, venue)
      );

      // Sort by relevance (distance if location available, then by visit count)
      results.sort((a, b) => {
        if (currentLocation && a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        // Sort by visit count if no location
        return (b.visitCount || 0) - (a.visitCount || 0);
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
          const venueInfo = this.toVenueInfo(venue);
          const enrichedVenue = this.enrichVenueResult(venueInfo, location, venue);

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
   * Get recent venues (for quick selection)
   */
  async getRecentVenues(limit: number = 5): Promise<Venue[]> {
    try {
      return await sqliteService.getRecentVenues(limit);
    } catch (error) {
      console.error('Failed to get recent venues:', error);
      return [];
    }
  }

  /**
   * Get most visited venues
   */
  async getMostVisitedVenues(limit: number = 5): Promise<Venue[]> {
    try {
      return await sqliteService.getMostVisitedVenues(limit);
    } catch (error) {
      console.error('Failed to get most visited venues:', error);
      return [];
    }
  }

  /**
   * Create or consolidate a new venue
   * Now persists to SQLite and queues for Firebase sync
   */
  async createVenue(venueData: VenueCreationData): Promise<Venue> {
    try {
      // Use venue consolidation to check for existing matches
      const consolidatedVenue = await VenueConsolidationService.consolidateVenueName(
        venueData.name,
        venueData.location
      );

      // Check if venue already exists in SQLite by name
      const existingVenue = await sqliteService.getVenueByName(consolidatedVenue.name);

      if (existingVenue) {
        // Increment visit count for existing venue
        await sqliteService.incrementVenueVisitCount(existingVenue.id);

        // Queue update for sync
        await syncManager.queueOperation('UPDATE_VENUE', {
          id: existingVenue.id,
          visitCount: existingVenue.visitCount + 1,
          lastVisited: new Date()
        });

        // Update cache
        const updatedVenue = await sqliteService.getVenueById(existingVenue.id);
        if (updatedVenue) {
          this.venueCache.set(updatedVenue.id, updatedVenue);
          return updatedVenue;
        }
        return existingVenue;
      }

      // Create new venue
      const now = new Date();
      const newVenue: Venue = {
        id: this.generateVenueId(venueData.name, venueData.location),
        userId: getCurrentUserId(),
        name: venueData.name.trim(),
        type: venueData.type,
        location: venueData.location,
        address: venueData.address,
        visitCount: 1,
        lastVisited: now,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending',
        version: 1
      };

      // Save to SQLite
      await sqliteService.createVenue(newVenue);

      // Queue for sync
      await syncManager.queueOperation('CREATE_VENUE', newVenue);

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
  async getVenueById(venueId: string): Promise<Venue | null> {
    try {
      // Check cache first
      if (this.venueCache.has(venueId)) {
        return this.venueCache.get(venueId)!;
      }

      // Get from SQLite
      const venue = await sqliteService.getVenueById(venueId);

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
  async updateVenue(venueId: string, updates: Partial<VenueCreationData>): Promise<Venue | null> {
    try {
      const existingVenue = await this.getVenueById(venueId);
      if (!existingVenue) {
        throw new Error('Venue not found');
      }

      const updateData: Partial<Venue> = {
        ...updates,
        updatedAt: new Date(),
        syncStatus: 'pending'
      };

      // Update in SQLite
      await sqliteService.updateVenue(venueId, updateData);

      // Cascade updates to experiences that reference this venue
      // This ensures venue name/type/location changes are reflected in experience records
      // Pass the OLD venue name so we can find experiences before the name was changed
      const shouldCascade = updates.name || updates.type || updates.address !== undefined || updates.location;
      console.log('[VenueService] Should cascade?', shouldCascade, 'updates:', updates);

      if (shouldCascade) {
        console.log('[VenueService] Calling cascade with oldName:', existingVenue.name);
        const cascadedCount = await sqliteService.cascadeVenueUpdateToExperiences(venueId, updateData, existingVenue.name);
        console.log('[VenueService] Cascade completed, updated', cascadedCount, 'experiences');
      }

      // Queue for sync
      await syncManager.queueOperation('UPDATE_VENUE', {
        id: venueId,
        ...updateData
      });

      // Update cache and return
      const updatedVenue = await sqliteService.getVenueById(venueId);
      if (updatedVenue) {
        this.venueCache.set(venueId, updatedVenue);
        console.log('Updated venue:', updatedVenue.name);
        return updatedVenue;
      }

      return null;
    } catch (error) {
      console.error('Failed to update venue:', error);
      return null;
    }
  }

  /**
   * Delete a venue
   */
  async deleteVenue(venueId: string): Promise<boolean> {
    try {
      // Delete from SQLite
      await sqliteService.deleteVenue(venueId);

      // Queue for sync
      await syncManager.queueOperation('DELETE_VENUE', { id: venueId });

      // Remove from cache
      this.venueCache.delete(venueId);

      console.log('Deleted venue:', venueId);
      return true;
    } catch (error) {
      console.error('Failed to delete venue:', error);
      return false;
    }
  }

  /**
   * Increment venue visit count (called when logging an experience)
   */
  async incrementVisitCount(venueId: string): Promise<void> {
    try {
      await sqliteService.incrementVenueVisitCount(venueId);

      // Queue sync
      const venue = await sqliteService.getVenueById(venueId);
      if (venue) {
        await syncManager.queueOperation('UPDATE_VENUE', {
          id: venueId,
          visitCount: venue.visitCount,
          lastVisited: venue.lastVisited
        });

        // Update cache
        this.venueCache.set(venueId, venue);
      }
    } catch (error) {
      console.error('Failed to increment visit count:', error);
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
      // Get venue from venues table
      const venue = await sqliteService.getVenueById(venueId);

      // Get experiences for detailed stats
      const experiences = await sqliteService.getAllExperiences();
      const venueExperiences = experiences.filter(exp =>
        exp.venueId === venueId || exp.venue.id === venueId
      );

      if (venueExperiences.length === 0 && !venue) {
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
        visitCount: venue?.visitCount || venueExperiences.length,
        lastVisited: venue?.lastVisited || (sortedByDate.length > 0 ? sortedByDate[sortedByDate.length - 1].date : null),
        firstVisited: sortedByDate.length > 0 ? sortedByDate[0].date : null,
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

  /**
   * Get venue count
   */
  async getVenueCount(): Promise<number> {
    return await sqliteService.getVenueCount();
  }

  // Private helper methods

  private toVenueInfo(venue: Venue): VenueInfo {
    return {
      id: venue.id,
      name: venue.name,
      type: venue.type,
      location: venue.location,
      address: venue.address
    };
  }

  private enrichVenueResult(
    venueInfo: VenueInfo,
    currentLocation?: Location,
    fullVenue?: Venue
  ): VenueSearchResult {
    const result: VenueSearchResult = { ...venueInfo };

    if (currentLocation && venueInfo.location) {
      result.distance = this.calculateDistance(currentLocation, venueInfo.location);
    }

    if (fullVenue) {
      result.lastVisited = fullVenue.lastVisited;
      result.visitCount = fullVenue.visitCount;
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

// Re-export VenueCreationData from venue types for backward compatibility
export { VenueCreationData } from '../../types/venue';

// Export singleton instance
export const venueService = VenueService.getInstance();
export default VenueService;
