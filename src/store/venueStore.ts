// Venue Store - Zustand state management for venues
// Provides reactive state for venue data with SQLite persistence

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Venue, VenueFormData } from '../types/venue';
import { Location } from '../types/experience';
import { venueService, VenueSearchResult } from '../services/venue/VenueService';

interface VenueStoreState {
  // Data
  venues: Venue[];
  recentVenues: Venue[];
  mostVisitedVenues: Venue[];

  // UI State
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;
  searchResults: VenueSearchResult[];
  searchQuery: string;
}

interface VenueStoreActions {
  // Data loading
  loadVenues: () => Promise<void>;
  loadRecentVenues: (limit?: number) => Promise<void>;
  loadMostVisitedVenues: (limit?: number) => Promise<void>;
  refreshAll: () => Promise<void>;

  // CRUD operations
  addVenue: (data: VenueFormData & { location: Location }) => Promise<Venue>;
  updateVenue: (id: string, updates: Partial<VenueFormData>) => Promise<Venue | null>;
  deleteVenue: (id: string) => Promise<boolean>;

  // Getters
  getVenueById: (id: string) => Venue | undefined;
  getVenueCount: () => number;

  // Search
  searchVenues: (query: string, currentLocation?: Location) => Promise<void>;
  clearSearch: () => void;

  // Utilities
  incrementVisitCount: (venueId: string) => Promise<void>;
  clearError: () => void;
}

export type VenueStore = VenueStoreState & VenueStoreActions;

export const useVenueStore = create<VenueStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    venues: [],
    recentVenues: [],
    mostVisitedVenues: [],
    isLoading: false,
    isSearching: false,
    error: null,
    searchResults: [],
    searchQuery: '',

    // Load all venues
    loadVenues: async () => {
      set({ isLoading: true, error: null });
      try {
        const venues = await venueService.getAllVenues();
        set({ venues, isLoading: false });
      } catch (error) {
        console.error('Failed to load venues:', error);
        set({
          error: 'Failed to load venues',
          isLoading: false
        });
      }
    },

    // Load recent venues
    loadRecentVenues: async (limit = 5) => {
      try {
        const recentVenues = await venueService.getRecentVenues(limit);
        set({ recentVenues });
      } catch (error) {
        console.error('Failed to load recent venues:', error);
      }
    },

    // Load most visited venues
    loadMostVisitedVenues: async (limit = 5) => {
      try {
        const mostVisitedVenues = await venueService.getMostVisitedVenues(limit);
        set({ mostVisitedVenues });
      } catch (error) {
        console.error('Failed to load most visited venues:', error);
      }
    },

    // Refresh all venue data
    refreshAll: async () => {
      const { loadVenues, loadRecentVenues, loadMostVisitedVenues } = get();
      await Promise.all([
        loadVenues(),
        loadRecentVenues(),
        loadMostVisitedVenues()
      ]);
    },

    // Add a new venue
    addVenue: async (data) => {
      set({ isLoading: true, error: null });
      try {
        const venue = await venueService.createVenue({
          name: data.name,
          type: data.type,
          location: data.location,
          address: data.address
        });

        set(state => ({
          venues: [venue, ...state.venues.filter(v => v.id !== venue.id)],
          recentVenues: [venue, ...state.recentVenues.filter(v => v.id !== venue.id).slice(0, 4)],
          isLoading: false
        }));

        return venue;
      } catch (error) {
        console.error('Failed to add venue:', error);
        set({
          error: 'Failed to add venue',
          isLoading: false
        });
        throw error;
      }
    },

    // Update a venue
    updateVenue: async (id, updates) => {
      set({ isLoading: true, error: null });
      try {
        const updatedVenue = await venueService.updateVenue(id, updates);

        if (updatedVenue) {
          set(state => ({
            venues: state.venues.map(v =>
              v.id === id ? updatedVenue : v
            ),
            recentVenues: state.recentVenues.map(v =>
              v.id === id ? updatedVenue : v
            ),
            mostVisitedVenues: state.mostVisitedVenues.map(v =>
              v.id === id ? updatedVenue : v
            ),
            isLoading: false
          }));
        } else {
          set({ isLoading: false });
        }

        return updatedVenue;
      } catch (error) {
        console.error('Failed to update venue:', error);
        set({
          error: 'Failed to update venue',
          isLoading: false
        });
        throw error;
      }
    },

    // Delete a venue
    deleteVenue: async (id) => {
      set({ isLoading: true, error: null });
      try {
        const success = await venueService.deleteVenue(id);

        if (success) {
          set(state => ({
            venues: state.venues.filter(v => v.id !== id),
            recentVenues: state.recentVenues.filter(v => v.id !== id),
            mostVisitedVenues: state.mostVisitedVenues.filter(v => v.id !== id),
            isLoading: false
          }));
        } else {
          set({ isLoading: false });
        }

        return success;
      } catch (error) {
        console.error('Failed to delete venue:', error);
        set({
          error: 'Failed to delete venue',
          isLoading: false
        });
        return false;
      }
    },

    // Get venue by ID from state
    getVenueById: (id) => {
      return get().venues.find(v => v.id === id);
    },

    // Get venue count
    getVenueCount: () => {
      return get().venues.length;
    },

    // Search venues
    searchVenues: async (query, currentLocation) => {
      set({ isSearching: true, searchQuery: query });
      try {
        const searchResults = await venueService.searchVenues(query, currentLocation, 20);
        set({ searchResults, isSearching: false });
      } catch (error) {
        console.error('Failed to search venues:', error);
        set({ searchResults: [], isSearching: false });
      }
    },

    // Clear search
    clearSearch: () => {
      set({ searchResults: [], searchQuery: '' });
    },

    // Increment visit count (called when logging experience)
    incrementVisitCount: async (venueId) => {
      try {
        await venueService.incrementVisitCount(venueId);

        // Update local state
        set(state => ({
          venues: state.venues.map(v =>
            v.id === venueId
              ? { ...v, visitCount: v.visitCount + 1, lastVisited: new Date() }
              : v
          ),
          recentVenues: state.recentVenues.map(v =>
            v.id === venueId
              ? { ...v, visitCount: v.visitCount + 1, lastVisited: new Date() }
              : v
          ),
          mostVisitedVenues: state.mostVisitedVenues.map(v =>
            v.id === venueId
              ? { ...v, visitCount: v.visitCount + 1, lastVisited: new Date() }
              : v
          )
        }));
      } catch (error) {
        console.error('Failed to increment visit count:', error);
      }
    },

    // Clear error
    clearError: () => set({ error: null })
  }))
);

// Selectors for common use cases
export const selectVenues = (state: VenueStore) => state.venues;
export const selectRecentVenues = (state: VenueStore) => state.recentVenues;
export const selectMostVisitedVenues = (state: VenueStore) => state.mostVisitedVenues;
export const selectVenueById = (id: string) => (state: VenueStore) =>
  state.venues.find(v => v.id === id);
export const selectIsLoading = (state: VenueStore) => state.isLoading;
export const selectError = (state: VenueStore) => state.error;
export const selectSearchResults = (state: VenueStore) => state.searchResults;

export default useVenueStore;
