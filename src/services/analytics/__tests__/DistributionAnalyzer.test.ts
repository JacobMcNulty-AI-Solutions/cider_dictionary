/**
 * Distribution Analyzer Test Suite
 *
 * Comprehensive tests for distribution analysis service covering:
 * - Rating distributions (1-10)
 * - ABV distributions (binned)
 * - Style distributions (categorical)
 * - Brand distributions (top 10)
 * - Tag distributions (top 10)
 * - Price distributions (binned)
 * - Venue type distributions
 * - Chart formatting
 * - Edge cases and error handling
 * - Performance benchmarks
 *
 * Target: 120+ tests
 */

import { DistributionAnalyzer } from '../DistributionAnalyzer';
import { CiderMasterRecord, Rating, VenueType } from '../../../types/cider';
import { ExperienceLog } from '../../../types/experience';
import { ChartData } from '../../../types/analytics';
import AnalyticsCacheManager from '../AnalyticsCacheManager';

// ============================================================================
// Test Data Factories
// ============================================================================

/**
 * Create a mock cider with specified attributes
 */
function createMockCider(overrides: Partial<CiderMasterRecord> = {}): CiderMasterRecord {
  return {
    id: `cider-${Math.random()}`,
    userId: 'test-user',
    name: 'Test Cider',
    brand: 'Test Brand',
    abv: 5.0,
    overallRating: 7 as Rating,
    sweetness: 'medium',
    tasteTags: [],
    ...overrides,
  } as CiderMasterRecord;
}

/**
 * Create a mock experience log with specified attributes
 */
function createMockExperience(overrides: Partial<ExperienceLog> = {}): ExperienceLog {
  return {
    id: `exp-${Math.random()}`,
    userId: 'test-user',
    ciderId: 'cider-1',
    date: new Date(),
    venue: {
      id: 'venue-1',
      name: 'Test Pub',
      type: 'pub' as VenueType,
    },
    price: 5.0,
    containerSize: 568,
    containerType: 'draught',
    pricePerPint: 5.0,
    createdAt: new Date(),
    updatedAt: new Date(),
    syncStatus: 'synced',
    version: 1,
    ...overrides,
  } as ExperienceLog;
}

// ============================================================================
// Test Suite
// ============================================================================

