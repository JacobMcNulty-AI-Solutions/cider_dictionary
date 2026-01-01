// Zustand Global State Store for Cider Management
// Centralized state management for Phase 2 enhanced functionality

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { CiderMasterRecord, ConsolidatedVenue, EnhancedAnalytics } from '../types/cider';
import { DuplicateDetectionEngine, DuplicateDetectionResult } from '../utils/duplicateDetection';
import { VenueConsolidationService } from '../utils/venueConsolidation';
import { sqliteService } from '../services/database/sqlite';
import { syncManager } from '../services/sync/SyncManager';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a photo path is a local file that needs uploading to Firebase Storage
 * Local files start with file:// or contain the app's document directory
 * Firebase URLs start with https://firebasestorage.googleapis.com
 */
const isLocalPhoto = (photoPath: string | undefined): boolean => {
  if (!photoPath) return false;
  // Local file paths
  if (photoPath.startsWith('file://')) return true;
  if (photoPath.startsWith('/data/')) return true;
  if (photoPath.includes('ExponentExperienceData')) return true;
  if (photoPath.includes('DocumentDirectory')) return true;
  // Already a Firebase URL - no upload needed
  if (photoPath.startsWith('https://firebasestorage.googleapis.com')) return false;
  if (photoPath.startsWith('https://storage.googleapis.com')) return false;
  // Assume other paths are local
  return !photoPath.startsWith('http');
};

/**
 * Queue an image upload operation for a cider's photo
 */
const queueImageUpload = async (ciderId: string, localPhotoPath: string): Promise<void> => {
  const remotePath = `images/${ciderId}/photo_${Date.now()}.jpg`;
  await syncManager.queueOperation('UPLOAD_IMAGE', {
    localPath: localPhotoPath,
    remotePath,
    ciderId,
  });
  console.log(`Queued image upload for cider ${ciderId}: ${localPhotoPath} -> ${remotePath}`);
};

// =============================================================================
// STORE INTERFACES
// =============================================================================

export interface CiderStoreState {
  // Core data
  ciders: CiderMasterRecord[];
  venues: ConsolidatedVenue[];

  // UI state
  isLoading: boolean;
  error: string | null;

  // Search and filtering
  searchQuery: string;
  filteredCiders: CiderMasterRecord[];
  sortOrder: 'name' | 'brand' | 'rating' | 'abv' | 'dateAdded';
  sortDirection: 'asc' | 'desc';

  // Analytics cache
  analytics: EnhancedAnalytics | null;
  analyticsLastUpdated: number | null;

  // Performance optimization
  lastSyncTimestamp: number;
  isDirty: boolean;
}

