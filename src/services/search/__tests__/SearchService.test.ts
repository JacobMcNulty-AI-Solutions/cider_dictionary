// Advanced Search Service Tests
// Tests search functionality with various dataset sizes and scenarios

import { SearchService } from '../SearchService';
import { CiderMasterRecord } from '../../../types/cider';
import { SearchState, DEFAULT_SEARCH_STATE, FilterState } from '../../../types/search';

describe('SearchService', () => {
  let searchService: SearchService;

  beforeEach(() => {
    searchService = new SearchService();
  });

  // =============================================================================
  // HELPER FUNCTIONS
  // =============================================================================

  const generateMockCider = (id: number): CiderMasterRecord => ({
    id: `cider_${id}`,
    name: `Test Cider ${id}`,
    brand: `Brand ${Math.floor(id / 10)}`,
    abv: 4 + (id % 10) * 0.5,
    style: id % 2 === 0 ? 'Modern' : 'Traditional',
    traditionalStyle: ['English Dry', 'French', 'Spanish', 'New England'][id % 4],
    overallRating: 1 + (id % 10),
    tasteTags: id % 3 === 0 ? ['Fruity', 'Sweet'] : ['Dry', 'Crisp'],
    sweetness: ['Dry', 'Off-Dry', 'Semi-Sweet', 'Sweet'][id % 4],
    carbonation: ['Still', 'Petillant', 'Sparkling'][id % 3],
    clarity: ['Clear', 'Hazy', 'Cloudy'][id % 3],
    color: ['Pale', 'Golden', 'Amber'][id % 3],
    photo: id % 5 === 0 ? 'https://example.com/photo.jpg' : null,
    notes: id % 2 === 0 ? `Notes for cider ${id}` : null,
    userId: 'test-user',
    syncStatus: 'synced',
    version: 1,
    createdAt: new Date(2024, 0, id % 30 + 1),
    updatedAt: new Date(2024, 0, id % 30 + 1),
  });

  const generateMockCiders = (count: number): CiderMasterRecord[] => {
    return Array.from({ length: count }, (_, i) => generateMockCider(i));
  };

  // =============================================================================
  // INDEX BUILDING TESTS
  // =============================================================================

  describe('buildSearchIndex', () => {
    it('should build index for empty array', () => {
      const ciders: CiderMasterRecord[] = [];
      searchService.buildSearchIndex(ciders);

      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        query: 'test',
      };

      const results = searchService.performAdvancedSearch(searchState);
      expect(results).toEqual([]);
    });

    it('should build index for single cider', () => {
      const ciders = [generateMockCider(0)];
      searchService.buildSearchIndex(ciders);

      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        query: 'Test Cider',
      };

      const results = searchService.performAdvancedSearch(searchState);
      expect(results.length).toBe(1);
      expect(results[0].cider.id).toBe('cider_0');
    });

    it('should build index for 100 ciders in under 100ms', () => {
      const ciders = generateMockCiders(100);
      const startTime = Date.now();

      searchService.buildSearchIndex(ciders);

      const buildTime = Date.now() - startTime;
      expect(buildTime).toBeLessThan(100);
    });

    it('should build index for 1000 ciders in under 500ms', () => {
      const ciders = generateMockCiders(1000);
      const startTime = Date.now();

      searchService.buildSearchIndex(ciders);

      const buildTime = Date.now() - startTime;
      expect(buildTime).toBeLessThan(500);
    });
  });

  // =============================================================================
  // TEXT SEARCH TESTS
  // =============================================================================

  describe('performAdvancedSearch - Text Query', () => {
    beforeEach(() => {
      const ciders = generateMockCiders(100);
      searchService.buildSearchIndex(ciders);
    });

    it('should return all ciders for empty query', () => {
      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        query: '',
      };

      const results = searchService.performAdvancedSearch(searchState);
      expect(results.length).toBe(100);
    });

    it('should find exact matches', () => {
      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        query: 'Test Cider 5',
      };

      const results = searchService.performAdvancedSearch(searchState);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].cider.name).toBe('Test Cider 5');
    });

    it('should find partial matches', () => {
      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        query: 'Brand 5',
      };

      const results = searchService.performAdvancedSearch(searchState);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.cider.brand.includes('Brand 5'))).toBe(true);
    });

    it('should be case insensitive', () => {
      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        query: 'BRAND 5',
      };

      const results = searchService.performAdvancedSearch(searchState);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search across multiple fields', () => {
      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        query: 'fruity',
      };

      const results = searchService.performAdvancedSearch(searchState);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.cider.tasteTags?.includes('Fruity'))).toBe(true);
    });
  });

  // =============================================================================
  // FILTER TESTS
  // =============================================================================

  describe('performAdvancedSearch - Filters', () => {
    beforeEach(() => {
      const ciders = generateMockCiders(100);
      searchService.buildSearchIndex(ciders);
    });

    it('should filter by rating range', () => {
      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        filters: {
          ...DEFAULT_SEARCH_STATE.filters,
          ratingRange: [8, 10],
        },
      };

      const results = searchService.performAdvancedSearch(searchState);
      expect(results.every(r => r.cider.overallRating >= 8)).toBe(true);
    });

    it('should filter by ABV range', () => {
      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        filters: {
          ...DEFAULT_SEARCH_STATE.filters,
          abvRange: [6, 8],
        },
      };

      const results = searchService.performAdvancedSearch(searchState);
      expect(results.every(r => r.cider.abv >= 6 && r.cider.abv <= 8)).toBe(true);
    });

    it('should filter by traditional style', () => {
      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        filters: {
          ...DEFAULT_SEARCH_STATE.filters,
          traditionalStyles: new Set(['English Dry']),
        },
      };

      const results = searchService.performAdvancedSearch(searchState);
      expect(results.every(r => r.cider.traditionalStyle === 'English Dry')).toBe(true);
    });

    it('should filter by taste tags (AND logic)', () => {
      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        filters: {
          ...DEFAULT_SEARCH_STATE.filters,
          tasteTags: new Set(['Fruity', 'Sweet']),
        },
      };

      const results = searchService.performAdvancedSearch(searchState);
      expect(results.every(r => {
        const tags = r.cider.tasteTags || [];
        return tags.includes('Fruity') && tags.includes('Sweet');
      })).toBe(true);
    });

    it('should filter by characteristics', () => {
      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        filters: {
          ...DEFAULT_SEARCH_STATE.filters,
          characteristics: {
            sweetness: new Set(['Sweet']),
            carbonation: new Set(),
            clarity: new Set(),
            color: new Set(),
          },
        },
      };

      const results = searchService.performAdvancedSearch(searchState);
      expect(results.every(r => r.cider.sweetness === 'Sweet')).toBe(true);
    });

    it('should filter by hasPhoto', () => {
      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        filters: {
          ...DEFAULT_SEARCH_STATE.filters,
          hasPhoto: true,
        },
      };

      const results = searchService.performAdvancedSearch(searchState);
      expect(results.every(r => r.cider.photo !== null)).toBe(true);
    });

    it('should combine multiple filters', () => {
      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        filters: {
          ...DEFAULT_SEARCH_STATE.filters,
          ratingRange: [7, 10],
          abvRange: [5, 10],
          hasPhoto: true,
        },
      };

      const results = searchService.performAdvancedSearch(searchState);
      expect(results.every(r =>
        r.cider.overallRating >= 7 &&
        r.cider.abv >= 5 &&
        r.cider.photo !== null
      )).toBe(true);
    });
  });

  // =============================================================================
  // SORTING TESTS
  // =============================================================================

  describe('performAdvancedSearch - Sorting', () => {
    beforeEach(() => {
      const ciders = generateMockCiders(50);
      searchService.buildSearchIndex(ciders);
    });

    it('should sort by name ascending', () => {
      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        sortBy: 'name',
        sortDirection: 'asc',
      };

      const results = searchService.performAdvancedSearch(searchState);
      expect(results.length).toBeGreaterThan(1);

      for (let i = 1; i < results.length; i++) {
        expect(results[i].cider.name >= results[i - 1].cider.name).toBe(true);
      }
    });

    it('should sort by rating descending', () => {
      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        sortBy: 'rating',
        sortDirection: 'desc',
      };

      const results = searchService.performAdvancedSearch(searchState);
      expect(results.length).toBeGreaterThan(1);

      for (let i = 1; i < results.length; i++) {
        expect(results[i].cider.overallRating <= results[i - 1].cider.overallRating).toBe(true);
      }
    });

    it('should sort by ABV ascending', () => {
      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        sortBy: 'abv',
        sortDirection: 'asc',
      };

      const results = searchService.performAdvancedSearch(searchState);
      expect(results.length).toBeGreaterThan(1);

      for (let i = 1; i < results.length; i++) {
        expect(results[i].cider.abv >= results[i - 1].cider.abv).toBe(true);
      }
    });

    it('should sort by relevance for text queries', () => {
      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        query: 'Test Cider',
        sortBy: 'relevance',
        sortDirection: 'desc',
      };

      const results = searchService.performAdvancedSearch(searchState);
      expect(results.length).toBeGreaterThan(1);

      // Relevance should be in descending order
      for (let i = 1; i < results.length; i++) {
        expect(results[i].relevanceScore <= results[i - 1].relevanceScore).toBe(true);
      }
    });
  });

  // =============================================================================
  // PERFORMANCE TESTS
  // =============================================================================

  describe('Performance', () => {
    it('should search 100 ciders in under 50ms', () => {
      const ciders = generateMockCiders(100);
      searchService.buildSearchIndex(ciders);

      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        query: 'test cider',
      };

      const startTime = Date.now();
      const results = searchService.performAdvancedSearch(searchState);
      const searchTime = Date.now() - startTime;

      expect(searchTime).toBeLessThan(50);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search 500 ciders in under 75ms', () => {
      const ciders = generateMockCiders(500);
      searchService.buildSearchIndex(ciders);

      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        query: 'brand',
      };

      const startTime = Date.now();
      const results = searchService.performAdvancedSearch(searchState);
      const searchTime = Date.now() - startTime;

      expect(searchTime).toBeLessThan(75);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search 1000 ciders in under 100ms', () => {
      const ciders = generateMockCiders(1000);
      searchService.buildSearchIndex(ciders);

      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        query: 'fruity',
      };

      const startTime = Date.now();
      const results = searchService.performAdvancedSearch(searchState);
      const searchTime = Date.now() - startTime;

      expect(searchTime).toBeLessThan(100);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should cache search results', () => {
      const ciders = generateMockCiders(100);
      searchService.buildSearchIndex(ciders);

      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        query: 'test',
      };

      // First search (not cached)
      const startTime1 = Date.now();
      const results1 = searchService.performAdvancedSearch(searchState);
      const searchTime1 = Date.now() - startTime1;

      // Second search (cached)
      const startTime2 = Date.now();
      const results2 = searchService.performAdvancedSearch(searchState);
      const searchTime2 = Date.now() - startTime2;

      // Cached search should be much faster (< 5ms)
      expect(searchTime2).toBeLessThan(5);
      expect(results1).toEqual(results2);
    });
  });

  // =============================================================================
  // FUZZY MATCHING TESTS
  // =============================================================================

  describe('Fuzzy Matching', () => {
    beforeEach(() => {
      const ciders: CiderMasterRecord[] = [
        {
          ...generateMockCider(0),
          name: 'Angry Orchard',
          brand: 'Boston Beer Company',
        },
        {
          ...generateMockCider(1),
          name: 'Angree Orchrd',
          brand: 'Test Brand',
        },
      ];
      searchService.buildSearchIndex(ciders);
    });

    it('should find fuzzy matches with typos', () => {
      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        query: 'angri orchrd', // Typos
      };

      const results = searchService.performAdvancedSearch(searchState);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should rank exact matches higher than fuzzy matches', () => {
      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        query: 'angry orchard',
        sortBy: 'relevance',
      };

      const results = searchService.performAdvancedSearch(searchState);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].cider.name).toBe('Angry Orchard');
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('Edge Cases', () => {
    it('should handle special characters in query', () => {
      const ciders = generateMockCiders(10);
      searchService.buildSearchIndex(ciders);

      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        query: 'test & cider!',
      };

      expect(() => {
        searchService.performAdvancedSearch(searchState);
      }).not.toThrow();
    });

    it('should handle very long queries', () => {
      const ciders = generateMockCiders(10);
      searchService.buildSearchIndex(ciders);

      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        query: 'a'.repeat(200),
      };

      const results = searchService.performAdvancedSearch(searchState);
      expect(results).toBeDefined();
    });

    it('should handle empty string query', () => {
      const ciders = generateMockCiders(10);
      searchService.buildSearchIndex(ciders);

      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        query: '',
      };

      const results = searchService.performAdvancedSearch(searchState);
      expect(results.length).toBe(10);
    });

    it('should handle queries with only whitespace', () => {
      const ciders = generateMockCiders(10);
      searchService.buildSearchIndex(ciders);

      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        query: '   ',
      };

      const results = searchService.performAdvancedSearch(searchState);
      expect(results.length).toBe(10);
    });

    it('should handle invalid filter ranges', () => {
      const ciders = generateMockCiders(10);
      searchService.buildSearchIndex(ciders);

      const searchState: SearchState = {
        ...DEFAULT_SEARCH_STATE,
        filters: {
          ...DEFAULT_SEARCH_STATE.filters,
          ratingRange: [10, 1], // Invalid range (min > max)
        },
      };

      expect(() => {
        searchService.performAdvancedSearch(searchState);
      }).not.toThrow();
    });
  });
});
