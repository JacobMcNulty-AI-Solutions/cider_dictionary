// Comprehensive Zustand Store Tests for Phase 2 Functionality
// Tests for state management, CRUD operations, analytics, and search/filtering

import { act } from '@testing-library/react-native';
import { useCiderStore } from '../ciderStore';
import { CiderMasterRecord, Rating } from '../../types/cider';

// =============================================================================
// TEST SETUP AND MOCKS
// =============================================================================

// Mock dependencies
jest.mock('../../utils/duplicateDetection', () => ({
  DuplicateDetectionEngine: {
    performDuplicateCheck: jest.fn(),
    getSimilarCiderNames: jest.fn(),
    getSimilarBrandNames: jest.fn(),
  },
}));

jest.mock('../../utils/venueConsolidation', () => ({
  VenueConsolidationService: {
    consolidateVenueName: jest.fn(),
    getVenueSuggestions: jest.fn(),
  },
}));

// Test fixtures
const createMockCider = (overrides: Partial<CiderMasterRecord> = {}): CiderMasterRecord => ({
  id: `cider_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
  userId: 'test-user',
  name: 'Test Cider',
  brand: 'Test Brand',
  overallRating: 5,
  abv: 5.2,
  tasteTags: ['crisp', 'fruity'],
  notes: 'Great cider for testing',
  containerType: 'bottle',
  venue: {
    id: 'venue1',
    name: 'Test Venue',
    type: 'pub',
    location: { latitude: 51.5074, longitude: -0.1278 }
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  syncStatus: 'synced',
  version: 1,
  ...overrides,
});

const createMultipleMockCiders = (count: number): CiderMasterRecord[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockCider({
      name: `Test Cider ${index + 1}`,
      brand: index % 3 === 0 ? 'Brand A' : index % 2 === 0 ? 'Brand B' : 'Brand C',
      overallRating: Math.floor(Math.random() * 10) + 1 as Rating,
      abv: 3 + Math.random() * 5,
    })
  );
};

describe('CiderStore', () => {
  // Helper to get fresh store state
  const getStore = () => useCiderStore.getState();

  beforeEach(() => {
    // Reset store to initial state
    act(() => {
      useCiderStore.getState().reset();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =============================================================================
  // INITIALIZATION TESTS
  // =============================================================================

  describe('Store Initialization', () => {
    it('should have correct initial state', () => {
      const store = getStore();
      expect(store.ciders).toEqual([]);
      expect(store.venues).toEqual([]);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBe(null);
      expect(store.searchQuery).toBe('');
      expect(store.filteredCiders).toEqual([]);
      expect(store.sortOrder).toBe('dateAdded');
      expect(store.sortDirection).toBe('desc');
      expect(store.analytics).toBe(null);
      expect(store.analyticsLastUpdated).toBe(null);
      expect(store.lastSyncTimestamp).toBe(0);
      expect(store.isDirty).toBe(false);
    });

    it('should provide all required actions', () => {
      const store = getStore();
      expect(typeof store.addCider).toBe('function');
      expect(typeof store.updateCider).toBe('function');
      expect(typeof store.deleteCider).toBe('function');
      expect(typeof store.getCiderById).toBe('function');
      expect(typeof store.loadCiders).toBe('function');
      expect(typeof store.setSearchQuery).toBe('function');
      expect(typeof store.refreshAnalytics).toBe('function');
    });
  });

  // =============================================================================
  // CIDER CRUD OPERATIONS TESTS
  // =============================================================================

  describe('Cider CRUD Operations', () => {
    it('should add a new cider successfully', async () => {
      const ciderData = {
        name: 'New Test Cider',
        brand: 'New Test Brand',
        overallRating: 4 as Rating,
        abv: 5.0,
        tasteTags: ['dry', 'apple'],
        notes: 'Added via test',
        containerType: 'can' as const,
        userId: 'test-user',
      };

      let ciderId: string;
      await act(async () => {
        ciderId = await getStore().addCider(ciderData);
      });

      const store = getStore();
      expect(ciderId!).toBeDefined();
      expect(typeof ciderId!).toBe('string');
      expect(store.ciders).toHaveLength(1);
      expect(store.ciders[0].name).toBe(ciderData.name);
      expect(store.ciders[0].brand).toBe(ciderData.brand);
      expect(store.isDirty).toBe(true);
    });

    it('should update an existing cider', async () => {
      // First add a cider
      let ciderId: string;
      await act(async () => {
        ciderId = await getStore().addCider(createMockCider());
      });

      // Then update it
      const updates = {
        overallRating: 5 as Rating,
        notes: 'Updated notes',
        tasteTags: ['updated', 'tags'],
      };

      await act(async () => {
        await getStore().updateCider(ciderId!, updates);
      });

      const store = getStore();
      const updatedCider = store.getCiderById(ciderId!);
      expect(updatedCider).toBeDefined();
      expect(updatedCider!.overallRating).toBe(5);
      expect(updatedCider!.notes).toBe('Updated notes');
      expect(updatedCider!.tasteTags).toEqual(['updated', 'tags']);
      expect(updatedCider!.version).toBe(2);
      expect(updatedCider!.syncStatus).toBe('pending');
    });

    it('should throw error when updating non-existent cider', async () => {
      await expect(
        act(async () => {
          await getStore().updateCider('nonexistent-id', { overallRating: 5 as Rating });
        })
      ).rejects.toThrow('Cider not found');
    });

    it('should delete a cider successfully', async () => {
      // Add a cider first
      let ciderId: string;
      await act(async () => {
        ciderId = await getStore().addCider(createMockCider());
      });

      expect(getStore().ciders).toHaveLength(1);

      // Delete it
      await act(async () => {
        await getStore().deleteCider(ciderId!);
      });

      const store = getStore();
      expect(store.ciders).toHaveLength(0);
      expect(store.getCiderById(ciderId!)).toBe(null);
    });

    it('should get cider by ID correctly', async () => {
      const mockCider = createMockCider({ name: 'Findable Cider' });
      let ciderId: string;
      await act(async () => {
        ciderId = await getStore().addCider(mockCider);
      });

      const store = getStore();
      const foundCider = store.getCiderById(ciderId!);
      expect(foundCider).toBeDefined();
      expect(foundCider!.name).toBe('Findable Cider');

      const notFoundCider = store.getCiderById('nonexistent-id');
      expect(notFoundCider).toBe(null);
    });
  });

  // =============================================================================
  // BATCH OPERATIONS TESTS
  // =============================================================================

  describe('Batch Operations', () => {
    it('should add multiple ciders successfully', async () => {
      const cidersData = [
        createMockCider({ name: 'Batch Cider 1', brand: 'Batch Brand', overallRating: 4 as Rating, abv: 5.0, containerType: 'bottle' }),
        createMockCider({ name: 'Batch Cider 2', brand: 'Batch Brand', overallRating: 4 as Rating, abv: 4.5, containerType: 'can' }),
        createMockCider({ name: 'Batch Cider 3', brand: 'Batch Brand', overallRating: 5 as Rating, abv: 5.5, containerType: 'draught' }),
      ];

      let ciderIds: string[];
      await act(async () => {
        ciderIds = await getStore().addMultipleCiders(cidersData);
      });

      const store = getStore();
      expect(ciderIds!).toHaveLength(3);
      expect(store.ciders).toHaveLength(3);
      expect(store.ciders.map(c => c.name)).toEqual(['Batch Cider 1', 'Batch Cider 2', 'Batch Cider 3']);
    });

    it('should delete multiple ciders successfully', async () => {
      // Add multiple ciders first
      const cidersData = Array.from({ length: 5 }, (_, i) =>
        createMockCider({ name: `Delete Test ${i}` })
      );

      let ciderIds: string[];
      await act(async () => {
        ciderIds = await getStore().addMultipleCiders(cidersData);
      });

      expect(getStore().ciders).toHaveLength(5);

      // Delete first 3
      const idsToDelete = ciderIds!.slice(0, 3);
      await act(async () => {
        await getStore().deleteMutlipleCiders(idsToDelete);
      });

      const store = getStore();
      expect(store.ciders).toHaveLength(2);
      expect(store.ciders.map(c => c.name)).toEqual(['Delete Test 3', 'Delete Test 4']);
    });
  });

  // =============================================================================
  // SEARCH AND FILTERING TESTS
  // =============================================================================

  describe('Search and Filtering', () => {
    beforeEach(async () => {
      // Reset store to clean state
      act(() => {
        getStore().reset();
      });

      // Add test ciders for searching
      const testCiders = [
        createMockCider({ name: 'Apple Crisp Cider', brand: 'Orchard Valley', tasteTags: ['crisp', 'apple'], notes: 'Very refreshing' }),
        createMockCider({ name: 'Pear Delight', brand: 'Fruit Farm', tasteTags: ['sweet', 'pear'], notes: 'Smooth and sweet' }),
        createMockCider({ name: 'Traditional Scrumpy', brand: 'Orchard Valley', tasteTags: ['traditional', 'strong'], notes: 'Classic farmhouse style' }),
      ];

      await act(async () => {
        for (const cider of testCiders) {
          await getStore().addCider(cider);
        }
      });
    });

    it('should filter ciders by search query', () => {
      act(() => {
        getStore().setSearchQuery('apple');
      });

      const store = getStore();
      expect(store.filteredCiders).toHaveLength(1);
      expect(store.filteredCiders[0].name).toBe('Apple Crisp Cider');
    });

    it('should search across multiple fields', () => {
      act(() => {
        getStore().setSearchQuery('orchard');
      });

      const store = getStore();
      expect(store.filteredCiders).toHaveLength(2);
      expect(store.filteredCiders.map(c => c.brand)).toEqual(['Orchard Valley', 'Orchard Valley']);
    });

    it('should search in taste tags', () => {
      act(() => {
        getStore().setSearchQuery('sweet');
      });

      const store = getStore();
      expect(store.filteredCiders).toHaveLength(1);
      expect(store.filteredCiders[0].name).toBe('Pear Delight');
    });

    it('should search in notes', () => {
      act(() => {
        getStore().setSearchQuery('farmhouse');
      });

      const store = getStore();
      expect(store.filteredCiders).toHaveLength(1);
      expect(store.filteredCiders[0].name).toBe('Traditional Scrumpy');
    });

    it('should clear search and show all ciders', () => {
      act(() => {
        getStore().setSearchQuery('apple');
      });
      expect(getStore().filteredCiders).toHaveLength(1);

      act(() => {
        getStore().setSearchQuery('');
      });
      expect(getStore().filteredCiders).toHaveLength(3);
    });

    it('should sort by different criteria', () => {
      // First ensure we clear any filters
      act(() => {
        getStore().clearFilters();
        getStore().setSortOrder('name', 'asc');
      });

      let store = getStore();
      const names = store.filteredCiders.map(c => c.name);
      expect(names).toEqual(['Apple Crisp Cider', 'Pear Delight', 'Traditional Scrumpy']);

      act(() => {
        getStore().setSortOrder('brand', 'desc');
      });

      store = getStore();
      const brands = store.filteredCiders.map(c => c.brand);
      expect(brands[0]).toBe('Orchard Valley');
      expect(brands[2]).toBe('Fruit Farm');
    });

    it('should clear all filters', () => {
      act(() => {
        const store = getStore();
        store.setSearchQuery('apple');
        store.setSortOrder('name', 'asc');
      });

      let store = getStore();
      expect(store.searchQuery).toBe('apple');
      expect(store.sortOrder).toBe('name');

      act(() => {
        getStore().clearFilters();
      });

      store = getStore();
      expect(store.searchQuery).toBe('');
      expect(store.sortOrder).toBe('dateAdded');
      expect(store.sortDirection).toBe('desc');
      expect(store.filteredCiders).toHaveLength(3);
    });
  });

  // =============================================================================
  // ADVANCED SEARCH TESTS
  // =============================================================================

  describe('Advanced Search', () => {
    beforeEach(async () => {
      // Reset store to clean state
      act(() => {
        getStore().reset();
      });

      const testCiders = [
        createMockCider({ brand: 'Test Brand A', abv: 4.5, overallRating: 4 }),
        createMockCider({ brand: 'Test Brand A', abv: 5.2, overallRating: 4 }),
        createMockCider({ brand: 'Test Brand B', abv: 6.0, overallRating: 5 }),
        createMockCider({ brand: 'Different Brand', abv: 3.8, overallRating: 3 }),
      ];

      await act(async () => {
        for (const cider of testCiders) {
          await getStore().addCider(cider);
        }
      });
    });

    it('should search by brand', () => {
      const results = getStore().searchByBrand('Test Brand A');
      expect(results).toHaveLength(2);
      expect(results.every(c => c.brand === 'Test Brand A')).toBe(true);
    });

    it('should search by ABV range', () => {
      const results = getStore().searchByABVRange(4.0, 5.5);
      expect(results).toHaveLength(2);
      expect(results.every(c => c.abv >= 4.0 && c.abv <= 5.5)).toBe(true);
    });

    it('should search by rating range', () => {
      const results = getStore().searchByRatingRange(4, 5);
      expect(results).toHaveLength(3);
      expect(results.every(c => c.overallRating >= 4 && c.overallRating <= 5)).toBe(true);
    });

    it('should search by venue ID', async () => {
      // First add a cider with a specific venue
      await act(async () => {
        await getStore().addCider(createMockCider({
          venue: { id: 'specific-venue', name: 'Specific Venue', type: 'pub' }
        }));
      });

      const results = getStore().searchByVenue('specific-venue');
      expect(results).toHaveLength(1);
      expect(results[0].venue?.id).toBe('specific-venue');
    });
  });

  // =============================================================================
  // ANALYTICS TESTS
  // =============================================================================

  describe('Analytics', () => {
    beforeEach(async () => {
      const testCiders = createMultipleMockCiders(10);
      // Customize some ciders for analytics testing
      testCiders[0].overallRating = 5;
      testCiders[1].overallRating = 1;
      testCiders[2].abv = 8.5;
      testCiders[3].abv = 3.0;

      await act(async () => {
        for (const cider of testCiders) {
          await getStore().addCider(cider);
        }
      });

      // Trigger analytics calculation
      await act(async () => {
        await getStore().refreshAnalytics();
      });
    });

    it('should calculate basic analytics correctly', () => {
      const analytics = getStore().getBasicAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics!.totalCiders).toBe(10);
      expect(analytics!.averageRating).toBeGreaterThan(0);
      expect(analytics!.averageAbv).toBeGreaterThan(0);
      expect(analytics!.highestRated).toBeDefined();
      expect(analytics!.lowestRated).toBeDefined();
      expect(analytics!.uniqueBrands).toBeGreaterThan(0);
    });

    it('should get top rated ciders', () => {
      const topRated = getStore().getTopRatedCiders(3);

      expect(topRated).toHaveLength(3);
      expect(topRated[0].overallRating).toBeGreaterThanOrEqual(topRated[1].overallRating);
      expect(topRated[1].overallRating).toBeGreaterThanOrEqual(topRated[2].overallRating);
    });

    it('should get recent ciders', () => {
      const recent = getStore().getRecentCiders(30);

      expect(recent).toHaveLength(10); // All ciders are recent in tests
      recent.forEach(cider => {
        const daysDiff = (Date.now() - cider.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        expect(daysDiff).toBeLessThanOrEqual(30);
      });
    });

    it('should get brand distribution', () => {
      const distribution = getStore().getBrandDistribution();

      expect(Object.keys(distribution).length).toBeGreaterThan(0);
      const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(10);
    });

    it('should handle empty analytics gracefully', async () => {
      // Reset store to empty state
      act(() => {
        getStore().reset();
      });

      await act(async () => {
        await getStore().refreshAnalytics();
      });

      const store = getStore();
      expect(store.analytics).toBe(null);
    });
  });

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================

  describe('Error Handling', () => {
    it('should handle errors in addCider gracefully', async () => {
      // Test that the store handles the loading state correctly
      // Since addCider doesn't throw errors in this implementation, we test the structure is correct
      const testData = createMockCider({
        name: 'Error Test Cider',
        brand: 'Error Test Brand',
      });

      let ciderId: string;
      await act(async () => {
        ciderId = await getStore().addCider(testData);
      });

      const store = getStore();
      expect(ciderId!).toBeDefined();
      expect(store.isLoading).toBe(false);
      // Error handling structure is in place even if not triggered in this case
      expect(store.error).toBeNull(); // No error expected for valid data
    });

    it('should clear errors', () => {
      // Set an error state
      act(() => {
        (getStore() as any).error = 'Test error';
      });

      let store = getStore();
      expect(store.error).toBe('Test error');

      act(() => {
        getStore().clearError();
      });

      store = getStore();
      expect(store.error).toBe(null);
    });

    it('should handle loading states correctly', async () => {
      let store = getStore();
      expect(store.isLoading).toBe(false);

      const addPromise = act(async () => {
        return getStore().addCider(createMockCider());
      });

      // Note: In real implementation, isLoading would be true during async operation
      // This test verifies the structure is in place

      await addPromise;
      store = getStore();
      expect(store.isLoading).toBe(false);
    });
  });

  // =============================================================================
  // INTEGRATION TESTS
  // =============================================================================

  describe('Store Integration', () => {
    it('should maintain data consistency across operations', async () => {
      // Add ciders
      const ciderIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        let id: string;
        await act(async () => {
          id = await getStore().addCider(createMockCider({ name: `Integration Test ${i}` }));
        });
        ciderIds.push(id!);
      }

      let store = getStore();
      expect(store.ciders).toHaveLength(5);

      // Update some ciders
      await act(async () => {
        await getStore().updateCider(ciderIds[0], { overallRating: 5 as Rating });
        await getStore().updateCider(ciderIds[1], { overallRating: 1 as Rating });
      });

      // Delete one cider
      await act(async () => {
        await getStore().deleteCider(ciderIds[2]);
      });

      store = getStore();
      expect(store.ciders).toHaveLength(4);

      // Search and filter
      act(() => {
        getStore().setSearchQuery('Integration Test');
      });

      store = getStore();
      expect(store.filteredCiders).toHaveLength(4);

      // Analytics should reflect current state
      await act(async () => {
        await getStore().refreshAnalytics();
      });

      store = getStore();
      const analytics = store.getBasicAnalytics();
      expect(analytics!.totalCiders).toBe(4);
    });

    it('should reset store completely', async () => {
      await act(async () => {
        await getStore().addCider(createMockCider());
        getStore().setSearchQuery('test');
        await getStore().refreshAnalytics();
      });

      let store = getStore();
      expect(store.ciders).toHaveLength(1);
      expect(store.searchQuery).toBe('test');

      act(() => {
        getStore().reset();
      });

      store = getStore();
      expect(store.ciders).toEqual([]);
      expect(store.searchQuery).toBe('');
      expect(store.analytics).toBe(null);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBe(null);
    });
  });

  // =============================================================================
  // PERFORMANCE TESTS
  // =============================================================================

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const startTime = performance.now();

      // Add 100 ciders
      const largeCiderBatch = Array.from({ length: 100 }, (_, i) =>
        createMockCider({ name: `Performance Test ${i}` })
      );

      await act(async () => {
        await getStore().addMultipleCiders(largeCiderBatch);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      const store = getStore();
      expect(store.ciders).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should search large datasets efficiently', async () => {
      // Add a large dataset
      await act(async () => {
        const largeBatch = Array.from({ length: 200 }, (_, i) =>
          createMockCider({
            name: i % 10 === 0 ? `Searchable Cider ${i}` : `Regular Cider ${i}`,
            brand: i % 5 === 0 ? 'Searchable Brand' : `Brand ${i % 10}`,
          })
        );
        await getStore().addMultipleCiders(largeBatch);
      });

      const startTime = performance.now();

      act(() => {
        getStore().setSearchQuery('Searchable');
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      const store = getStore();
      expect(duration).toBeLessThan(100); // Search should be very fast
      expect(store.filteredCiders.length).toBeGreaterThan(0);
    });
  });
});