export interface CiderStoreActions {
  // Cider CRUD operations
  addCider: (cider: Omit<CiderMasterRecord, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus'>) => Promise<string>;
  updateCider: (id: string, updates: Partial<CiderMasterRecord>) => Promise<void>;
  deleteCider: (id: string) => Promise<void>;
  getCiderById: (id: string) => CiderMasterRecord | null;

  // Batch operations
  addMultipleCiders: (ciders: Omit<CiderMasterRecord, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus'>[]) => Promise<string[]>;
  deleteMutlipleCiders: (ids: string[]) => Promise<void>;

  // Data loading and syncing
  loadCiders: () => Promise<void>;
  syncWithServer: () => Promise<void>;
  refreshAnalytics: () => Promise<void>;

  // Search and filtering
  setSearchQuery: (query: string) => void;
  setSortOrder: (order: CiderStoreState['sortOrder'], direction?: 'asc' | 'desc') => void;
  clearFilters: () => void;

  // Advanced search
  searchByBrand: (brand: string) => CiderMasterRecord[];
  searchByVenue: (venueId: string) => CiderMasterRecord[];
  searchByABVRange: (min: number, max: number) => CiderMasterRecord[];
  searchByRatingRange: (min: number, max: number) => CiderMasterRecord[];

  // Duplicate detection
  findDuplicates: (name: string, brand: string) => Promise<DuplicateDetectionResult>;
  getSimilarCiderNames: (partialName: string) => string[];
  getSimilarBrandNames: (partialBrand: string) => string[];

  // Venue management
  addVenue: (venue: Omit<ConsolidatedVenue, 'id'>) => Promise<string>;
  consolidateVenue: (rawVenueName: string, location?: { latitude: number; longitude: number }) => Promise<ConsolidatedVenue>;
  getVenueSuggestions: (partialName: string) => string[];

  // Analytics
  getBasicAnalytics: () => EnhancedAnalytics | null;
  getTopRatedCiders: (limit?: number) => CiderMasterRecord[];
  getRecentCiders: (days?: number) => CiderMasterRecord[];
  getBrandDistribution: () => Record<string, number>;

  // Utility actions
  clearError: () => void;
  reset: () => void;
}

export type CiderStore = CiderStoreState & CiderStoreActions;

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

// Initial state
const initialState: CiderStoreState = {
  ciders: [],
  venues: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  filteredCiders: [],
  sortOrder: 'dateAdded',
  sortDirection: 'desc',
  analytics: null,
  analyticsLastUpdated: null,
  lastSyncTimestamp: 0,
  isDirty: false,
};

// Create store with subscribeWithSelector middleware for performance
export const useCiderStore = create<CiderStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // =============================================================================
    // CIDER CRUD OPERATIONS
    // =============================================================================

    addCider: async (ciderData) => {
      const currentUserId = 'default-user'; // TODO: Get from auth context

      set({ isLoading: true, error: null });

      try {
        // Create new cider with system fields
        const newCider: CiderMasterRecord = {
          id: `cider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: currentUserId,
          ...ciderData,
          createdAt: new Date(),
          updatedAt: new Date(),
          syncStatus: 'pending',
          version: 1,
        };

        // Save to database
        await sqliteService.createCider(newCider);

        // Queue for Firebase sync
        await syncManager.queueOperation('CREATE_CIDER', newCider);

        // Queue image upload if there's a local photo
        if (isLocalPhoto(newCider.photo)) {
          await queueImageUpload(newCider.id, newCider.photo!);
        }

        // Update store
        set(state => {
          const newCiders = [newCider, ...state.ciders];
          // Apply current filters to include new cider if it matches
          const filteredCiders = state.searchQuery
            ? newCiders.filter(cider =>
                cider.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                cider.brand.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                (cider.notes && cider.notes.toLowerCase().includes(state.searchQuery.toLowerCase())) ||
                (cider.tasteTags && cider.tasteTags.some(tag =>
                  tag.toLowerCase().includes(state.searchQuery.toLowerCase())
                ))
              )
            : newCiders;

          return {
            ciders: newCiders,
            filteredCiders,
            isDirty: true,
            isLoading: false,
          };
        });

        // Trigger analytics refresh
        get().refreshAnalytics();

        return newCider.id;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to add cider';
        set({ error: errorMessage, isLoading: false });
        throw error;
      }
    },

    updateCider: async (id, updates) => {
      set({ isLoading: true, error: null });

      try {
        const existingCider = get().ciders.find(c => c.id === id);
        if (!existingCider) {
          throw new Error('Cider not found');
        }

        const updatedCider: CiderMasterRecord = {
          ...existingCider,
          ...updates,
          updatedAt: new Date(),
          version: existingCider.version + 1,
          syncStatus: 'pending',
        };

        // Update in database
        await sqliteService.updateCider(id, updatedCider);

        // Queue for Firebase sync
        await syncManager.queueOperation('UPDATE_CIDER', updatedCider);

        // Queue image upload if there's a new local photo
        // Only upload if the photo changed and is a local file
        const photoChanged = updates.photo && updates.photo !== existingCider.photo;
        if (photoChanged && isLocalPhoto(updates.photo)) {
          await queueImageUpload(id, updates.photo!);
        }

        // Update store
        set(state => {
          const newCiders = state.ciders.map(c => c.id === id ? updatedCider : c);
          // Apply current filters
          const filteredCiders = state.searchQuery
            ? newCiders.filter(cider =>
                cider.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                cider.brand.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                (cider.notes && cider.notes.toLowerCase().includes(state.searchQuery.toLowerCase())) ||
                (cider.tasteTags && cider.tasteTags.some(tag =>
                  tag.toLowerCase().includes(state.searchQuery.toLowerCase())
                ))
              )
            : newCiders;

          return {
            ciders: newCiders,
            filteredCiders,
            isDirty: true,
            isLoading: false,
          };
        });

        // Trigger analytics refresh
        get().refreshAnalytics();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update cider';
        set({ error: errorMessage, isLoading: false });
        throw error;
      }
    },

    deleteCider: async (id) => {
      set({ isLoading: true, error: null });

      try {
        // Delete from database
        await sqliteService.deleteCider(id);

        // Queue for Firebase sync
        await syncManager.queueOperation('DELETE_CIDER', { id });

        // Update store
        set(state => {
          const newCiders = state.ciders.filter(c => c.id !== id);
          // Apply current filters
          const filteredCiders = state.searchQuery
            ? newCiders.filter(cider =>
                cider.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                cider.brand.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                (cider.notes && cider.notes.toLowerCase().includes(state.searchQuery.toLowerCase())) ||
                (cider.tasteTags && cider.tasteTags.some(tag =>
                  tag.toLowerCase().includes(state.searchQuery.toLowerCase())
                ))
              )
            : newCiders;

          return {
            ciders: newCiders,
            filteredCiders,
            isDirty: true,
            isLoading: false,
          };
        });

        // Trigger analytics refresh
        get().refreshAnalytics();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete cider';
        set({ error: errorMessage, isLoading: false });
        throw error;
      }
    },

    getCiderById: (id) => {
      return get().ciders.find(c => c.id === id) || null;
    },

    // =============================================================================
    // BATCH OPERATIONS
    // =============================================================================

    addMultipleCiders: async (cidersData) => {
      set({ isLoading: true, error: null });

      try {
        const currentUserId = 'default-user';
        const newCiders: CiderMasterRecord[] = cidersData.map(ciderData => ({
          id: `cider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: currentUserId,
          ...ciderData,
          createdAt: new Date(),
          updatedAt: new Date(),
          syncStatus: 'pending',
          version: 1,
        }));

        // TODO: Batch insert to database
        // await sqliteService.insertMultipleCiders(newCiders);

        // Update store
        set(state => ({
          ciders: [...newCiders, ...state.ciders],
          isDirty: true,
          isLoading: false,
        }));

        return newCiders.map(c => c.id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to add ciders';
        set({ error: errorMessage, isLoading: false });
        throw error;
      }
    },

