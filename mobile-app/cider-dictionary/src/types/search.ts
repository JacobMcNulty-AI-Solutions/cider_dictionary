// Advanced Search Types for Phase 4

import { CiderMasterRecord } from './cider';

export type SortBy =
  | 'name'
  | 'brand'
  | 'rating'
  | 'abv'
  | 'price'
  | 'dateAdded'
  | 'lastTried'
  | 'timesTried'
  | 'relevance';

export type SortDirection = 'asc' | 'desc';

export type MatchType = 'exact' | 'partial' | 'fuzzy';

export interface FilterState {
  // Range filters
  ratingRange: [number, number];
  abvRange: [number, number];
  priceRange: [number, number];

  // Array filters
  tasteTags: Set<string>;
  traditionalStyles: Set<string>;
  venues: Set<string>;

  // Characteristic filters
  characteristics: {
    sweetness: Set<string>;
    carbonation: Set<string>;
    clarity: Set<string>;
    color: Set<string>;
  };

  // Date filters
  dateRange: {
    start: Date | null;
    end: Date | null;
  };

  // Boolean filters
  hasPhoto: boolean | null;
  hasNotes: boolean | null;
  hasExperiences: boolean | null;
}

export interface SearchState {
  // Text query
  query: string;
  normalizedQuery: string;
  queryTokens: string[];

  // Filters
  filters: FilterState;

  // Sorting
  sortBy: SortBy;
  sortDirection: SortDirection;

  // Results metadata
  resultCount: number;
  searchTime: number;
  lastSearchTimestamp: Date | null;
}

export interface MatchedField {
  field: string;
  matchType: MatchType;
  snippet: string;
}

export interface SearchResult {
  cider: CiderMasterRecord;
  relevanceScore: number;
  matchedFields: MatchedField[];
  highlights: Map<string, string>;
}

// Default filter state
export const DEFAULT_FILTERS: FilterState = {
  ratingRange: [1, 10],
  abvRange: [0.1, 20],
  priceRange: [0, 100],
  tasteTags: new Set(),
  traditionalStyles: new Set(),
  venues: new Set(),
  characteristics: {
    sweetness: new Set(),
    carbonation: new Set(),
    clarity: new Set(),
    color: new Set(),
  },
  dateRange: {
    start: null,
    end: null,
  },
  hasPhoto: null,
  hasNotes: null,
  hasExperiences: null,
};

// Default search state
export const DEFAULT_SEARCH_STATE: SearchState = {
  query: '',
  normalizedQuery: '',
  queryTokens: [],
  filters: DEFAULT_FILTERS,
  sortBy: 'relevance',
  sortDirection: 'desc',
  resultCount: 0,
  searchTime: 0,
  lastSearchTimestamp: null,
};

// Quick filter presets
export interface QuickFilter {
  id: string;
  label: string;
  icon: string;
  applyFilter: (filters: FilterState) => FilterState;
}

export const QUICK_FILTERS: QuickFilter[] = [
  {
    id: 'high_rated',
    label: 'High Rated',
    icon: '⭐',
    applyFilter: (filters) => ({
      ...filters,
      ratingRange: [8, 10],
    }),
  },
  {
    id: 'strong',
    label: 'Strong',
    icon: '💪',
    applyFilter: (filters) => ({
      ...filters,
      abvRange: [7, 20],
    }),
  },
  {
    id: 'sweet',
    label: 'Sweet',
    icon: '🍯',
    applyFilter: (filters) => ({
      ...filters,
      characteristics: {
        ...filters.characteristics,
        sweetness: new Set(['Sweet', 'Semi-Sweet']),
      },
    }),
  },
  {
    id: 'dry',
    label: 'Dry',
    icon: '🏜️',
    applyFilter: (filters) => ({
      ...filters,
      characteristics: {
        ...filters.characteristics,
        sweetness: new Set(['Dry', 'Off-Dry']),
      },
    }),
  },
  {
    id: 'with_photo',
    label: 'With Photo',
    icon: '📷',
    applyFilter: (filters) => ({
      ...filters,
      hasPhoto: true,
    }),
  },
];