describe('DistributionAnalyzer', () => {
  let analyzer: DistributionAnalyzer;
  let cacheManager: AnalyticsCacheManager;

  beforeEach(() => {
    cacheManager = AnalyticsCacheManager.getInstance();
    cacheManager.clear(); // Clear before each test
    analyzer = new DistributionAnalyzer(cacheManager);
  });

  afterEach(() => {
    cacheManager.clear();
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('Constructor', () => {
    it('should create instance with provided cache manager', () => {
      const customCache = AnalyticsCacheManager.getInstance();
      const customAnalyzer = new DistributionAnalyzer(customCache);
      expect(customAnalyzer).toBeInstanceOf(DistributionAnalyzer);
    });

    it('should create instance with default cache manager if none provided', () => {
      const defaultAnalyzer = new DistributionAnalyzer();
      expect(defaultAnalyzer).toBeInstanceOf(DistributionAnalyzer);
    });
  });

  // ==========================================================================
  // Singleton Pattern Tests
  // ==========================================================================

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = DistributionAnalyzer.getInstance();
      const instance2 = DistributionAnalyzer.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(DistributionAnalyzer);
    });

    it('should share cache across singleton instances', async () => {
      const ciders = [createMockCider({ overallRating: 8 as Rating })];
      const experiences: ExperienceLog[] = [];

      const instance1 = DistributionAnalyzer.getInstance();
      const result1 = await instance1.computeDistributions(ciders, experiences);

      const instance2 = DistributionAnalyzer.getInstance();
      const result2 = await instance2.computeDistributions(ciders, experiences);

      // Second call should be from cache
      expect(result2.metadata.cached).toBe(true);
    });
  });

  // ==========================================================================
  // Rating Distribution Tests
  // ==========================================================================

  describe('computeRatingDistribution', () => {
    it('should create bins for all ratings 1-10', () => {
      const ciders = [
        createMockCider({ overallRating: 1 as Rating }),
        createMockCider({ overallRating: 5 as Rating }),
        createMockCider({ overallRating: 10 as Rating }),
      ];

      const result = analyzer.computeRatingDistribution(ciders);

      expect(result.labels).toHaveLength(10);
      expect(result.labels).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    });

    it('should count ciders correctly for each rating', () => {
      const ciders = [
        createMockCider({ overallRating: 7 as Rating }),
        createMockCider({ overallRating: 7 as Rating }),
        createMockCider({ overallRating: 8 as Rating }),
        createMockCider({ overallRating: 10 as Rating }),
      ];

      const result = analyzer.computeRatingDistribution(ciders);
      const data = result.datasets[0].data;

      expect(data[6]).toBe(2); // Rating 7 (index 6)
      expect(data[7]).toBe(1); // Rating 8 (index 7)
      expect(data[9]).toBe(1); // Rating 10 (index 9)
      expect(data[0]).toBe(0); // Rating 1 (index 0)
    });

    it('should handle empty bins (no ciders with certain ratings)', () => {
      const ciders = [
        createMockCider({ overallRating: 5 as Rating }),
        createMockCider({ overallRating: 5 as Rating }),
      ];

      const result = analyzer.computeRatingDistribution(ciders);
      const data = result.datasets[0].data;

      expect(data[4]).toBe(2); // Rating 5
      expect(data[0]).toBe(0); // Rating 1
      expect(data[9]).toBe(0); // Rating 10
    });

    it('should handle single rating (all ciders rated same)', () => {
      const ciders = [
        createMockCider({ overallRating: 8 as Rating }),
        createMockCider({ overallRating: 8 as Rating }),
        createMockCider({ overallRating: 8 as Rating }),
      ];

      const result = analyzer.computeRatingDistribution(ciders);
      const data = result.datasets[0].data;

      expect(data[7]).toBe(3); // Rating 8
      expect(result.average).toBe(8);
    });

    it('should calculate average rating correctly', () => {
      const ciders = [
        createMockCider({ overallRating: 6 as Rating }),
        createMockCider({ overallRating: 8 as Rating }),
        createMockCider({ overallRating: 10 as Rating }),
      ];

      const result = analyzer.computeRatingDistribution(ciders);

      expect(result.average).toBe(8); // (6 + 8 + 10) / 3 = 8
    });

    it('should set correct max value', () => {
      const ciders = [
        createMockCider({ overallRating: 7 as Rating }),
        createMockCider({ overallRating: 7 as Rating }),
        createMockCider({ overallRating: 7 as Rating }),
        createMockCider({ overallRating: 8 as Rating }),
      ];

      const result = analyzer.computeRatingDistribution(ciders);

      expect(result.max).toBe(3); // Max count is 3 for rating 7
    });

    it('should handle empty dataset', () => {
      const result = analyzer.computeRatingDistribution([]);

      expect(result.labels).toEqual(['No ratings yet']);
      expect(result.datasets[0].data).toEqual([0]);
    });

    it('should use correct color for rating distribution', () => {
      const ciders = [createMockCider({ overallRating: 7 as Rating })];
      const result = analyzer.computeRatingDistribution(ciders);

      expect(result.datasets[0].color).toBe('#FF6384');
    });

    it('should handle even distribution', () => {
      const ciders = Array.from({ length: 10 }, (_, i) =>
        createMockCider({ overallRating: (i + 1) as Rating })
      );

      const result = analyzer.computeRatingDistribution(ciders);
      const data = result.datasets[0].data;

      expect(data.every(count => count === 1)).toBe(true);
    });

    it('should handle skewed distribution (mostly high ratings)', () => {
      const ciders = [
        ...Array(10).fill(null).map(() => createMockCider({ overallRating: 9 as Rating })),
        ...Array(10).fill(null).map(() => createMockCider({ overallRating: 10 as Rating })),
        createMockCider({ overallRating: 5 as Rating }),
      ];

      const result = analyzer.computeRatingDistribution(ciders);
      const data = result.datasets[0].data;

      expect(data[8]).toBe(10); // Rating 9
      expect(data[9]).toBe(10); // Rating 10
      expect(data[4]).toBe(1); // Rating 5
    });
  });

  // ==========================================================================
  // ABV Distribution Tests
  // ==========================================================================

  describe('computeAbvDistribution', () => {
    it('should create correct bins (0-3%, 3-5%, 5-7%, 7-9%, 9%+)', () => {
      const ciders = [createMockCider({ abv: 5.0 })];
      const result = analyzer.computeAbvDistribution(ciders);

      expect(result.labels).toEqual(['0-3%', '3-5%', '5-7%', '7-9%', '9%+']);
    });

    it('should categorize ciders into correct bins', () => {
      const ciders = [
        createMockCider({ abv: 2.5 }), // 0-3%
        createMockCider({ abv: 4.0 }), // 3-5%
        createMockCider({ abv: 6.5 }), // 5-7%
        createMockCider({ abv: 8.0 }), // 7-9%
        createMockCider({ abv: 10.0 }), // 9%+
      ];

      const result = analyzer.computeAbvDistribution(ciders);
      const data = result.datasets[0].data;

      expect(data).toEqual([1, 1, 1, 1, 1]);
    });

    it('should handle ABV bin boundaries correctly (inclusive min, exclusive max)', () => {
      // Test exact boundary values to verify [min, max) pattern
      const ciders = [
        createMockCider({ abv: 3.0 }), // Should be in 3-5% bin (>= 3)
        createMockCider({ abv: 5.0 }), // Should be in 5-7% bin (>= 5)
        createMockCider({ abv: 7.0 }), // Should be in 7-9% bin (>= 7)
        createMockCider({ abv: 9.0 }), // Should be in 9%+ bin (>= 9)
      ];

      const result = analyzer.computeAbvDistribution(ciders);
      const data = result.datasets[0].data;

      // Verify each boundary value is in the correct bin
      expect(data[0]).toBe(0); // 0-3% has 0 items
      expect(data[1]).toBe(1); // 3-5% has 1 item (3.0)
      expect(data[2]).toBe(1); // 5-7% has 1 item (5.0)
      expect(data[3]).toBe(1); // 7-9% has 1 item (7.0)
      expect(data[4]).toBe(1); // 9%+ has 1 item (9.0)
    });

    it('should handle edge case: exactly 3% (should be in 3-5% bin)', () => {
      const ciders = [createMockCider({ abv: 3.0 })];
      const result = analyzer.computeAbvDistribution(ciders);
      const data = result.datasets[0].data;

      expect(data[1]).toBe(1); // 3-5% bin
      expect(data[0]).toBe(0); // 0-3% bin
    });

    it('should handle edge case: exactly 0%', () => {
      const ciders = [createMockCider({ abv: 0.0 })];
      const result = analyzer.computeAbvDistribution(ciders);
      const data = result.datasets[0].data;

      expect(data[0]).toBe(1); // 0-3% bin
    });

    it('should handle edge case: 9.9% (should be in 9%+ bin)', () => {
      const ciders = [createMockCider({ abv: 9.9 })];
      const result = analyzer.computeAbvDistribution(ciders);
      const data = result.datasets[0].data;

      expect(data[4]).toBe(1); // 9%+ bin
    });

    it('should handle edge case: 15% (very high ABV)', () => {
      const ciders = [createMockCider({ abv: 15.0 })];
      const result = analyzer.computeAbvDistribution(ciders);
      const data = result.datasets[0].data;

      expect(data[4]).toBe(1); // 9%+ bin
    });

    it('should handle empty bins', () => {
      const ciders = [
        createMockCider({ abv: 5.0 }),
        createMockCider({ abv: 6.0 }),
      ];

      const result = analyzer.computeAbvDistribution(ciders);
      const data = result.datasets[0].data;

      expect(data[2]).toBe(2); // 5-7% bin
      expect(data[0]).toBe(0); // 0-3% bin
      expect(data[4]).toBe(0); // 9%+ bin
    });

    it('should calculate average ABV correctly', () => {
      const ciders = [
        createMockCider({ abv: 4.0 }),
        createMockCider({ abv: 5.0 }),
        createMockCider({ abv: 6.0 }),
      ];

      const result = analyzer.computeAbvDistribution(ciders);

      expect(result.average).toBe(5.0);
    });

    it('should handle empty dataset', () => {
      const result = analyzer.computeAbvDistribution([]);

      expect(result.labels).toEqual(['No ABV data']);
      expect(result.datasets[0].data).toEqual([0]);
    });

    it('should filter out invalid ABV values', () => {
      const ciders = [
        createMockCider({ abv: 5.0 }),
        createMockCider({ abv: NaN }),
        createMockCider({ abv: Infinity }),
        createMockCider({ abv: 6.0 }),
      ];

      const result = analyzer.computeAbvDistribution(ciders);
      const data = result.datasets[0].data;

      expect(data[2]).toBe(2); // Only 2 valid values in 5-7% bin
    });

    it('should use correct color for ABV distribution', () => {
      const ciders = [createMockCider({ abv: 5.0 })];
      const result = analyzer.computeAbvDistribution(ciders);

      expect(result.datasets[0].color).toBe('#36A2EB');
    });
  });

  // ==========================================================================
  // Style Distribution Tests
  // ==========================================================================

  describe('computeStyleDistribution', () => {
    it('should count multiple styles correctly', () => {
      const ciders = [
        createMockCider({ traditionalStyle: 'modern_craft' }),
        createMockCider({ traditionalStyle: 'modern_craft' }),
        createMockCider({ traditionalStyle: 'traditional_english' }),
      ];

      const result = analyzer.computeStyleDistribution(ciders);

      expect(result.datasets[0].data).toContain(2); // modern_craft
      expect(result.datasets[0].data).toContain(1); // traditional_english
    });

    it('should handle single style', () => {
      const ciders = [
        createMockCider({ traditionalStyle: 'heritage' }),
        createMockCider({ traditionalStyle: 'heritage' }),
      ];

      const result = analyzer.computeStyleDistribution(ciders);

      expect(result.labels).toHaveLength(1);
      expect(result.datasets[0].data).toEqual([2]);
    });

    it('should fall back to sweetness when traditionalStyle not available', () => {
      const ciders = [
        createMockCider({ traditionalStyle: undefined, sweetness: 'dry' }),
        createMockCider({ traditionalStyle: undefined, sweetness: 'dry' }),
        createMockCider({ traditionalStyle: undefined, sweetness: 'sweet' }),
      ];

      const result = analyzer.computeStyleDistribution(ciders);

      expect(result.datasets[0].data).toContain(2); // dry
      expect(result.datasets[0].data).toContain(1); // sweet
    });

    it('should use "unknown" when neither traditionalStyle nor sweetness available', () => {
      const ciders = [
        createMockCider({ traditionalStyle: undefined, sweetness: undefined }),
      ];

      const result = analyzer.computeStyleDistribution(ciders);

      expect(result.labels[0]).toBe('Unknown');
    });

    it('should normalize style names (replace underscores)', () => {
      const ciders = [
        createMockCider({ traditionalStyle: 'modern_craft' }),
      ];

      const result = analyzer.computeStyleDistribution(ciders);

      expect(result.labels[0]).toBe('Modern Craft');
    });

    it('should format style labels with proper capitalization', () => {
      const ciders = [
        createMockCider({ traditionalStyle: 'traditional_english' }),
      ];

      const result = analyzer.computeStyleDistribution(ciders);

      expect(result.labels[0]).toBe('Traditional English');
    });

    it('should sort styles by count descending', () => {
      const ciders = [
        createMockCider({ sweetness: 'dry' }),
        createMockCider({ sweetness: 'medium' }),
        createMockCider({ sweetness: 'medium' }),
        createMockCider({ sweetness: 'sweet' }),
        createMockCider({ sweetness: 'sweet' }),
        createMockCider({ sweetness: 'sweet' }),
      ];

      const result = analyzer.computeStyleDistribution(ciders);
      const data = result.datasets[0].data;

      expect(data[0]).toBeGreaterThanOrEqual(data[1]); // First should be highest
      expect(data[1]).toBeGreaterThanOrEqual(data[2]); // Second should be >= third
    });

    it('should handle empty dataset', () => {
      const result = analyzer.computeStyleDistribution([]);

      expect(result.labels).toEqual(['No style data']);
      expect(result.datasets[0].data).toEqual([0]);
    });

    it('should use correct color for style distribution', () => {
      const ciders = [createMockCider({ sweetness: 'medium' })];
      const result = analyzer.computeStyleDistribution(ciders);

      expect(result.datasets[0].color).toBe('#FFCE56');
    });
  });

  // ==========================================================================
  // Brand Distribution Tests
  // ==========================================================================

  describe('computeBrandDistribution', () => {
    it('should return top 10 brands when more than 10 exist', () => {
      const ciders = Array.from({ length: 15 }, (_, i) =>
        createMockCider({ brand: `Brand ${i}` })
      );

      const result = analyzer.computeBrandDistribution(ciders);

      expect(result.labels).toHaveLength(10);
    });

    it('should return all brands when fewer than 10 exist', () => {
      const ciders = [
        createMockCider({ brand: 'Brand A' }),
        createMockCider({ brand: 'Brand B' }),
        createMockCider({ brand: 'Brand C' }),
      ];

      const result = analyzer.computeBrandDistribution(ciders);

      expect(result.labels).toHaveLength(3);
    });

    it('should handle single brand', () => {
      const ciders = [
        createMockCider({ brand: 'Only Brand' }),
        createMockCider({ brand: 'Only Brand' }),
      ];

      const result = analyzer.computeBrandDistribution(ciders);

      expect(result.labels).toHaveLength(1);
      expect(result.datasets[0].data).toEqual([2]);
    });

    it('should sort brands by count descending', () => {
      const ciders = [
        createMockCider({ brand: 'Brand A' }),
        createMockCider({ brand: 'Brand B' }),
        createMockCider({ brand: 'Brand B' }),
        createMockCider({ brand: 'Brand C' }),
        createMockCider({ brand: 'Brand C' }),
        createMockCider({ brand: 'Brand C' }),
      ];

      const result = analyzer.computeBrandDistribution(ciders);
      const data = result.datasets[0].data;

      expect(data[0]).toBe(3); // Brand C
      expect(data[1]).toBe(2); // Brand B
      expect(data[2]).toBe(1); // Brand A
    });

    it('should handle tie-breaking (brands with same count)', () => {
      const ciders = [
        createMockCider({ brand: 'Brand A' }),
        createMockCider({ brand: 'Brand B' }),
      ];

      const result = analyzer.computeBrandDistribution(ciders);

      expect(result.datasets[0].data).toHaveLength(2);
      expect(result.datasets[0].data[0]).toBe(1);
      expect(result.datasets[0].data[1]).toBe(1);
    });

    it('should truncate long brand names to 20 characters', () => {
      const ciders = [
        createMockCider({ brand: 'This Is A Very Long Brand Name That Exceeds Twenty Characters' }),
      ];

      const result = analyzer.computeBrandDistribution(ciders);

      expect(result.labels[0].length).toBeLessThanOrEqual(20);
      expect(result.labels[0]).toContain('...');
    });

    it('should not truncate short brand names', () => {
      const ciders = [
        createMockCider({ brand: 'Short Brand' }),
      ];

      const result = analyzer.computeBrandDistribution(ciders);

      expect(result.labels[0]).toBe('Short Brand');
    });

    it('should trim whitespace from brand names', () => {
      const ciders = [
        createMockCider({ brand: '  Brand A  ' }),
        createMockCider({ brand: '  Brand A  ' }),
      ];

      const result = analyzer.computeBrandDistribution(ciders);

      expect(result.datasets[0].data[0]).toBe(2); // Both counted together
    });

    it('should handle empty dataset', () => {
      const result = analyzer.computeBrandDistribution([]);

      expect(result.labels).toEqual(['No brand data']);
      expect(result.datasets[0].data).toEqual([0]);
    });

    it('should use correct color for brand distribution', () => {
      const ciders = [createMockCider({ brand: 'Test Brand' })];
      const result = analyzer.computeBrandDistribution(ciders);

      expect(result.datasets[0].color).toBe('#4BC0C0');
    });
  });

  // ==========================================================================
  // Tag Distribution Tests
  // ==========================================================================

  describe('computeTagDistribution', () => {
    it('should count tags from multiple ciders', () => {
      const ciders = [
        createMockCider({ tasteTags: ['apple', 'fruity'] }),
        createMockCider({ tasteTags: ['apple', 'tart'] }),
        createMockCider({ tasteTags: ['fruity'] }),
      ];

      const result = analyzer.computeTagDistribution(ciders);

      expect(result.datasets[0].data).toContain(2); // apple: 2
      expect(result.datasets[0].data).toContain(2); // fruity: 2
      expect(result.datasets[0].data).toContain(1); // tart: 1
    });

    it('should return top 10 tags when more than 10 exist', () => {
      const ciders = Array.from({ length: 15 }, (_, i) =>
        createMockCider({ tasteTags: [`tag${i}`] })
      );

      const result = analyzer.computeTagDistribution(ciders);

      expect(result.labels).toHaveLength(10);
    });

    it('should handle single tag', () => {
      const ciders = [
        createMockCider({ tasteTags: ['sweet'] }),
        createMockCider({ tasteTags: ['sweet'] }),
      ];

      const result = analyzer.computeTagDistribution(ciders);

      expect(result.labels).toHaveLength(1);
      expect(result.datasets[0].data).toEqual([2]);
    });

    it('should handle no tags', () => {
      const ciders = [
        createMockCider({ tasteTags: [] }),
        createMockCider({ tasteTags: undefined }),
      ];

      const result = analyzer.computeTagDistribution(ciders);

      expect(result.labels).toEqual(['No tags found']);
      expect(result.datasets[0].data).toEqual([0]);
    });

    it('should normalize tags (lowercase and trim)', () => {
      const ciders = [
        createMockCider({ tasteTags: ['APPLE', '  Apple  ', 'apple'] }),
      ];

      const result = analyzer.computeTagDistribution(ciders);

      expect(result.datasets[0].data[0]).toBe(3); // All counted as one tag
    });

    it('should capitalize tags for display', () => {
      const ciders = [
        createMockCider({ tasteTags: ['fruity'] }),
      ];

      const result = analyzer.computeTagDistribution(ciders);

      expect(result.labels[0]).toBe('Fruity');
    });

    it('should sort tags by count descending', () => {
      const ciders = [
        createMockCider({ tasteTags: ['a'] }),
        createMockCider({ tasteTags: ['b', 'b'] }),
        createMockCider({ tasteTags: ['c', 'c', 'c'] }),
      ];

      const result = analyzer.computeTagDistribution(ciders);
      const data = result.datasets[0].data;

      expect(data[0]).toBeGreaterThanOrEqual(data[1]);
      expect(data[1]).toBeGreaterThanOrEqual(data[2]);
    });

    it('should filter out empty or invalid tags', () => {
      const ciders = [
        createMockCider({ tasteTags: ['valid', '', '  ', null as any, undefined as any] }),
      ];

      const result = analyzer.computeTagDistribution(ciders);

      expect(result.datasets[0].data[0]).toBe(1); // Only 'valid' counted
    });

    it('should set max to highest tag count', () => {
      const ciders = [
        createMockCider({ tasteTags: ['popular', 'popular', 'popular'] }),
        createMockCider({ tasteTags: ['rare'] }),
      ];

      const result = analyzer.computeTagDistribution(ciders);

      expect(result.max).toBe(3);
    });

    it('should handle empty dataset', () => {
      const result = analyzer.computeTagDistribution([]);

      expect(result.labels).toEqual(['No tag data']);
      expect(result.datasets[0].data).toEqual([0]);
    });

    it('should use correct color for tag distribution', () => {
      const ciders = [createMockCider({ tasteTags: ['test'] })];
      const result = analyzer.computeTagDistribution(ciders);

      expect(result.datasets[0].color).toBe('#9966FF');
    });
  });

  // ==========================================================================
  // Price Distribution Tests
  // ==========================================================================

  describe('computePriceDistribution', () => {
    it('should create correct price bins (£0-3, £3-5, £5-7, £7-10, £10+)', () => {
      const experiences = [createMockExperience({ pricePerPint: 5.0 })];
      const result = analyzer.computePriceDistribution(experiences);

      expect(result.labels).toEqual(['£0-3', '£3-5', '£5-7', '£7-10', '£10+']);
    });

    it('should categorize prices into correct bins', () => {
      const experiences = [
        createMockExperience({ pricePerPint: 2.5 }), // £0-3
        createMockExperience({ pricePerPint: 4.0 }), // £3-5
        createMockExperience({ pricePerPint: 6.0 }), // £5-7
        createMockExperience({ pricePerPint: 8.5 }), // £7-10
        createMockExperience({ pricePerPint: 12.0 }), // £10+
      ];

      const result = analyzer.computePriceDistribution(experiences);
      const data = result.datasets[0].data;

      expect(data).toEqual([1, 1, 1, 1, 1]);
    });

    it('should handle price bin boundaries correctly (inclusive min, exclusive max)', () => {
      // Test exact boundary values to verify [min, max) pattern
      const experiences = [
        createMockExperience({ pricePerPint: 3.00 }), // Should be in £3-5 bin (>= 3)
        createMockExperience({ pricePerPint: 5.00 }), // Should be in £5-7 bin (>= 5)
        createMockExperience({ pricePerPint: 7.00 }), // Should be in £7-10 bin (>= 7)
        createMockExperience({ pricePerPint: 10.00 }), // Should be in £10+ bin (>= 10)
      ];

      const result = analyzer.computePriceDistribution(experiences);
      const data = result.datasets[0].data;

      // Verify each boundary value is in the correct bin
      expect(data[0]).toBe(0); // £0-3 has 0 items
      expect(data[1]).toBe(1); // £3-5 has 1 item (3.00)
      expect(data[2]).toBe(1); // £5-7 has 1 item (5.00)
      expect(data[3]).toBe(1); // £7-10 has 1 item (7.00)
      expect(data[4]).toBe(1); // £10+ has 1 item (10.00)
    });

    it('should handle free samples (£0)', () => {
      const experiences = [createMockExperience({ pricePerPint: 0.0 })];
      const result = analyzer.computePriceDistribution(experiences);
      const data = result.datasets[0].data;

      expect(data[0]).toBe(1); // £0-3 bin
    });

    it('should handle expensive outliers (>£10)', () => {
      const experiences = [
        createMockExperience({ pricePerPint: 15.0 }),
        createMockExperience({ pricePerPint: 20.0 }),
      ];

      const result = analyzer.computePriceDistribution(experiences);
      const data = result.datasets[0].data;

      expect(data[4]).toBe(2); // £10+ bin
    });

    it('should calculate average price correctly', () => {
      const experiences = [
        createMockExperience({ pricePerPint: 4.0 }),
        createMockExperience({ pricePerPint: 5.0 }),
        createMockExperience({ pricePerPint: 6.0 }),
      ];

      const result = analyzer.computePriceDistribution(experiences);

      expect(result.average).toBe(5.0);
    });

    it('should fall back to price if pricePerPint not available', () => {
      const experiences = [
        createMockExperience({ price: 5.0, pricePerPint: undefined as any }),
      ];

      const result = analyzer.computePriceDistribution(experiences);
      const data = result.datasets[0].data;

      expect(data[2]).toBe(1); // £5-7 bin
    });

    it('should filter out invalid prices (negative, NaN, Infinity)', () => {
      const experiences = [
        createMockExperience({ pricePerPint: 5.0 }),
        createMockExperience({ pricePerPint: -1.0 }),
        createMockExperience({ pricePerPint: NaN }),
        createMockExperience({ pricePerPint: Infinity }),
      ];

      const result = analyzer.computePriceDistribution(experiences);
      const data = result.datasets[0].data;

      expect(data[2]).toBe(1); // Only valid £5 counted
    });

    it('should handle empty dataset', () => {
      const result = analyzer.computePriceDistribution([]);

      expect(result.labels).toEqual(['No price data']);
      expect(result.datasets[0].data).toEqual([0]);
    });

    it('should use correct color for price distribution', () => {
      const experiences = [createMockExperience({ pricePerPint: 5.0 })];
      const result = analyzer.computePriceDistribution(experiences);

      expect(result.datasets[0].color).toBe('#FF9F40');
    });
  });

  // ==========================================================================
  // Venue Type Distribution Tests
  // ==========================================================================

  describe('computeVenueTypeDistribution', () => {
    it('should count all venue types correctly', () => {
      const experiences = [
        createMockExperience({ venue: { id: '1', name: 'Pub', type: 'pub' } }),
        createMockExperience({ venue: { id: '2', name: 'Bar', type: 'pub' } }),
        createMockExperience({ venue: { id: '3', name: 'Restaurant', type: 'restaurant' } }),
      ];

      const result = analyzer.computeVenueTypeDistribution(experiences);

      expect(result.datasets[0].data).toContain(2); // pub: 2
      expect(result.datasets[0].data).toContain(1); // restaurant: 1
    });

    it('should handle missing venue types', () => {
      const experiences = [
        createMockExperience({ venue: { id: '1', name: 'Test', type: undefined as any } }),
      ];

      const result = analyzer.computeVenueTypeDistribution(experiences);

      // Should not count venues without type
      expect(result.labels).not.toContain('Undefined');
    });

    it('should format venue type labels (capitalize, replace underscores)', () => {
      const experiences = [
        createMockExperience({ venue: { id: '1', name: 'Test', type: 'pub' } }),
      ];

      const result = analyzer.computeVenueTypeDistribution(experiences);

      expect(result.labels[0]).toBe('Pub');
    });

    it('should sort venue types by count descending', () => {
      const experiences = [
        createMockExperience({ venue: { id: '1', name: 'Pub 1', type: 'pub' } }),
        createMockExperience({ venue: { id: '2', name: 'Pub 2', type: 'pub' } }),
        createMockExperience({ venue: { id: '3', name: 'Restaurant', type: 'restaurant' } }),
        createMockExperience({ venue: { id: '4', name: 'Home', type: 'home' } }),
        createMockExperience({ venue: { id: '5', name: 'Home 2', type: 'home' } }),
        createMockExperience({ venue: { id: '6', name: 'Home 3', type: 'home' } }),
      ];

      const result = analyzer.computeVenueTypeDistribution(experiences);
      const data = result.datasets[0].data;

      expect(data[0]).toBeGreaterThanOrEqual(data[1]);
      expect(data[1]).toBeGreaterThanOrEqual(data[2]);
    });

    it('should handle empty dataset', () => {
      const result = analyzer.computeVenueTypeDistribution([]);

      expect(result.labels).toEqual(['No venue data']);
      expect(result.datasets[0].data).toEqual([0]);
    });

    it('should use correct color for venue distribution', () => {
      const experiences = [createMockExperience({ venue: { id: '1', name: 'Pub', type: 'pub' } })];
      const result = analyzer.computeVenueTypeDistribution(experiences);

      expect(result.datasets[0].color).toBe('#FF6384');
    });
  });

  // ==========================================================================
  // Chart Formatting Tests
  // ==========================================================================

  describe('formatForBarChart', () => {
    it('should format map data correctly', () => {
      const data = new Map([
        ['Category A', 10],
        ['Category B', 20],
        ['Category C', 5],
      ]);

      const result = analyzer.formatForBarChart(data, 'Test Chart', '#FF0000');

      expect(result.labels).toEqual(['Category B', 'Category A', 'Category C']); // Sorted
      expect(result.datasets[0].data).toEqual([20, 10, 5]);
      expect(result.datasets[0].color).toBe('#FF0000');
    });

    it('should use default color if not specified', () => {
      const data = new Map([['Test', 1]]);
      const result = analyzer.formatForBarChart(data, 'Test');

      expect(result.datasets[0].color).toBe('#FFCE56'); // Default style color
    });
  });

  describe('formatForHistogram', () => {
    it('should format bin data correctly', () => {
      const bins = [
        { label: 'Bin 1', count: 5 },
        { label: 'Bin 2', count: 10 },
        { label: 'Bin 3', count: 3 },
      ];

      const result = analyzer.formatForHistogram(bins, 'Test Histogram', '#00FF00');

      expect(result.labels).toEqual(['Bin 1', 'Bin 2', 'Bin 3']);
      expect(result.datasets[0].data).toEqual([5, 10, 3]);
      expect(result.datasets[0].color).toBe('#00FF00');
      expect(result.max).toBe(10);
    });

    it('should use default color if not specified', () => {
      const bins = [{ label: 'Test', count: 1 }];
      const result = analyzer.formatForHistogram(bins, 'Test');

      expect(result.datasets[0].color).toBe('#36A2EB'); // Default ABV color
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('computeDistributions (full integration)', () => {
    it('should compute all distributions with real data', async () => {
      const ciders = [
        createMockCider({
          overallRating: 8 as Rating,
          abv: 5.5,
          brand: 'Aspall',
          sweetness: 'dry',
          tasteTags: ['apple', 'crisp'],
        }),
        createMockCider({
          overallRating: 7 as Rating,
          abv: 4.5,
          brand: 'Thatchers',
          sweetness: 'medium',
          tasteTags: ['fruity', 'sweet'],
        }),
        createMockCider({
          overallRating: 9 as Rating,
          abv: 6.0,
          brand: 'Aspall',
          sweetness: 'dry',
          tasteTags: ['crisp', 'tart'],
        }),
      ];

      const experiences = [
        createMockExperience({
          pricePerPint: 5.0,
          venue: { id: '1', name: 'The Crown', type: 'pub' },
        }),
        createMockExperience({
          pricePerPint: 6.5,
          venue: { id: '2', name: 'Restaurant', type: 'restaurant' },
        }),
      ];

      const result = await analyzer.computeDistributions(ciders, experiences);

      expect(result.ratingDistribution).toBeDefined();
      expect(result.abvDistribution).toBeDefined();
      expect(result.styleDistribution).toBeDefined();
      expect(result.brandDistribution).toBeDefined();
      expect(result.tagDistribution).toBeDefined();
      expect(result.priceDistribution).toBeDefined();
      expect(result.venueTypeDistribution).toBeDefined();
      expect(result.metadata.ciderCount).toBe(3);
      expect(result.metadata.experienceCount).toBe(2);
    });

    it('should return cached results on second call', async () => {
      const ciders = [createMockCider({ overallRating: 8 as Rating })];
      const experiences = [createMockExperience({ pricePerPint: 5.0 })];

      const result1 = await analyzer.computeDistributions(ciders, experiences);
      const result2 = await analyzer.computeDistributions(ciders, experiences);

      expect(result1.metadata.cached).toBe(false);
      expect(result2.metadata.cached).toBe(true);
      expect(result1.ratingDistribution).toEqual(result2.ratingDistribution);
    });

    it('should handle empty datasets gracefully', async () => {
      const result = await analyzer.computeDistributions([], []);

      expect(result.ratingDistribution.labels).toEqual(['No ratings yet']);
      expect(result.abvDistribution.labels).toEqual(['No ABV data']);
      expect(result.priceDistribution.labels).toEqual(['No price data']);
      expect(result.metadata.ciderCount).toBe(0);
      expect(result.metadata.experienceCount).toBe(0);
    });
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  describe('Performance', () => {
    it('should compute distributions in <300ms for 1000 ciders', async () => {
      const ciders = Array.from({ length: 1000 }, (_, i) =>
        createMockCider({
          overallRating: ((i % 10) + 1) as Rating,
          abv: (i % 10) + 1,
          brand: `Brand ${i % 20}`,
          tasteTags: [`tag${i % 30}`],
        })
      );

      const experiences = Array.from({ length: 500 }, (_, i) =>
        createMockExperience({
          pricePerPint: (i % 10) + 3,
          venue: { id: `v${i}`, name: `Venue ${i}`, type: 'pub' },
        })
      );

      const startTime = performance.now();
      const result = await analyzer.computeDistributions(ciders, experiences);
      const endTime = performance.now();

      const computationTime = endTime - startTime;

      expect(computationTime).toBeLessThan(300);
      expect(result.metadata.computationTime).toBeLessThan(300);
    });

    it('should benefit from caching on repeated calls', async () => {
      const ciders = Array.from({ length: 500 }, () =>
        createMockCider({ overallRating: 7 as Rating })
      );
      const experiences = Array.from({ length: 250 }, () =>
        createMockExperience({ pricePerPint: 5.0 })
      );

      // First call (no cache)
      const start1 = performance.now();
      await analyzer.computeDistributions(ciders, experiences);
      const time1 = performance.now() - start1;

      // Second call (cached)
      const start2 = performance.now();
      await analyzer.computeDistributions(ciders, experiences);
      const time2 = performance.now() - start2;

      expect(time2).toBeLessThan(time1); // Cached should be faster
      expect(time2).toBeLessThan(10); // Cached should be very fast
    });
  });
});