    deleteMutlipleCiders: async (ids) => {
      set({ isLoading: true, error: null });

      try {
        // TODO: Batch delete from database
        // await sqliteService.deleteMultipleCiders(ids);

        set(state => ({
          ciders: state.ciders.filter(c => !ids.includes(c.id)),
          isDirty: true,
          isLoading: false,
        }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete ciders';
        set({ error: errorMessage, isLoading: false });
        throw error;
      }
    },

    // =============================================================================
    // DATA LOADING AND SYNCING
    // =============================================================================

    loadCiders: async () => {
      set({ isLoading: true, error: null });

      try {
        // Initialize database and load ciders
        await sqliteService.initializeDatabase();
        const ciders = await sqliteService.getAllCiders();

        const { searchQuery } = get();

        // Apply current filters to loaded ciders
        const filteredCiders = searchQuery
          ? ciders.filter(cider =>
              cider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              cider.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (cider.notes && cider.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
              (cider.tasteTags && cider.tasteTags.some(tag =>
                tag.toLowerCase().includes(searchQuery.toLowerCase())
              ))
            )
          : ciders;

        set({
          ciders,
          filteredCiders,
          isLoading: false,
          lastSyncTimestamp: Date.now(),
        });

        // Trigger analytics calculation
        get().refreshAnalytics();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load ciders';
        set({ error: errorMessage, isLoading: false });
      }
    },

    syncWithServer: async () => {
      // TODO: Implement server sync
      set({ lastSyncTimestamp: Date.now(), isDirty: false });
    },

    refreshAnalytics: async () => {
      const { ciders } = get();

      if (ciders.length === 0) {
        set({ analytics: null, analyticsLastUpdated: Date.now() });
        return;
      }

      // Calculate enhanced analytics
      const totalCiders = ciders.length;
      const totalRating = ciders.reduce((sum, c) => sum + c.overallRating, 0);
      const totalAbv = ciders.reduce((sum, c) => sum + c.abv, 0);
      const averageRating = totalRating / totalCiders;
      const averageAbv = totalAbv / totalCiders;

      const sortedByRating = [...ciders].sort((a, b) => b.overallRating - a.overallRating);
      const highestRated = sortedByRating[0];
      const lowestRated = sortedByRating[sortedByRating.length - 1];

      // Rating distribution
      const ratingDistribution = ciders.reduce((dist, c) => {
        dist[c.overallRating] = (dist[c.overallRating] || 0) + 1;
        return dist;
      }, {} as Record<number, number>);

      // Brand analytics
      const brands = [...new Set(ciders.map(c => c.brand))];
      const uniqueBrands = brands.length;
      const avgCidersPerBrand = totalCiders / uniqueBrands;

      // Temporal analytics
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisYear = new Date(now.getFullYear(), 0, 1);

      const cidersThisMonth = ciders.filter(c => c.createdAt >= thisMonth).length;
      const cidersThisYear = ciders.filter(c => c.createdAt >= thisYear).length;

      const analytics: EnhancedAnalytics = {
        totalCiders,
        averageRating: Math.round(averageRating * 10) / 10,
        averageAbv: Math.round(averageAbv * 10) / 10,
        highestRated,
        lowestRated,
        ratingDistribution: ratingDistribution as any,
        abvDistribution: {
          min: Math.min(...ciders.map(c => c.abv)),
          max: Math.max(...ciders.map(c => c.abv)),
          avg: Math.round(averageAbv * 10) / 10,
          median: ciders.sort((a, b) => a.abv - b.abv)[Math.floor(totalCiders / 2)]?.abv || 0
        },
        styleDistribution: {} as any, // TODO: Calculate style distribution
        topVenues: [], // TODO: Calculate venue analytics
        venueTypeDistribution: {} as any,
        cidersThisMonth,
        cidersThisYear,
        monthlyTrend: [], // TODO: Calculate monthly trend
        uniqueBrands,
        avgCidersPerBrand: Math.round(avgCidersPerBrand * 10) / 10,
        mostTried: [] // TODO: Calculate most tried
      };

      set({ analytics, analyticsLastUpdated: Date.now() });
    },

    // =============================================================================
    // SEARCH AND FILTERING
    // =============================================================================

    setSearchQuery: (query) => {
      set({ searchQuery: query });

      const { ciders } = get();
      if (!query.trim()) {
        set({ filteredCiders: ciders });
        return;
      }

      const filtered = ciders.filter(cider =>
        cider.name.toLowerCase().includes(query.toLowerCase()) ||
        cider.brand.toLowerCase().includes(query.toLowerCase()) ||
        (cider.notes && cider.notes.toLowerCase().includes(query.toLowerCase())) ||
        (cider.tasteTags && cider.tasteTags.some(tag =>
          tag.toLowerCase().includes(query.toLowerCase())
        ))
      );

      set({ filteredCiders: filtered });
    },

    setSortOrder: (order, direction = 'desc') => {
      set({ sortOrder: order, sortDirection: direction });

      const { filteredCiders } = get();
      const sorted = [...filteredCiders].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (order) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'brand':
            aValue = a.brand.toLowerCase();
            bValue = b.brand.toLowerCase();
            break;
          case 'rating':
            aValue = a.overallRating;
            bValue = b.overallRating;
            break;
          case 'abv':
            aValue = a.abv;
            bValue = b.abv;
            break;
          case 'dateAdded':
            aValue = a.createdAt.getTime();
            bValue = b.createdAt.getTime();
            break;
          default:
            return 0;
        }

        if (direction === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });

      set({ filteredCiders: sorted });
    },

    clearFilters: () => {
      const { ciders } = get();
      set({
        searchQuery: '',
        filteredCiders: ciders,
        sortOrder: 'dateAdded',
        sortDirection: 'desc'
      });
    },

    // =============================================================================
    // ADVANCED SEARCH
    // =============================================================================

    searchByBrand: (brand) => {
      return get().ciders.filter(c =>
        c.brand.toLowerCase().includes(brand.toLowerCase())
      );
    },

    searchByVenue: (venueId) => {
      return get().ciders.filter(c => c.venue?.id === venueId);
    },

    searchByABVRange: (min, max) => {
      return get().ciders.filter(c => c.abv >= min && c.abv <= max);
    },

    searchByRatingRange: (min, max) => {
      return get().ciders.filter(c => c.overallRating >= min && c.overallRating <= max);
    },

    // =============================================================================
    // DUPLICATE DETECTION
    // =============================================================================

    findDuplicates: async (name, brand) => {
      const { ciders } = get();
      return await DuplicateDetectionEngine.performDuplicateCheck(name, brand, undefined, undefined, ciders);
    },

    getSimilarCiderNames: (partialName) => {
      const { ciders } = get();
      return DuplicateDetectionEngine.getSimilarCiderNames(partialName, ciders);
    },

    getSimilarBrandNames: (partialBrand) => {
      const { ciders } = get();
      return DuplicateDetectionEngine.getSimilarBrandNames(partialBrand, ciders);
    },

    // =============================================================================
    // VENUE MANAGEMENT
    // =============================================================================

    addVenue: async (venueData) => {
      const newVenue: ConsolidatedVenue = {
        id: `venue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...venueData,
      };

      set(state => ({
        venues: [...state.venues, newVenue]
      }));

      return newVenue.id;
    },

    consolidateVenue: async (rawVenueName, location) => {
      return await VenueConsolidationService.consolidateVenueName(rawVenueName, location);
    },

    getVenueSuggestions: (partialName) => {
      const { venues } = get();
      return VenueConsolidationService.getVenueSuggestions(partialName, venues);
    },

    // =============================================================================
    // ANALYTICS
    // =============================================================================

    getBasicAnalytics: () => {
      return get().analytics;
    },

    getTopRatedCiders: (limit = 10) => {
      const { ciders } = get();
      return [...ciders]
        .sort((a, b) => b.overallRating - a.overallRating)
        .slice(0, limit);
    },

    getRecentCiders: (days = 30) => {
      const { ciders } = get();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return ciders.filter(c => c.createdAt >= cutoffDate);
    },

    getBrandDistribution: () => {
      const { ciders } = get();
      return ciders.reduce((dist, c) => {
        dist[c.brand] = (dist[c.brand] || 0) + 1;
        return dist;
      }, {} as Record<string, number>);
    },

    // =============================================================================
    // UTILITY ACTIONS
    // =============================================================================

    clearError: () => set({ error: null }),

    reset: () => set(initialState),
  }))
);

// =============================================================================
// STORE SELECTORS (for performance optimization)
// =============================================================================

// Selector hooks for specific data slices
export const useCiderList = () => useCiderStore(state => state.filteredCiders);
export const useCiderById = (id: string) => useCiderStore(state => state.getCiderById(id));
export const useAnalytics = () => useCiderStore(state => state.analytics);
export const useStoreLoading = () => useCiderStore(state => state.isLoading);
export const useStoreError = () => useCiderStore(state => state.error);