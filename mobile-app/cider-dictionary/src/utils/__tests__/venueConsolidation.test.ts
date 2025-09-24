// Comprehensive Venue Consolidation Tests for UK Retail Chains and Pub Groups
// Tests for venue recognition, consolidation rules, and location-based matching

import {
  VenueConsolidationService,
  UK_CHAIN_CONSOLIDATION_RULES,
  VenueConsolidationRule,
  LocationData,
} from '../venueConsolidation';
import { ConsolidatedVenue, VenueType } from '../../types/cider';

// =============================================================================
// TEST SETUP AND FIXTURES
// =============================================================================

const createMockLocationData = (overrides: Partial<LocationData> = {}): LocationData => ({
  latitude: 51.5074, // London coordinates
  longitude: -0.1278,
  accuracy: 50,
  ...overrides,
});

const createMockConsolidatedVenue = (overrides: Partial<ConsolidatedVenue> = {}): ConsolidatedVenue => ({
  id: `venue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Venue',
  type: 'pub',
  location: createMockLocationData(),
  address: '123 Test Street, London',
  postcode: 'SW1A 1AA',
  chainInfo: {
    isChain: false,
    parentCompany: null,
    chainId: null,
  },
  ...overrides,
});

// Mock venue database for testing
const createTestVenueDatabase = (): ConsolidatedVenue[] => [
  createMockConsolidatedVenue({
    id: 'venue1',
    name: 'Tesco Express',
    type: 'retail',
    chainInfo: {
      isChain: true,
      parentCompany: 'Tesco',
      chainId: 'tesco',
    },
  }),
  createMockConsolidatedVenue({
    id: 'venue2',
    name: 'The George Inn',
    type: 'pub',
    chainInfo: {
      isChain: false,
      parentCompany: null,
      chainId: null,
    },
  }),
  createMockConsolidatedVenue({
    id: 'venue3',
    name: 'Wetherspoons - The Moon Under Water',
    type: 'pub',
    chainInfo: {
      isChain: true,
      parentCompany: 'Wetherspoons',
      chainId: 'wetherspoons',
    },
  }),
  createMockConsolidatedVenue({
    id: 'venue4',
    name: 'Sainsbury\'s Local',
    type: 'retail',
    chainInfo: {
      isChain: true,
      parentCompany: 'Sainsbury\'s',
      chainId: 'sainsburys',
    },
  }),
  createMockConsolidatedVenue({
    id: 'venue5',
    name: 'The Crafty Fox',
    type: 'pub',
    location: createMockLocationData({
      latitude: 51.5074,
      longitude: -0.1278,
    }),
    chainInfo: {
      isChain: false,
      parentCompany: null,
      chainId: null,
    },
  }),
];

describe('UK Chain Consolidation Rules', () => {
  it('should have comprehensive supermarket chain rules', () => {
    const supermarketRules = UK_CHAIN_CONSOLIDATION_RULES.filter(rule => rule.type === 'retail');

    expect(supermarketRules.length).toBeGreaterThan(5);

    // Check for major UK supermarkets
    const chainNames = supermarketRules.map(rule => rule.canonicalName.toLowerCase());
    expect(chainNames).toContain('tesco');
    expect(chainNames).toContain('sainsbury\'s');
    expect(chainNames).toContain('asda');
    expect(chainNames).toContain('morrisons');
    expect(chainNames).toContain('waitrose');
  });

  it('should have comprehensive pub chain rules', () => {
    const pubRules = UK_CHAIN_CONSOLIDATION_RULES.filter(rule => rule.type === 'pub');

    expect(pubRules.length).toBeGreaterThan(3);

    const chainNames = pubRules.map(rule => rule.canonicalName.toLowerCase());
    expect(chainNames).toContain('wetherspoons');
    expect(chainNames).toContain('greene king');
  });

  it('should have proper variant mappings for each chain', () => {
    UK_CHAIN_CONSOLIDATION_RULES.forEach(rule => {
      expect(rule.canonicalName).toBeDefined();
      expect(rule.canonicalName.length).toBeGreaterThan(0);
      expect(rule.variants).toBeDefined();
      expect(Array.isArray(rule.variants)).toBe(true);
      expect(rule.variants.length).toBeGreaterThan(0);
      expect(rule.type).toBeDefined();
      expect(['retail', 'pub', 'restaurant', 'farm_shop', 'cidery', 'other']).toContain(rule.type);
    });
  });

  it('should include common Tesco variants', () => {
    const tescoRule = UK_CHAIN_CONSOLIDATION_RULES.find(rule => rule.canonicalName === 'Tesco');

    expect(tescoRule).toBeDefined();
    expect(tescoRule!.variants).toContain('tesco');
    expect(tescoRule!.variants).toContain('tesco express');
    expect(tescoRule!.variants).toContain('tesco extra');
    expect(tescoRule!.variants).toContain('tesco metro');
  });

  it('should include common Wetherspoons variants', () => {
    const wetherspoonsRule = UK_CHAIN_CONSOLIDATION_RULES.find(rule => rule.canonicalName === 'Wetherspoons');

    expect(wetherspoonsRule).toBeDefined();
    expect(wetherspoonsRule!.variants).toContain('wetherspoons');
    expect(wetherspoonsRule!.variants).toContain('spoons');
    expect(wetherspoonsRule!.variants).toContain('jd wetherspoon');

    if (wetherspoonsRule!.aliases) {
      expect(wetherspoonsRule!.aliases).toContain('spoons');
    }
  });
});

describe('VenueConsolidationService', () => {
  let mockVenueDatabase: ConsolidatedVenue[];

  beforeEach(() => {
    mockVenueDatabase = createTestVenueDatabase();
  });

  describe('Chain Recognition', () => {
    it('should recognize Tesco variants correctly', async () => {
      const testCases = [
        'Tesco',
        'Tesco Express',
        'TESCO EXTRA',
        'tesco metro',
        'Tesco Superstore',
      ];

      for (const venueName of testCases) {
        const result = await VenueConsolidationService.consolidateVenueName(venueName);

        expect(result.chainInfo.isChain).toBe(true);
        expect(result.chainInfo.parentCompany).toBe('Tesco');
        expect(result.name).toBe('Tesco');
        expect(result.type).toBe('retail');
      }
    });

    it('should recognize Wetherspoons variants correctly', async () => {
      const testCases = [
        'Wetherspoons',
        'JD Wetherspoon',
        'Spoons',
        'The Moon Under Water', // Specific Wetherspoons pub name
        'The Cross Keys', // Another Wetherspoons name
      ];

      for (const venueName of testCases) {
        const result = await VenueConsolidationService.consolidateVenueName(venueName);

        expect(result.chainInfo.isChain).toBe(true);
        expect(result.chainInfo.parentCompany).toBe('Wetherspoons');
        expect(result.name).toBe('Wetherspoons');
        expect(result.type).toBe('pub');
      }
    });

    it('should recognize Sainsbury\'s variants correctly', async () => {
      const testCases = [
        'Sainsbury\'s',
        'Sainsburys',
        'SAINSBURY\'S LOCAL',
        'sainsburys superstore',
      ];

      for (const venueName of testCases) {
        const result = await VenueConsolidationService.consolidateVenueName(venueName);

        expect(result.chainInfo.isChain).toBe(true);
        expect(result.chainInfo.parentCompany).toBe('Sainsbury\'s');
        expect(result.name).toBe('Sainsbury\'s');
        expect(result.type).toBe('retail');
      }
    });

    it('should handle case-insensitive matching', async () => {
      const testCases = [
        'TESCO EXPRESS',
        'tesco express',
        'Tesco Express',
        'TESCO express',
        'tesco EXPRESS',
      ];

      for (const venueName of testCases) {
        const result = await VenueConsolidationService.consolidateVenueName(venueName);

        expect(result.chainInfo.isChain).toBe(true);
        expect(result.chainInfo.parentCompany).toBe('Tesco');
      }
    });

    it('should handle venues with extra whitespace and punctuation', async () => {
      const testCases = [
        '  Tesco Express  ',
        'Tesco, Express',
        'Tesco - Express',
        '(Tesco Express)',
        'Tesco Express!',
      ];

      for (const venueName of testCases) {
        const result = await VenueConsolidationService.consolidateVenueName(venueName);

        expect(result.chainInfo.isChain).toBe(true);
        expect(result.chainInfo.parentCompany).toBe('Tesco');
      }
    });

    it('should not recognize independent venues as chains', async () => {
      const independentVenues = [
        'The Red Lion',
        'Joe\'s Corner Shop',
        'The Craft Beer Emporium',
        'Village Store',
        'The Bull & Gate',
      ];

      for (const venueName of independentVenues) {
        const result = await VenueConsolidationService.consolidateVenueName(venueName);

        expect(result.chainInfo.isChain).toBe(false);
        expect(result.chainInfo.parentCompany).toBeNull();
        expect(result.name).toBe(venueName);
      }
    });
  });

  describe('Venue Type Detection', () => {
    it('should detect retail venue types correctly', async () => {
      const retailVenues = [
        'Tesco Express',
        'Sainsbury\'s Local',
        'ASDA Superstore',
        'Waitrose',
        'Co-op',
      ];

      for (const venueName of retailVenues) {
        const result = await VenueConsolidationService.consolidateVenueName(venueName);

        expect(result.type).toBe('retail');
      }
    });

    it('should detect pub venue types correctly', async () => {
      const pubVenues = [
        'Wetherspoons',
        'Greene King',
        'The Moon Under Water',
        'Hungry Horse',
      ];

      for (const venueName of pubVenues) {
        const result = await VenueConsolidationService.consolidateVenueName(venueName);

        expect(result.type).toBe('pub');
      }
    });

    it('should default to "other" for unknown venue types', async () => {
      const result = await VenueConsolidationService.consolidateVenueName('Unknown Venue Name');

      expect(result.type).toBe('other');
    });
  });

  describe('Location-Based Matching', () => {
    it('should use location data when provided', async () => {
      const location = createMockLocationData({
        latitude: 52.4862,
        longitude: -1.8904, // Birmingham coordinates
      });

      const result = await VenueConsolidationService.consolidateVenueName(
        'The Independent Pub',
        location
      );

      expect(result.location).toEqual(location);
    });

    it('should handle missing location gracefully', async () => {
      const result = await VenueConsolidationService.consolidateVenueName('Any Venue');

      expect(result.location).toBeUndefined();
    });

    it('should validate location coordinates', async () => {
      const invalidLocation = createMockLocationData({
        latitude: 200, // Invalid latitude
        longitude: -500, // Invalid longitude
      });

      const result = await VenueConsolidationService.consolidateVenueName(
        'Test Venue',
        invalidLocation
      );

      // Service should handle invalid coordinates gracefully
      expect(result).toBeDefined();
    });
  });

  describe('Venue Suggestions', () => {
    it('should provide venue suggestions based on partial input', () => {
      const suggestions = VenueConsolidationService.getVenueSuggestions('Tes', mockVenueDatabase);

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(suggestion => suggestion.toLowerCase().includes('tesco'))).toBe(true);
    });

    it('should provide case-insensitive suggestions', () => {
      const suggestions = VenueConsolidationService.getVenueSuggestions('wether', mockVenueDatabase);

      expect(suggestions.some(suggestion =>
        suggestion.toLowerCase().includes('wetherspoons')
      )).toBe(true);
    });

    it('should limit suggestion results', () => {
      const suggestions = VenueConsolidationService.getVenueSuggestions('The', mockVenueDatabase);

      expect(suggestions.length).toBeLessThanOrEqual(10); // Reasonable limit
    });

    it('should handle empty partial input', () => {
      const suggestions = VenueConsolidationService.getVenueSuggestions('', mockVenueDatabase);

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBe(0);
    });

    it('should handle short partial input', () => {
      const suggestions = VenueConsolidationService.getVenueSuggestions('T', mockVenueDatabase);

      // Should either return results or empty array, but not throw
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should prioritize exact prefix matches', () => {
      const suggestions = VenueConsolidationService.getVenueSuggestions('Tesco', mockVenueDatabase);

      if (suggestions.length > 0) {
        expect(suggestions[0].toLowerCase()).toContain('tesco');
      }
    });
  });

  describe('Chain Information Generation', () => {
    it('should generate proper chain IDs', async () => {
      const result = await VenueConsolidationService.consolidateVenueName('Tesco Express');

      expect(result.chainInfo.chainId).toBe('tesco');
      expect(result.chainInfo.chainId).toMatch(/^[a-z0-9_]+$/); // Lowercase, numbers, underscores only
    });

    it('should handle apostrophes in chain names', async () => {
      const result = await VenueConsolidationService.consolidateVenueName('Sainsbury\'s');

      expect(result.chainInfo.chainId).toBe('sainsburys'); // Apostrophe removed
      expect(result.chainInfo.parentCompany).toBe('Sainsbury\'s'); // Original name preserved
    });

    it('should generate unique chain IDs for different chains', async () => {
      const tescoResult = await VenueConsolidationService.consolidateVenueName('Tesco');
      const sainsburysResult = await VenueConsolidationService.consolidateVenueName('Sainsbury\'s');
      const asdaResult = await VenueConsolidationService.consolidateVenueName('ASDA');

      const chainIds = [
        tescoResult.chainInfo.chainId,
        sainsburysResult.chainInfo.chainId,
        asdaResult.chainInfo.chainId,
      ];

      const uniqueChainIds = new Set(chainIds);
      expect(uniqueChainIds.size).toBe(3); // All should be unique
    });
  });

  describe('Address and Postcode Handling', () => {
    it('should handle venues without address information', async () => {
      const result = await VenueConsolidationService.consolidateVenueName('Test Venue');

      expect(result.address).toBeUndefined();
      expect(result.postcode).toBeUndefined();
    });

    it('should preserve address information when provided', async () => {
      const location = createMockLocationData();
      // Note: In the actual implementation, address might be inferred from location
      const result = await VenueConsolidationService.consolidateVenueName('Test Venue', location);

      // The service might use the location to look up address information
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined venue names', async () => {
      const nullResult = await VenueConsolidationService.consolidateVenueName(null as any);
      const undefinedResult = await VenueConsolidationService.consolidateVenueName(undefined as any);

      expect(nullResult).toBeDefined();
      expect(undefinedResult).toBeDefined();
      expect(nullResult.name).toBe('Unknown Venue');
      expect(undefinedResult.name).toBe('Unknown Venue');
    });

    it('should handle empty string venue names', async () => {
      const result = await VenueConsolidationService.consolidateVenueName('');

      expect(result).toBeDefined();
      expect(result.name).toBe('Unknown Venue');
      expect(result.type).toBe('other');
    });

    it('should handle very long venue names', async () => {
      const longVenueName = 'A'.repeat(1000);
      const result = await VenueConsolidationService.consolidateVenueName(longVenueName);

      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.name.length).toBeGreaterThan(0);
    });

    it('should handle special characters in venue names', async () => {
      const specialCharVenues = [
        'The King & Queen',
        'O\'Brien\'s Irish Pub',
        'Café Rouge',
        'Pizza Hütte',
        'Nando\'s',
        'McDonald\'s',
        'Pret A Manger',
      ];

      for (const venueName of specialCharVenues) {
        const result = await VenueConsolidationService.consolidateVenueName(venueName);

        expect(result).toBeDefined();
        expect(result.name).toBeDefined();
        expect(result.name.length).toBeGreaterThan(0);
      }
    });

    it('should handle venue names with numbers', async () => {
      const numberVenues = [
        'Tesco Express 123',
        'The George IV',
        'Bar 42',
        'Studio 54',
        'Route 66 Diner',
      ];

      for (const venueName of numberVenues) {
        const result = await VenueConsolidationService.consolidateVenueName(venueName);

        expect(result).toBeDefined();
        expect(result.name).toBeDefined();
      }
    });

    it('should handle venue names in different languages', async () => {
      const foreignVenues = [
        'Brasserie François',
        'Pizzeria Mario',
        'Café España',
        'Biergarten München',
        'Trattoria Giuseppe',
      ];

      for (const venueName of foreignVenues) {
        const result = await VenueConsolidationService.consolidateVenueName(venueName);

        expect(result).toBeDefined();
        expect(result.name).toBe(venueName); // Should preserve original name
        expect(result.type).toBe('other'); // Likely not recognized as UK chain
      }
    });
  });

  describe('Performance Tests', () => {
    it('should handle large venue databases efficiently', () => {
      // Create a large venue database
      const largeVenueDatabase = Array.from({ length: 10000 }, (_, i) =>
        createMockConsolidatedVenue({
          name: `Venue ${i}`,
          type: i % 2 === 0 ? 'pub' : 'retail',
        })
      );

      const startTime = performance.now();

      const suggestions = VenueConsolidationService.getVenueSuggestions(
        'Venue',
        largeVenueDatabase
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500); // Should complete quickly
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should perform chain recognition quickly', async () => {
      const startTime = performance.now();

      const results = await Promise.all([
        VenueConsolidationService.consolidateVenueName('Tesco Express'),
        VenueConsolidationService.consolidateVenueName('Sainsbury\'s Local'),
        VenueConsolidationService.consolidateVenueName('Wetherspoons'),
        VenueConsolidationService.consolidateVenueName('ASDA Superstore'),
        VenueConsolidationService.consolidateVenueName('The Independent Pub'),
      ]);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should be very fast
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.name).toBeDefined();
      });
    });

    it('should handle rapid successive calls efficiently', async () => {
      const venueNames = Array.from({ length: 100 }, (_, i) => `Test Venue ${i}`);

      const startTime = performance.now();

      const results = await Promise.all(
        venueNames.map(name => VenueConsolidationService.consolidateVenueName(name))
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle mixed chain and independent venue scenarios', async () => {
      const mixedVenues = [
        'Tesco Express',
        'The Local Pub',
        'Wetherspoons - The Kings Head',
        'Independent Coffee Shop',
        'Sainsbury\'s Local',
        'Dave\'s Corner Shop',
        'Greene King - The Old Oak',
      ];

      const results = await Promise.all(
        mixedVenues.map(name => VenueConsolidationService.consolidateVenueName(name))
      );

      const chainVenues = results.filter(result => result.chainInfo.isChain);
      const independentVenues = results.filter(result => !result.chainInfo.isChain);

      expect(chainVenues.length).toBeGreaterThan(0);
      expect(independentVenues.length).toBeGreaterThan(0);
      expect(chainVenues.length + independentVenues.length).toBe(results.length);
    });

    it('should maintain consistency across similar venue names', async () => {
      const similarVenues = [
        'Tesco',
        'Tesco Express',
        'TESCO EXTRA',
        'tesco superstore',
      ];

      const results = await Promise.all(
        similarVenues.map(name => VenueConsolidationService.consolidateVenueName(name))
      );

      // All should consolidate to the same canonical name
      results.forEach(result => {
        expect(result.chainInfo.isChain).toBe(true);
        expect(result.chainInfo.parentCompany).toBe('Tesco');
        expect(result.name).toBe('Tesco');
        expect(result.type).toBe('retail');
      });
    });

    it('should handle venue consolidation with location context', async () => {
      const londonLocation = createMockLocationData({
        latitude: 51.5074,
        longitude: -0.1278,
      });

      const manchesterLocation = createMockLocationData({
        latitude: 53.4808,
        longitude: -2.2426,
      });

      const londonVenue = await VenueConsolidationService.consolidateVenueName(
        'Tesco Express',
        londonLocation
      );

      const manchesterVenue = await VenueConsolidationService.consolidateVenueName(
        'Tesco Express',
        manchesterLocation
      );

      // Both should be recognized as Tesco but have different locations
      expect(londonVenue.chainInfo.parentCompany).toBe('Tesco');
      expect(manchesterVenue.chainInfo.parentCompany).toBe('Tesco');
      expect(londonVenue.location).toEqual(londonLocation);
      expect(manchesterVenue.location).toEqual(manchesterLocation);
    });
  });
});