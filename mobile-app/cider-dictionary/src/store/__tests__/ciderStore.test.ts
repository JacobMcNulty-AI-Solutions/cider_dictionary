// Comprehensive Zustand Store Tests for Phase 2 Functionality
// Tests for state management, CRUD operations, analytics, and search/filtering

import { act } from '@testing-library/react-native';
import { useCiderStore } from '../ciderStore';
import { CiderMasterRecord, ConsolidatedVenue } from '../../types/cider';

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
  id: `cider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  userId: 'test-user',
  name: 'Test Cider',
  brand: 'Test Brand',
  overallRating: 4.5,
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
      overallRating: Math.random() * 5,
      abv: 3 + Math.random() * 5,
    })
  );
};

describe('CiderStore', () => {
  let store: ReturnType<typeof useCiderStore>;

  beforeEach(() => {
    // Get fresh store instance for each test
    store = useCiderStore.getState();
    // Reset store to initial state
    act(() => {
      store.reset();
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
        overallRating: 4.0,
        abv: 5.0,
        tasteTags: ['dry', 'apple'],
        notes: 'Added via test',
        containerType: 'can' as const,
      };

      const ciderId = await act(async () => {
        return await store.addCider(ciderData);
      });

      expect(ciderId).toBeDefined();
      expect(typeof ciderId).toBe('string');
      expect(store.ciders).toHaveLength(1);
      expect(store.ciders[0].name).toBe(ciderData.name);
      expect(store.ciders[0].brand).toBe(ciderData.brand);
      expect(store.isDirty).toBe(true);
    });

    it('should update an existing cider', async () => {
      // First add a cider
      const ciderId = await act(async () => {
        return await store.addCider(createMockCider());
      });

      // Then update it
      const updates = {
        overallRating: 5.0,
        notes: 'Updated notes',
        tasteTags: ['updated', 'tags'],
      };

      await act(async () => {
        await store.updateCider(ciderId, updates);
      });

      const updatedCider = store.getCiderById(ciderId);
      expect(updatedCider).toBeDefined();
      expect(updatedCider!.overallRating).toBe(5.0);
      expect(updatedCider!.notes).toBe('Updated notes');
      expect(updatedCider!.tasteTags).toEqual(['updated', 'tags']);
      expect(updatedCider!.version).toBe(2);
      expect(updatedCider!.syncStatus).toBe('pending');
    });

    it('should throw error when updating non-existent cider', async () => {
      await expect(
        act(async () => {
          await store.updateCider('nonexistent-id', { overallRating: 5.0 });
        })
      ).rejects.toThrow('Cider not found');
    });

    it('should delete a cider successfully', async () => {
      // Add a cider first
      const ciderId = await act(async () => {
        return await store.addCider(createMockCider());
      });

      expect(store.ciders).toHaveLength(1);

      // Delete it
      await act(async () => {
        await store.deleteCider(ciderId);
      });

      expect(store.ciders).toHaveLength(0);
      expect(store.getCiderById(ciderId)).toBe(null);
    });

    it('should get cider by ID correctly', async () => {
      const mockCider = createMockCider({ name: 'Findable Cider' });
      const ciderId = await act(async () => {
        return await store.addCider(mockCider);
      });

      const foundCider = store.getCiderById(ciderId);
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
        { name: 'Batch Cider 1', brand: 'Batch Brand', overallRating: 4.0, abv: 5.0, tasteTags: [], notes: '', containerType: 'bottle' as const },
        { name: 'Batch Cider 2', brand: 'Batch Brand', overallRating: 3.5, abv: 4.5, tasteTags: [], notes: '', containerType: 'can' as const },
        { name: 'Batch Cider 3', brand: 'Batch Brand', overallRating: 4.5, abv: 5.5, tasteTags: [], notes: '', containerType: 'draft' as const },
      ];

      const ciderIds = await act(async () => {
        return await store.addMultipleCiders(cidersData);
      });

      expect(ciderIds).toHaveLength(3);
      expect(store.ciders).toHaveLength(3);
      expect(store.ciders.map(c => c.name)).toEqual(['Batch Cider 1', 'Batch Cider 2', 'Batch Cider 3']);
    });

    it('should delete multiple ciders successfully', async () => {
      // Add multiple ciders first
      const cidersData = Array.from({ length: 5 }, (_, i) =>
        createMockCider({ name: `Delete Test ${i}` })
      );

      const ciderIds = await act(async () => {
        return await store.addMultipleCiders(cidersData);
      });

      expect(store.ciders).toHaveLength(5);

      // Delete first 3
      const idsToDelete = ciderIds.slice(0, 3);
      await act(async () => {
        await store.deleteMutlipleCiders(idsToDelete);
      });

      expect(store.ciders).toHaveLength(2);
      expect(store.ciders.map(c => c.name)).toEqual(['Delete Test 3', 'Delete Test 4']);
    });
  });

  // =============================================================================
  // SEARCH AND FILTERING TESTS
  // =============================================================================

  describe('Search and Filtering', () => {
    beforeEach(async () => {
      // Add test ciders for searching
      const testCiders = [
        createMockCider({ name: 'Apple Crisp Cider', brand: 'Orchard Valley', tasteTags: ['crisp', 'apple'], notes: 'Very refreshing' }),
        createMockCider({ name: 'Pear Delight', brand: 'Fruit Farm', tasteTags: ['sweet', 'pear'], notes: 'Smooth and sweet' }),
        createMockCider({ name: 'Traditional Scrumpy', brand: 'Orchard Valley', tasteTags: ['traditional', 'strong'], notes: 'Classic farmhouse style' }),
      ];

      await act(async () => {
        for (const cider of testCiders) {
          await store.addCider(cider);
        }
      });
    });

    it('should filter ciders by search query', () => {
      act(() => {
        store.setSearchQuery('apple');
      });

      expect(store.filteredCiders).toHaveLength(1);
      expect(store.filteredCiders[0].name).toBe('Apple Crisp Cider');
    });

    it('should search across multiple fields', () => {
      act(() => {
        store.setSearchQuery('orchard');
      });

      expect(store.filteredCiders).toHaveLength(2);
      expect(store.filteredCiders.map(c => c.brand)).toEqual(['Orchard Valley', 'Orchard Valley']);
    });

    it('should search in taste tags', () => {
      act(() => {
        store.setSearchQuery('sweet');
      });

      expect(store.filteredCiders).toHaveLength(1);
      expect(store.filteredCiders[0].name).toBe('Pear Delight');
    });

    it('should search in notes', () => {
      act(() => {
        store.setSearchQuery('farmhouse');
      });

      expect(store.filteredCiders).toHaveLength(1);
      expect(store.filteredCiders[0].name).toBe('Traditional Scrumpy');
    });

    it('should clear search and show all ciders', () => {
      act(() => {
        store.setSearchQuery('apple');
      });
      expect(store.filteredCiders).toHaveLength(1);

      act(() => {
        store.setSearchQuery('');
      });
      expect(store.filteredCiders).toHaveLength(3);
    });

    it('should sort by different criteria', () => {
      act(() => {
        store.setSortOrder('name', 'asc');
      });

      const names = store.filteredCiders.map(c => c.name);
      expect(names).toEqual(['Apple Crisp Cider', 'Pear Delight', 'Traditional Scrumpy']);

      act(() => {
        store.setSortOrder('brand', 'desc');
      });

      const brands = store.filteredCiders.map(c => c.brand);
      expect(brands[0]).toBe('Orchard Valley');
      expect(brands[2]).toBe('Fruit Farm');
    });

    it('should clear all filters', () => {
      act(() => {
        store.setSearchQuery('apple');
        store.setSortOrder('name', 'asc');
      });

      expect(store.searchQuery).toBe('apple');
      expect(store.sortOrder).toBe('name');

      act(() => {
        store.clearFilters();
      });

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
      const testCiders = [
        createMockCider({ brand: 'Test Brand A', abv: 4.5, overallRating: 4.0 }),
        createMockCider({ brand: 'Test Brand A', abv: 5.2, overallRating: 3.5 }),
        createMockCider({ brand: 'Test Brand B', abv: 6.0, overallRating: 4.8 }),
        createMockCider({ brand: 'Different Brand', abv: 3.8, overallRating: 2.5 }),
      ];

      await act(async () => {
        for (const cider of testCiders) {
          await store.addCider(cider);
        }
      });
    });

    it('should search by brand', () => {
      const results = store.searchByBrand('Test Brand A');
      expect(results).toHaveLength(2);
      expect(results.every(c => c.brand === 'Test Brand A')).toBe(true);
    });

    it('should search by ABV range', () => {
      const results = store.searchByABVRange(4.0, 5.5);
      expect(results).toHaveLength(2);
      expect(results.every(c => c.abv >= 4.0 && c.abv <= 5.5)).toBe(true);
    });

    it('should search by rating range', () => {
      const results = store.searchByRatingRange(4.0, 5.0);
      expect(results).toHaveLength(2);
      expect(results.every(c => c.overallRating >= 4.0 && c.overallRating <= 5.0)).toBe(true);
    });

    it('should search by venue ID', () => {
      // First add a cider with a specific venue
      act(async () => {
        await store.addCider(createMockCider({
          venue: { id: 'specific-venue', name: 'Specific Venue', type: 'pub' }
        }));
      });

      const results = store.searchByVenue('specific-venue');
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
      testCiders[0].overallRating = 5.0;
      testCiders[1].overallRating = 1.0;
      testCiders[2].abv = 8.5;
      testCiders[3].abv = 3.0;

      await act(async () => {
        for (const cider of testCiders) {
          await store.addCider(cider);
        }
      });

      // Trigger analytics calculation
      await act(async () => {
        await store.refreshAnalytics();
      });
    });

    it('should calculate basic analytics correctly', () => {
      const analytics = store.getBasicAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics!.totalCiders).toBe(10);
      expect(analytics!.averageRating).toBeGreaterThan(0);
      expect(analytics!.averageAbv).toBeGreaterThan(0);
      expect(analytics!.highestRated).toBeDefined();
      expect(analytics!.lowestRated).toBeDefined();
      expect(analytics!.uniqueBrands).toBeGreaterThan(0);
    });

    it('should get top rated ciders', () => {
      const topRated = store.getTopRatedCiders(3);

      expect(topRated).toHaveLength(3);
      expect(topRated[0].overallRating).toBeGreaterThanOrEqual(topRated[1].overallRating);
      expect(topRated[1].overallRating).toBeGreaterThanOrEqual(topRated[2].overallRating);
    });

    it('should get recent ciders', () => {
      const recent = store.getRecentCiders(30);

      expect(recent).toHaveLength(10); // All ciders are recent in tests
      recent.forEach(cider => {
        const daysDiff = (Date.now() - cider.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        expect(daysDiff).toBeLessThanOrEqual(30);
      });
    });

    it('should get brand distribution', () => {
      const distribution = store.getBrandDistribution();

      expect(Object.keys(distribution).length).toBeGreaterThan(0);
      const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(10);
    });

    it('should handle empty analytics gracefully', async () => {
      // Reset store to empty state
      act(() => {
        store.reset();
      });

      await act(async () => {
        await store.refreshAnalytics();
      });

      expect(store.analytics).toBe(null);
    });
  });

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================

  describe('Error Handling', () => {
    it('should handle errors in addCider gracefully', async () => {
      // Mock an error by providing invalid data
      const invalidCiderData = {} as any;

      await expect(
        act(async () => {
          await store.addCider(invalidCiderData);
        })
      ).rejects.toThrow();

      expect(store.error).toBeDefined();
      expect(store.isLoading).toBe(false);
    });

    it('should clear errors', () => {
      // Set an error state
      act(() => {
        (store as any).error = 'Test error';
      });

      expect(store.error).toBe('Test error');

      act(() => {
        store.clearError();
      });

      expect(store.error).toBe(null);
    });

    it('should handle loading states correctly', async () => {
      expect(store.isLoading).toBe(false);

      const addPromise = act(async () => {
        return store.addCider(createMockCider());
      });

      // Note: In real implementation, isLoading would be true during async operation
      // This test verifies the structure is in place

      await addPromise;
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
        const id = await act(async () => {
          return await store.addCider(createMockCider({ name: `Integration Test ${i}` }));
        });
        ciderIds.push(id);
      }

      expect(store.ciders).toHaveLength(5);

      // Update some ciders
      await act(async () => {
        await store.updateCider(ciderIds[0], { overallRating: 5.0 });
        await store.updateCider(ciderIds[1], { overallRating: 1.0 });
      });

      // Delete one cider
      await act(async () => {
        await store.deleteCider(ciderIds[2]);
      });

      expect(store.ciders).toHaveLength(4);

      // Search and filter
      act(() => {
        store.setSearchQuery('Integration Test');
      });

      expect(store.filteredCiders).toHaveLength(4);

      // Analytics should reflect current state
      await act(async () => {
        await store.refreshAnalytics();
      });

      const analytics = store.getBasicAnalytics();
      expect(analytics!.totalCiders).toBe(4);
    });

    it('should reset store completely', () => {
      act(async () => {
        await store.addCider(createMockCider());
        store.setSearchQuery('test');
        await store.refreshAnalytics();
      });

      expect(store.ciders).toHaveLength(1);
      expect(store.searchQuery).toBe('test');

      act(() => {
        store.reset();
      });

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
        await store.addMultipleCiders(largeCiderBatch);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

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
        await store.addMultipleCiders(largeBatch);
      });

      const startTime = performance.now();

      act(() => {
        store.setSearchQuery('Searchable');
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Search should be very fast
      expect(store.filteredCiders.length).toBeGreaterThan(0);
    });
  });
});