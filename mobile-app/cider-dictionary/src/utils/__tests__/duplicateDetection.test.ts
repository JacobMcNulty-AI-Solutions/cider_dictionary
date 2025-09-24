// Comprehensive Duplicate Detection Tests for Phase 2 Intelligence
// Tests for fuzzy matching, string similarity algorithms, and cider duplicate detection

import {
  DuplicateDetectionEngine,
  CiderMatcher,
  DuplicateDetectionResult,
  FuzzyMatchResult,
} from '../duplicateDetection';
import { CiderMasterRecord } from '../../types/cider';

// =============================================================================
// TEST SETUP AND FIXTURES
// =============================================================================

const createMockCiderMasterRecord = (overrides: Partial<CiderMasterRecord> = {}): CiderMasterRecord => ({
  id: `cider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  userId: 'test-user',
  name: 'Test Cider',
  brand: 'Test Brand',
  overallRating: 4.5,
  abv: 5.2,
  tasteTags: ['crisp', 'fruity'],
  notes: 'Test notes',
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

// Mock cider database for testing
const createTestCiderDatabase = (): CiderMasterRecord[] => [
  createMockCiderMasterRecord({
    id: 'cider1',
    name: 'Aspall Dry Cider',
    brand: 'Aspall',
    abv: 5.5,
    overallRating: 4.2,
    containerType: 'bottle',
  }),
  createMockCiderMasterRecord({
    id: 'cider2',
    name: 'Thatchers Gold',
    brand: 'Thatchers',
    abv: 4.8,
    overallRating: 4.0,
    containerType: 'can',
  }),
  createMockCiderMasterRecord({
    id: 'cider3',
    name: 'Strongbow Original',
    brand: 'Strongbow',
    abv: 5.0,
    overallRating: 3.2,
    containerType: 'bottle',
  }),
  createMockCiderMasterRecord({
    id: 'cider4',
    name: 'Aspall Imperial Dry',
    brand: 'Aspall',
    abv: 8.2,
    overallRating: 4.5,
    containerType: 'bottle',
  }),
  createMockCiderMasterRecord({
    id: 'cider5',
    name: 'Old Mout Pineapple & Raspberry',
    brand: 'Old Mout',
    abv: 4.0,
    overallRating: 3.8,
    containerType: 'bottle',
  }),
  createMockCiderMasterRecord({
    id: 'cider6',
    name: 'Rekorderlig Strawberry & Lime',
    brand: 'Rekorderlig',
    abv: 4.0,
    overallRating: 3.5,
    containerType: 'bottle',
  }),
  createMockCiderMasterRecord({
    id: 'cider7',
    name: 'Thatchers Haze',
    brand: 'Thatchers',
    abv: 4.5,
    overallRating: 3.9,
    containerType: 'can',
  }),
  createMockCiderMasterRecord({
    id: 'cider8',
    name: 'Aspall Draught Suffolk Cyder',
    brand: 'Aspall',
    abv: 5.5,
    overallRating: 4.3,
    containerType: 'draft',
  }),
];

describe('String Similarity Algorithms', () => {
  // Access the private StringSimilarity class through the public interface
  // We'll test this indirectly through the CiderMatcher

  describe('Combined Similarity Testing', () => {
    it('should detect exact matches', () => {
      const cider1 = createMockCiderMasterRecord({ name: 'Test Cider', brand: 'Test Brand' });
      const cider2 = createMockCiderMasterRecord({ name: 'Test Cider', brand: 'Test Brand' });

      const matchResult = CiderMatcher.calculateMatchScore(cider1, cider2);

      expect(matchResult.score).toBeGreaterThan(0.95);
      expect(matchResult.reasons).toContain('Names are nearly identical');
      expect(matchResult.reasons).toContain('Same brand');
      expect(matchResult.matchedFields).toContain('name');
      expect(matchResult.matchedFields).toContain('brand');
    });

    it('should detect very similar matches with minor differences', () => {
      const cider1 = createMockCiderMasterRecord({ name: 'Aspall Dry Cider', brand: 'Aspall' });
      const cider2 = createMockCiderMasterRecord({ name: 'Aspall Dry Cyder', brand: 'Aspall' }); // Cyder vs Cider

      const matchResult = CiderMatcher.calculateMatchScore(cider1, cider2);

      expect(matchResult.score).toBeGreaterThan(0.85);
      expect(matchResult.reasons).toContain('Same brand');
      expect(matchResult.matchedFields).toContain('brand');
    });

    it('should detect moderate similarity', () => {
      const cider1 = createMockCiderMasterRecord({ name: 'Apple Cider', brand: 'Orchard Valley' });
      const cider2 = createMockCiderMasterRecord({ name: 'Apple Crisp', brand: 'Orchard Farm' });

      const matchResult = CiderMatcher.calculateMatchScore(cider1, cider2);

      expect(matchResult.score).toBeGreaterThan(0.5);
      expect(matchResult.score).toBeLessThan(0.85);
    });

    it('should detect low similarity for different ciders', () => {
      const cider1 = createMockCiderMasterRecord({
        name: 'Traditional Scrumpy',
        brand: 'Somerset Farm',
        abv: 6.5,
        containerType: 'bottle'
      });
      const cider2 = createMockCiderMasterRecord({
        name: 'Berry Fusion',
        brand: 'Urban Cidery',
        abv: 4.2,
        containerType: 'can'
      });

      const matchResult = CiderMatcher.calculateMatchScore(cider1, cider2);

      expect(matchResult.score).toBeLessThan(0.4);
    });

    it('should handle empty or missing fields gracefully', () => {
      const cider1 = createMockCiderMasterRecord({
        name: '',
        brand: 'Test Brand',
        abv: 4.0,
        containerType: 'can'
      });
      const cider2 = createMockCiderMasterRecord({
        name: 'Test Name',
        brand: '',
        abv: 6.0,
        containerType: 'bottle'
      });

      const matchResult = CiderMatcher.calculateMatchScore(cider1, cider2);

      expect(matchResult.score).toBeGreaterThanOrEqual(0);
      expect(matchResult.score).toBeLessThan(0.5);
    });

    it('should handle special characters and punctuation', () => {
      const cider1 = createMockCiderMasterRecord({ name: 'O\'Hara\'s Irish Cider', brand: 'O\'Hara\'s' });
      const cider2 = createMockCiderMasterRecord({ name: 'OHaras Irish Cider', brand: 'OHaras' });

      const matchResult = CiderMatcher.calculateMatchScore(cider1, cider2);

      expect(matchResult.score).toBeGreaterThan(0.8);
    });
  });
});

describe('CiderMatcher', () => {
  describe('Name and Brand Normalization', () => {
    it('should normalize cider names correctly', () => {
      // We can't test the private method directly, but we can test its effects
      const cider1 = createMockCiderMasterRecord({ name: 'Apple Cider Co. Traditional!' });
      const cider2 = createMockCiderMasterRecord({ name: 'apple cider co traditional' });

      const matchResult = CiderMatcher.calculateMatchScore(cider1, cider2);

      expect(matchResult.score).toBeGreaterThan(0.85);
    });

    it('should normalize brand names correctly', () => {
      const cider1 = createMockCiderMasterRecord({ brand: 'Aspall Cider Co. Ltd.' });
      const cider2 = createMockCiderMasterRecord({ brand: 'Aspall Cider' });

      const matchResult = CiderMatcher.calculateMatchScore(cider1, cider2);

      expect(matchResult.reasons.some(r => r.includes('brand'))).toBe(true);
    });
  });

  describe('Match Score Calculation', () => {
    it('should weight name matches heavily', () => {
      const cider1 = createMockCiderMasterRecord({
        name: 'Unique Cider Name',
        brand: 'Different Brand',
        abv: 5.0,
      });
      const cider2 = createMockCiderMasterRecord({
        name: 'Unique Cider Name',
        brand: 'Another Brand',
        abv: 6.0,
      });

      const matchResult = CiderMatcher.calculateMatchScore(cider1, cider2);

      expect(matchResult.score).toBeGreaterThan(0.6); // Name similarity should drive score up
      expect(matchResult.matchedFields).toContain('name');
    });

    it('should factor in ABV similarity', () => {
      const cider1 = createMockCiderMasterRecord({
        name: 'Test Cider',
        brand: 'Test Brand',
        abv: 5.0,
      });
      const cider2 = createMockCiderMasterRecord({
        name: 'Test Cider',
        brand: 'Test Brand',
        abv: 5.0,
      });

      const matchResult = CiderMatcher.calculateMatchScore(cider1, cider2);

      expect(matchResult.reasons).toContain('Identical ABV');
      expect(matchResult.matchedFields).toContain('abv');
    });

    it('should handle ABV differences appropriately', () => {
      const testCases = [
        { abv1: 5.0, abv2: 5.0, expectedReason: 'Identical ABV' },
        { abv1: 5.0, abv2: 5.3, expectedReason: 'Very similar ABV' },
        { abv1: 5.0, abv2: 5.8, expectedReason: 'Similar ABV' },
        { abv1: 5.0, abv2: 7.5, expectedReason: null }, // Too different
      ];

      testCases.forEach(({ abv1, abv2, expectedReason }) => {
        const cider1 = createMockCiderMasterRecord({ abv: abv1 });
        const cider2 = createMockCiderMasterRecord({ abv: abv2 });

        const matchResult = CiderMatcher.calculateMatchScore(cider1, cider2);

        if (expectedReason) {
          expect(matchResult.reasons).toContain(expectedReason);
        }
      });
    });

    it('should factor in container type matches', () => {
      const cider1 = createMockCiderMasterRecord({
        name: 'Same Name',
        brand: 'Same Brand',
        containerType: 'bottle',
      });
      const cider2 = createMockCiderMasterRecord({
        name: 'Same Name',
        brand: 'Same Brand',
        containerType: 'bottle',
      });

      const matchResult = CiderMatcher.calculateMatchScore(cider1, cider2);

      expect(matchResult.reasons).toContain('Same container type');
      expect(matchResult.matchedFields).toContain('containerType');
    });

    it('should handle missing container type gracefully', () => {
      const cider1 = createMockCiderMasterRecord({ containerType: 'bottle' });
      const cider2 = createMockCiderMasterRecord({ containerType: undefined as any });

      const matchResult = CiderMatcher.calculateMatchScore(cider1, cider2);

      expect(matchResult.score).toBeGreaterThanOrEqual(0);
      expect(matchResult.reasons).not.toContain('Same container type');
    });
  });

  describe('Potential Duplicates Finding', () => {
    let testDatabase: CiderMasterRecord[];

    beforeEach(() => {
      testDatabase = createTestCiderDatabase();
    });

    it('should find exact duplicates', () => {
      const newCider = {
        name: 'Aspall Dry Cider',
        brand: 'Aspall',
        abv: 5.5,
        containerType: 'bottle' as const,
      };

      const potentialDuplicates = CiderMatcher.findPotentialDuplicates(newCider, testDatabase);

      expect(potentialDuplicates.length).toBeGreaterThan(0);
      expect(potentialDuplicates[0].match.score).toBeGreaterThan(0.9);
      expect(potentialDuplicates[0].cider.name).toBe('Aspall Dry Cider');
    });

    it('should find similar ciders from same brand', () => {
      const newCider = {
        name: 'Aspall Premium Dry',
        brand: 'Aspall',
        abv: 5.0,
        containerType: 'bottle' as const,
      };

      const potentialDuplicates = CiderMatcher.findPotentialDuplicates(newCider, testDatabase);

      expect(potentialDuplicates.length).toBeGreaterThan(0);
      // Should find other Aspall ciders
      expect(potentialDuplicates.some(dup => dup.cider.brand === 'Aspall')).toBe(true);
    });

    it('should sort results by confidence score', () => {
      const newCider = {
        name: 'Thatchers Premium',
        brand: 'Thatchers',
        abv: 4.8,
        containerType: 'can' as const,
      };

      const potentialDuplicates = CiderMatcher.findPotentialDuplicates(newCider, testDatabase);

      // Should be sorted by score (highest first)
      for (let i = 0; i < potentialDuplicates.length - 1; i++) {
        expect(potentialDuplicates[i].match.score).toBeGreaterThanOrEqual(
          potentialDuplicates[i + 1].match.score
        );
      }
    });

    it('should filter out low-confidence matches', () => {
      const newCider = {
        name: 'Completely Different Name',
        brand: 'Unrelated Brand',
        abv: 12.0, // Very different ABV
        containerType: 'bottle' as const,
      };

      const potentialDuplicates = CiderMatcher.findPotentialDuplicates(newCider, testDatabase);

      // Should find very few or no matches
      expect(potentialDuplicates.length).toBe(0);
    });

    it('should handle empty database', () => {
      const newCider = {
        name: 'Any Cider',
        brand: 'Any Brand',
        abv: 5.0,
        containerType: 'bottle' as const,
      };

      const potentialDuplicates = CiderMatcher.findPotentialDuplicates(newCider, []);

      expect(potentialDuplicates).toEqual([]);
    });
  });
});

describe('DuplicateDetectionEngine', () => {
  let testDatabase: CiderMasterRecord[];

  beforeEach(() => {
    testDatabase = createTestCiderDatabase();
  });

  describe('Comprehensive Duplicate Check', () => {
    it('should detect high-confidence duplicates', async () => {
      const result = await DuplicateDetectionEngine.performDuplicateCheck(
        'Aspall Dry Cider',
        'Aspall',
        5.5,
        'bottle',
        testDatabase
      );

      expect(result.isDuplicate).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.85);
      expect(result.suggestion).toContain('duplicate');
      expect(result.existingCider).toBeDefined();
      expect(result.existingCider!.name).toBe('Aspall Dry Cider');
    });

    it('should detect similar (non-duplicate) ciders', async () => {
      const result = await DuplicateDetectionEngine.performDuplicateCheck(
        'Aspall Premium Cider',
        'Aspall',
        5.2,
        'bottle',
        testDatabase
      );

      expect(result.isDuplicate).toBe(false);
      expect(result.hasSimilar).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.confidence).toBeLessThan(0.85);
      expect(result.suggestion).toContain('similar');
      expect(result.similarCiders).toBeDefined();
      expect(result.similarCiders!.length).toBeGreaterThan(0);
    });

    it('should handle no matches found', async () => {
      const result = await DuplicateDetectionEngine.performDuplicateCheck(
        'Unique Brand New Cider',
        'Never Heard Of This Brand',
        15.0, // Unusual ABV
        'keg',
        testDatabase
      );

      expect(result.isDuplicate).toBe(false);
      expect(result.hasSimilar).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.suggestion).toContain('No similar ciders found');
      expect(result.similarCiders).toEqual([]);
    });

    it('should handle optional parameters', async () => {
      const result = await DuplicateDetectionEngine.performDuplicateCheck(
        'Thatchers Gold',
        'Thatchers',
        undefined, // No ABV
        undefined, // No container type
        testDatabase
      );

      expect(result).toBeDefined();
      expect(typeof result.isDuplicate).toBe('boolean');
      expect(typeof result.confidence).toBe('number');
    });

    it('should handle empty existing ciders', async () => {
      const result = await DuplicateDetectionEngine.performDuplicateCheck(
        'Any Cider',
        'Any Brand',
        5.0,
        'bottle',
        []
      );

      expect(result.isDuplicate).toBe(false);
      expect(result.hasSimilar).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.similarCiders).toEqual([]);
    });

    it('should limit similar ciders to top 3 results', async () => {
      // Create a test case that will match multiple ciders
      const result = await DuplicateDetectionEngine.performDuplicateCheck(
        'Cider',
        'Brand',
        5.0,
        'bottle',
        testDatabase
      );

      if (result.similarCiders && result.similarCiders.length > 0) {
        expect(result.similarCiders.length).toBeLessThanOrEqual(3);
      }
    });

    it('should provide detailed confidence reasons', async () => {
      const result = await DuplicateDetectionEngine.performDuplicateCheck(
        'Aspall Imperial Dry',
        'Aspall',
        8.2,
        'bottle',
        testDatabase
      );

      if (result.similarCiders && result.similarCiders.length > 0) {
        const topMatch = result.similarCiders[0];
        expect(topMatch.reasons).toBeDefined();
        expect(Array.isArray(topMatch.reasons)).toBe(true);
        expect(topMatch.reasons.length).toBeGreaterThan(0);
        expect(topMatch.confidence).toBeGreaterThan(0);
      }
    });
  });

  describe('Quick Duplicate Check', () => {
    it('should perform fast exact match check', async () => {
      const result = await DuplicateDetectionEngine.quickDuplicateCheck(
        'Aspall Dry Cider',
        'Aspall',
        testDatabase
      );

      expect(result.isDuplicate).toBe(true);
      expect(result.confidence).toBe(1.0);
      expect(result.message).toContain('Exact match found');
    });

    it('should handle quick fuzzy matching', async () => {
      const result = await DuplicateDetectionEngine.quickDuplicateCheck(
        'Aspall Dry Cyder', // Slight variation
        'Aspall',
        testDatabase
      );

      // Should still detect as potential duplicate
      expect(typeof result.isDuplicate).toBe('boolean');
      expect(typeof result.confidence).toBe('number');
    });

    it('should handle empty input gracefully', async () => {
      const result = await DuplicateDetectionEngine.quickDuplicateCheck(
        '',
        '',
        testDatabase
      );

      expect(result.isDuplicate).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('should handle whitespace-only input', async () => {
      const result = await DuplicateDetectionEngine.quickDuplicateCheck(
        '   ',
        '   ',
        testDatabase
      );

      expect(result.isDuplicate).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('should optimize for performance with large datasets', async () => {
      // Create a larger test database
      const largeDatabase = Array.from({ length: 1000 }, (_, i) =>
        createMockCiderMasterRecord({
          name: `Test Cider ${i}`,
          brand: `Brand ${i % 10}`,
        })
      );

      const startTime = performance.now();

      const result = await DuplicateDetectionEngine.quickDuplicateCheck(
        'Test Cider 5',
        'Brand 5',
        largeDatabase
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete quickly
      expect(result).toBeDefined();
    });
  });

  describe('Suggestion Generation', () => {
    it('should get similar cider name suggestions', () => {
      const suggestions = DuplicateDetectionEngine.getSimilarCiderNames(
        'Asp',
        testDatabase
      );

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.length).toBeLessThanOrEqual(5);
      expect(suggestions.some(name => name.includes('Aspall'))).toBe(true);
    });

    it('should get similar brand name suggestions', () => {
      const suggestions = DuplicateDetectionEngine.getSimilarBrandNames(
        'That',
        testDatabase
      );

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.length).toBeLessThanOrEqual(5);
      expect(suggestions.some(brand => brand.includes('Thatchers'))).toBe(true);
    });

    it('should handle too-short queries gracefully', () => {
      const ciderSuggestions = DuplicateDetectionEngine.getSimilarCiderNames('A', testDatabase);
      const brandSuggestions = DuplicateDetectionEngine.getSimilarBrandNames('B', testDatabase);

      expect(ciderSuggestions).toEqual([]);
      expect(brandSuggestions).toEqual([]);
    });

    it('should return unique brand suggestions', () => {
      // Create database with duplicate brands
      const databaseWithDuplicates = [
        ...testDatabase,
        createMockCiderMasterRecord({ name: 'Another Aspall Cider', brand: 'Aspall' }),
        createMockCiderMasterRecord({ name: 'Yet Another Aspall', brand: 'Aspall' }),
      ];

      const suggestions = DuplicateDetectionEngine.getSimilarBrandNames(
        'Asp',
        databaseWithDuplicates
      );

      const uniqueSuggestions = new Set(suggestions);
      expect(uniqueSuggestions.size).toBe(suggestions.length); // All should be unique
    });

    it('should sort suggestions by relevance', () => {
      const suggestions = DuplicateDetectionEngine.getSimilarCiderNames(
        'Aspall',
        testDatabase
      );

      if (suggestions.length > 1) {
        // First suggestion should be most relevant
        expect(suggestions[0]).toContain('Aspall');
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined inputs in duplicate check', async () => {
      const result = await DuplicateDetectionEngine.performDuplicateCheck(
        null as any,
        undefined as any,
        0,
        '',
        testDatabase
      );

      expect(result).toBeDefined();
      expect(typeof result.isDuplicate).toBe('boolean');
    });

    it('should handle special characters in names', async () => {
      const specialCharDatabase = [
        createMockCiderMasterRecord({ name: 'Cider & Co.', brand: 'Brand & Sons' }),
        createMockCiderMasterRecord({ name: 'O\'Malley\'s Cider', brand: 'O\'Malley\'s' }),
        createMockCiderMasterRecord({ name: 'Cider (Premium)', brand: 'Brackets[Brand]' }),
      ];

      const result = await DuplicateDetectionEngine.performDuplicateCheck(
        'Cider & Company',
        'Brand & Sons',
        5.0,
        'bottle',
        specialCharDatabase
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle very long names', async () => {
      const longName = 'A'.repeat(1000); // Very long name
      const longBrand = 'B'.repeat(500); // Very long brand

      const longNameDatabase = [
        createMockCiderMasterRecord({ name: longName, brand: longBrand }),
      ];

      const result = await DuplicateDetectionEngine.performDuplicateCheck(
        longName,
        longBrand,
        5.0,
        'bottle',
        longNameDatabase
      );

      expect(result.isDuplicate).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.95);
    });

    it('should handle extreme ABV values', async () => {
      const extremeDatabase = [
        createMockCiderMasterRecord({ name: 'Low ABV', brand: 'Test', abv: 0.5 }),
        createMockCiderMasterRecord({ name: 'High ABV', brand: 'Test', abv: 20.0 }),
      ];

      const lowResult = await DuplicateDetectionEngine.performDuplicateCheck(
        'Low ABV',
        'Test',
        0.5,
        'bottle',
        extremeDatabase
      );

      const highResult = await DuplicateDetectionEngine.performDuplicateCheck(
        'High ABV',
        'Test',
        20.0,
        'bottle',
        extremeDatabase
      );

      expect(lowResult.isDuplicate).toBe(true);
      expect(highResult.isDuplicate).toBe(true);
    });

    it('should handle unicode and international characters', async () => {
      const unicodeDatabase = [
        createMockCiderMasterRecord({ name: 'Cidré François', brand: 'Brasserie Français' }),
        createMockCiderMasterRecord({ name: 'Manzana Sidra', brand: 'Bodega España' }),
        createMockCiderMasterRecord({ name: '林檎酒', brand: '日本酒造' }),
      ];

      const result = await DuplicateDetectionEngine.performDuplicateCheck(
        'Cidre Francois', // Without accent
        'Brasserie Francais',
        4.5,
        'bottle',
        unicodeDatabase
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5); // Should still match reasonably well
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', async () => {
      // Create a large dataset
      const largeDatabase = Array.from({ length: 10000 }, (_, i) =>
        createMockCiderMasterRecord({
          name: `Cider ${i}`,
          brand: `Brand ${i % 100}`,
          abv: 3 + (i % 8),
        })
      );

      const startTime = performance.now();

      const result = await DuplicateDetectionEngine.performDuplicateCheck(
        'Cider 5000',
        'Brand 50',
        7.0,
        'bottle',
        largeDatabase
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(result).toBeDefined();
    });

    it('should limit processing for performance in suggestion generation', () => {
      // Create a very large database
      const veryLargeDatabase = Array.from({ length: 50000 }, (_, i) =>
        createMockCiderMasterRecord({
          name: `Test Name ${i}`,
          brand: `Test Brand ${i % 1000}`,
        })
      );

      const startTime = performance.now();

      const suggestions = DuplicateDetectionEngine.getSimilarCiderNames(
        'Test',
        veryLargeDatabase
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete quickly
      expect(suggestions.length).toBeLessThanOrEqual(5); // Limited results
    });

    it('should maintain accuracy with reasonable performance', async () => {
      // Test with a realistic dataset size (1000 ciders)
      const realisticDatabase = Array.from({ length: 1000 }, (_, i) =>
        createMockCiderMasterRecord({
          name: i % 10 === 0 ? 'Aspall Dry Cider' : `Random Cider ${i}`,
          brand: i % 10 === 0 ? 'Aspall' : `Random Brand ${i}`,
          abv: 3 + Math.random() * 7,
        })
      );

      const startTime = performance.now();

      const result = await DuplicateDetectionEngine.performDuplicateCheck(
        'Aspall Dry Cider',
        'Aspall',
        5.5,
        'bottle',
        realisticDatabase
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Reasonable performance
      expect(result.isDuplicate).toBe(true); // Should still be accurate
      expect(result.confidence).toBeGreaterThan(0.85);
    });
  });
});