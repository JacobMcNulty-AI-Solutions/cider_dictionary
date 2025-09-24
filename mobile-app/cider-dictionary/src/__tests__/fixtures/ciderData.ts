import { BasicCiderRecord, QuickEntryForm } from '../../types/cider';

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

// Edge case data
export const edgeCaseData = {
  minAbv: createMockCider({ abv: 0.1 }),
  maxAbv: createMockCider({ abv: 20.0 }),
  minRating: createMockCider({ overallRating: 1 }),
  maxRating: createMockCider({ overallRating: 10 }),
  longName: createMockCider({
    name: 'This is a very long cider name that might cause display issues in the UI components'
  }),
  emptyStrings: {
    name: '',
    brand: '',
    abv: 0,
    overallRating: 5,
  } as QuickEntryForm,
};