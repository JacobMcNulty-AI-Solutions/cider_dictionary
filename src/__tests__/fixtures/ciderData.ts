import {
  BasicCiderRecord,
  CiderMasterRecord,
  QuickEntryForm,
  ConsolidatedVenue,
  TraditionalStyle,
  AppleCategory,
  ContainerType,
  VenueType,
  DisclosureLevel,
  Rating
} from '../../types/cider';

// Mock cider data for testing
export const mockCiderRecord: BasicCiderRecord = {
  id: '1',
  name: 'Test Cider',
  brand: 'Test Brand',
  abv: 5.5,
  overallRating: 7,
  createdAt: new Date('2024-01-01T10:00:00.000Z'),
};

export const mockCiderRecords: BasicCiderRecord[] = [
  {
    id: '1',
    name: 'Scrumpy Jack Original',
    brand: 'Aston Manor',
    abv: 6.0,
    overallRating: 7,
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
  },
  {
    id: '2',
    name: 'Strongbow Original',
    brand: 'Heineken UK',
    abv: 5.0,
    overallRating: 6,
    createdAt: new Date('2024-01-02T11:00:00.000Z'),
  },
  {
    id: '3',
    name: 'Old Mout Kiwi & Lime',
    brand: 'Old Mout',
    abv: 4.0,
    overallRating: 8,
    createdAt: new Date('2024-01-03T12:00:00.000Z'),
  },
  {
    id: '4',
    name: 'Magners Original',
    brand: 'C&C Group',
    abv: 4.5,
    overallRating: 5,
    createdAt: new Date('2024-01-04T13:00:00.000Z'),
  },
  {
    id: '5',
    name: 'Rekorderlig Strawberry & Lime',
    brand: 'Abro Bryggeri',
    abv: 4.0,
    overallRating: 9,
    createdAt: new Date('2024-01-05T14:00:00.000Z'),
  },
];

export const mockQuickEntryForm: QuickEntryForm = {
  name: 'New Test Cider',
  brand: 'New Test Brand',
  abv: 4.2,
  overallRating: 8,
};


// Factory function to create cider records with overrides
export const createMockCider = (overrides: Partial<BasicCiderRecord> = {}): BasicCiderRecord => ({
  ...mockCiderRecord,
  ...overrides,
});

// Factory function to create multiple ciders
export const createMockCiders = (count: number): BasicCiderRecord[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: (index + 1).toString(),
    name: `Test Cider ${index + 1}`,
    brand: `Test Brand ${index + 1}`,
    abv: 4.0 + (index * 0.5),
    overallRating: Math.min(10, 5 + index),
    createdAt: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)), // Each day older
  }));
};

// =============================================================================
// PHASE 2 ENHANCED FIXTURES
// =============================================================================

// Mock CiderMasterRecord with full Phase 2 data
export const mockCiderMasterRecord: CiderMasterRecord = {
  id: '1',
  userId: 'test-user-id',
  name: 'Test Heritage Cider',
  brand: 'Traditional Cidermakers',
  abv: 6.2,
  overallRating: 8,
  photo: 'test-photo-uri',
  notes: 'Excellent traditional cider with complex apple character',
  traditionalStyle: 'heritage',
  basicCharacteristics: {
    sweetness: 'dry',
    carbonation: 'light_sparkling',
    clarity: 'hazy'
  },
  tasteTags: ['earthy', 'apple-forward', 'traditional', 'farmhouse'],
  containerType: 'bottle',
  appleClassification: {
    categories: ['bittersweet', 'bittersharp'],
    varieties: ['Kingston Black', 'Dabinett', 'Yarlington Mill'],
    longAshtonClassification: 'Traditional English Heritage Blend'
  },
  productionMethods: {
    fermentation: 'wild',
    specialProcesses: ['keeved', 'barrel_aged']
  },
  detailedRatings: {
    appearance: 7,
    aroma: 8,
    taste: 9,
    mouthfeel: 8
  },
  venue: {
    id: 'venue-1',
    name: 'The Cider House',
    type: 'pub',
    location: {
      latitude: 51.5074,
      longitude: -0.1278
    }
  },
  createdAt: new Date('2024-01-01T10:00:00.000Z'),
  updatedAt: new Date('2024-01-01T10:00:00.000Z'),
  syncStatus: 'synced',
  version: 1
};

// Mock ConsolidatedVenue data
export const mockVenue: ConsolidatedVenue = {
  id: 'venue-1',
  name: 'The Cider House',
  type: 'pub',
  location: {
    latitude: 51.5074,
    longitude: -0.1278
  },
  isExisting: true
};

// Multiple mock venues for testing
export const mockVenues: ConsolidatedVenue[] = [
  mockVenue,
  {
    id: 'venue-2',
    name: 'Heritage Cidery',
    type: 'cidery',
    isExisting: false,
    consolidatedFrom: 'raw-venue-name',
    originalName: 'heritage cidery'
  },
  {
    id: 'venue-3',
    name: 'Festival Grounds',
    type: 'festival',
    location: {
      latitude: 50.8503,
      longitude: -0.1347
    },
    isExisting: true
  }
];

// Enhanced Phase 2 mock records
export const mockCiderMasterRecords: CiderMasterRecord[] = [
  {
    ...mockCiderMasterRecord,
    id: '1',
    name: 'Scrumpy Jack Original',
    brand: 'Aston Manor',
    abv: 6.0,
    overallRating: 7,
    traditionalStyle: 'modern_craft',
    basicCharacteristics: {
      sweetness: 'medium',
      carbonation: 'sparkling',
      clarity: 'clear'
    },
    tasteTags: ['refreshing', 'commercial', 'accessible'],
    containerType: 'can'
  },
  {
    ...mockCiderMasterRecord,
    id: '2',
    name: 'Old Mout Kiwi & Lime',
    brand: 'Old Mout',
    abv: 4.0,
    overallRating: 8,
    traditionalStyle: 'fruit_cider',
    basicCharacteristics: {
      sweetness: 'sweet',
      carbonation: 'highly_carbonated',
      clarity: 'crystal_clear'
    },
    tasteTags: ['tropical', 'lime', 'kiwi', 'refreshing'],
    containerType: 'bottle'
  },
  {
    ...mockCiderMasterRecord,
    id: '3',
    name: 'Magners Original',
    brand: 'C&C Group',
    abv: 4.5,
    overallRating: 5,
    traditionalStyle: 'international',
    basicCharacteristics: {
      sweetness: 'off_dry',
      carbonation: 'sparkling',
      clarity: 'clear'
    },
    tasteTags: ['commercial', 'mass-market'],
    containerType: 'bottle'
  }
];

// Progressive disclosure form data for different levels
export const mockQuickEntryFormCasual: QuickEntryForm = {
  name: 'Casual Entry Cider',
  brand: 'Easy Brand',
  abv: 4.2,
  overallRating: 7
};

export const mockQuickEntryFormEnthusiast: QuickEntryForm = {
  ...mockQuickEntryFormCasual,
  name: 'Enthusiast Entry Cider',
  traditionalStyle: 'heritage',
  basicCharacteristics: {
    sweetness: 'dry',
    carbonation: 'light_sparkling',
    clarity: 'hazy'
  },
  tasteTags: ['traditional', 'complex'],
  containerType: 'bottle'
};

export const mockQuickEntryFormExpert: QuickEntryForm = {
  ...mockQuickEntryFormEnthusiast,
  name: 'Expert Entry Cider',
  appleClassification: {
    categories: ['bittersweet'],
    varieties: ['Kingston Black']
  },
  productionMethods: {
    fermentation: 'wild',
    specialProcesses: ['keeved']
  },
  detailedRatings: {
    appearance: 8,
    aroma: 7,
    taste: 9,
    mouthfeel: 8
  }
};

// Factory function to create Phase 2 cider records with overrides
export const createMockCiderMaster = (overrides: Partial<CiderMasterRecord> = {}): CiderMasterRecord => ({
  ...mockCiderMasterRecord,
  ...overrides,
});

// Factory function to create multiple Phase 2 ciders
export const createMockCiderMasters = (count: number): CiderMasterRecord[] => {
  return Array.from({ length: count }, (_, index) => ({
    ...mockCiderMasterRecord,
    id: `cider_${Date.now()}_${index}`,
    name: `Test Heritage Cider ${index + 1}`,
    brand: `Traditional Cidermakers ${index + 1}`,
    abv: 4.0 + (index * 0.3),
    overallRating: Math.min(10, 5 + (index % 6)) as Rating,
    createdAt: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)),
    updatedAt: new Date(Date.now() - (index * 24 * 60 * 60 * 1000))
  }));
};

// Progressive disclosure test data
export const disclosureTestData = {
  casual: {
    level: 'casual' as DisclosureLevel,
    form: mockQuickEntryFormCasual,
    targetTime: 30
  },
  enthusiast: {
    level: 'enthusiast' as DisclosureLevel,
    form: mockQuickEntryFormEnthusiast,
    targetTime: 120
  },
  expert: {
    level: 'expert' as DisclosureLevel,
    form: mockQuickEntryFormExpert,
    targetTime: 300
  }
};

// Edge case data
export const edgeCaseData = {
  // ABV edge cases
  minAbv: createMockCider({ abv: 0.1 }),
  maxAbv: createMockCider({ abv: 20.0 }),

  // Rating edge cases
  minRating: createMockCider({ overallRating: 1 }),
  maxRating: createMockCider({ overallRating: 10 }),

  // Name length edge cases
  longName: createMockCider({
    name: 'This is a very long cider name that might cause display issues in the UI components'
  }),

  // Empty form data
  emptyStrings: {
    name: '',
    brand: '',
    abv: 0,
    overallRating: 5,
  } as QuickEntryForm,

  // Phase 2 specific edge cases
  masterRecordMaxFields: createMockCiderMaster({
    name: 'Maximum Fields Test Cider',
    tasteTags: Array.from({ length: 10 }, (_, i) => `tag${i + 1}`),
    appleClassification: {
      categories: ['bittersweet', 'bittersharp', 'sweet', 'sharp'],
      varieties: Array.from({ length: 20 }, (_, i) => `Variety${i + 1}`),
      longAshtonClassification: 'Complex Multi-Variety Traditional Heritage Blend Classification'
    },
    notes: 'A'.repeat(1000) // Maximum notes length
  }),

  // Empty Phase 2 record (minimal fields only)
  masterRecordMinimal: {
    id: 'minimal-1',
    userId: 'test-user',
    name: 'Minimal Cider',
    brand: 'Minimal Brand',
    abv: 5.0,
    overallRating: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    syncStatus: 'pending',
    version: 1
  } as CiderMasterRecord
};

// Duplicate detection test data
export const duplicateTestData = {
  exactDuplicate: {
    name: 'Test Cider',
    brand: 'Test Brand'
  },
  similarName: {
    name: 'Test Cydr', // Similar spelling
    brand: 'Test Brand'
  },
  similarBrand: {
    name: 'Test Cider',
    brand: 'Test Brnd' // Similar spelling
  },
  noMatch: {
    name: 'Completely Different Name',
    brand: 'Completely Different Brand'
  }
};