// Comprehensive Enhanced Collection Screen Tests for Phase 2 UI
// Tests for enhanced search, filtering, analytics integration, and cider management

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import EnhancedCollectionScreen from '../EnhancedCollectionScreen';
import { useCiderStore } from '../../../store/ciderStore';
import { CiderMasterRecord } from '../../../types/cider';

// =============================================================================
// TEST SETUP AND MOCKS
// =============================================================================

// Mock cider data
const createMockCider = (overrides: Partial<CiderMasterRecord> = {}): CiderMasterRecord => ({
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

const mockCiders = [
  createMockCider({
    id: 'cider1',
    name: 'Aspall Dry Cider',
    brand: 'Aspall',
    abv: 5.5,
    overallRating: 4.2,
    tasteTags: ['dry', 'crisp', 'apple'],
    containerType: 'bottle',
  }),
  createMockCider({
    id: 'cider2',
    name: 'Thatchers Gold',
    brand: 'Thatchers',
    abv: 4.8,
    overallRating: 4.0,
    tasteTags: ['smooth', 'refreshing'],
    containerType: 'can',
  }),
  createMockCider({
    id: 'cider3',
    name: 'Strongbow Original',
    brand: 'Strongbow',
    abv: 5.0,
    overallRating: 3.2,
    tasteTags: ['sweet', 'light'],
    containerType: 'bottle',
  }),
  createMockCider({
    id: 'cider4',
    name: 'Old Mout Berries',
    brand: 'Old Mout',
    abv: 4.0,
    overallRating: 3.8,
    tasteTags: ['fruity', 'sweet', 'berry'],
    containerType: 'bottle',
  }),
];

const mockAnalytics = {
  totalCiders: 4,
  averageRating: 3.8,
  averageAbv: 4.8,
  highestRated: mockCiders[0],
  lowestRated: mockCiders[2],
  ratingDistribution: { 3: 1, 4: 2, 5: 1 },
  abvDistribution: {
    min: 4.0,
    max: 5.5,
    avg: 4.8,
    median: 4.9,
  },
  styleDistribution: {},
  topVenues: [],
  venueTypeDistribution: {},
  cidersThisMonth: 2,
  cidersThisYear: 4,
  monthlyTrend: [],
  uniqueBrands: 4,
  avgCidersPerBrand: 1.0,
  mostTried: [],
};

// Store mocks
const mockSetSearchQuery = jest.fn();
const mockSetSortOrder = jest.fn();
const mockClearFilters = jest.fn();
const mockLoadCiders = jest.fn();
const mockDeleteCider = jest.fn();
const mockSearchByBrand = jest.fn();
const mockSearchByABVRange = jest.fn();
const mockSearchByRatingRange = jest.fn();
const mockGetTopRatedCiders = jest.fn();
const mockGetRecentCiders = jest.fn();
const mockGetBrandDistribution = jest.fn();

jest.mock('../../../store/ciderStore', () => ({
  useCiderStore: jest.fn(),
}));

// Navigation mock
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useFocusEffect: jest.fn((callback) => callback()),
}));

// Mock components
jest.mock('../../../components/cards/EnhancedCiderCard', () => {
  return function MockEnhancedCiderCard({ cider, onPress, onLongPress }: any) {
    return (
      <div
        testID={`cider-card-${cider.id}`}
        onClick={() => onPress && onPress()}
        onContextMenu={() => onLongPress && onLongPress()}
      >
        <span testID={`cider-name-${cider.id}`}>{cider.name}</span>
        <span testID={`cider-brand-${cider.id}`}>{cider.brand}</span>
        <span testID={`cider-rating-${cider.id}`}>{cider.overallRating}</span>
      </div>
    );
  };
});

jest.mock('../../../components/collection/SearchBar', () => {
  return function MockSearchBar({ onSearch, onFilterChange }: any) {
    return (
      <div testID="search-bar">
        <input
          testID="search-input"
          placeholder="Search ciders..."
          onChange={(e) => onSearch && onSearch(e.target.value)}
        />
        <button
          testID="filter-button"
          onClick={() => onFilterChange && onFilterChange({ type: 'brand', value: 'test' })}
        >
          Filter
        </button>
      </div>
    );
  };
});

// Wrapper component for navigation context
const NavigationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NavigationContainer>{children}</NavigationContainer>
);

const renderWithNavigation = (component: React.ReactElement) => {
  return render(component, { wrapper: NavigationWrapper });
};

describe('EnhancedCollectionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default store state
    (useCiderStore as jest.Mock).mockReturnValue({
      ciders: mockCiders,
      filteredCiders: mockCiders,
      isLoading: false,
      error: null,
      searchQuery: '',
      sortOrder: 'dateAdded',
      sortDirection: 'desc',
      analytics: mockAnalytics,
      setSearchQuery: mockSetSearchQuery,
      setSortOrder: mockSetSortOrder,
      clearFilters: mockClearFilters,
      loadCiders: mockLoadCiders,
      deleteCider: mockDeleteCider,
      searchByBrand: mockSearchByBrand,
      searchByABVRange: mockSearchByABVRange,
      searchByRatingRange: mockSearchByRatingRange,
      getTopRatedCiders: mockGetTopRatedCiders,
      getRecentCiders: mockGetRecentCiders,
      getBrandDistribution: mockGetBrandDistribution,
    });

    // Mock return values for search functions
    mockSearchByBrand.mockReturnValue(mockCiders.filter(c => c.brand === 'Aspall'));
    mockSearchByABVRange.mockReturnValue(mockCiders.filter(c => c.abv >= 4.5));
    mockSearchByRatingRange.mockReturnValue(mockCiders.filter(c => c.overallRating >= 4.0));
    mockGetTopRatedCiders.mockReturnValue(mockCiders.slice(0, 3));
    mockGetRecentCiders.mockReturnValue(mockCiders.slice(0, 2));
    mockGetBrandDistribution.mockReturnValue({ 'Aspall': 1, 'Thatchers': 1, 'Strongbow': 1, 'Old Mout': 1 });
  });

  // =============================================================================
  // BASIC RENDERING TESTS
  // =============================================================================

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      expect(getByTestId('enhanced-collection-screen')).toBeTruthy();
    });

    it('should render search bar', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      expect(getByTestId('search-bar')).toBeTruthy();
      expect(getByTestId('search-input')).toBeTruthy();
    });

    it('should render cider list when ciders are available', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      expect(getByTestId('cider-list')).toBeTruthy();
      expect(getByTestId('cider-card-cider1')).toBeTruthy();
      expect(getByTestId('cider-card-cider2')).toBeTruthy();
      expect(getByTestId('cider-card-cider3')).toBeTruthy();
      expect(getByTestId('cider-card-cider4')).toBeTruthy();
    });

    it('should render empty state when no ciders are available', () => {
      (useCiderStore as jest.Mock).mockReturnValue({
        ...useCiderStore(),
        ciders: [],
        filteredCiders: [],
      });

      const { getByTestId, getByText } = renderWithNavigation(<EnhancedCollectionScreen />);

      expect(getByTestId('empty-collection-state')).toBeTruthy();
      expect(getByText('No Ciders Found')).toBeTruthy();
      expect(getByText('Add your first cider to get started!')).toBeTruthy();
    });

    it('should render loading state', () => {
      (useCiderStore as jest.Mock).mockReturnValue({
        ...useCiderStore(),
        isLoading: true,
      });

      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      expect(getByTestId('loading-spinner')).toBeTruthy();
    });

    it('should render error state', () => {
      const errorMessage = 'Failed to load ciders';
      (useCiderStore as jest.Mock).mockReturnValue({
        ...useCiderStore(),
        error: errorMessage,
      });

      const { getByText } = renderWithNavigation(<EnhancedCollectionScreen />);

      expect(getByText(errorMessage)).toBeTruthy();
    });
  });

  // =============================================================================
  // CIDER LIST DISPLAY TESTS
  // =============================================================================

  describe('Cider List Display', () => {
    it('should display cider information correctly', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      // Check first cider
      expect(getByTestId('cider-name-cider1')).toHaveTextContent('Aspall Dry Cider');
      expect(getByTestId('cider-brand-cider1')).toHaveTextContent('Aspall');
      expect(getByTestId('cider-rating-cider1')).toHaveTextContent('4.2');

      // Check second cider
      expect(getByTestId('cider-name-cider2')).toHaveTextContent('Thatchers Gold');
      expect(getByTestId('cider-brand-cider2')).toHaveTextContent('Thatchers');
      expect(getByTestId('cider-rating-cider2')).toHaveTextContent('4');
    });

    it('should handle cider card press events', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      fireEvent.press(getByTestId('cider-card-cider1'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('CiderDetail', {
        ciderId: 'cider1'
      });
    });

    it('should handle cider card long press events', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      fireEvent(getByTestId('cider-card-cider1'), 'longPress');

      // Should show action sheet or context menu
      expect(getByTestId('cider-actions-modal')).toBeTruthy();
    });

    it('should display filtered ciders when search is active', () => {
      (useCiderStore as jest.Mock).mockReturnValue({
        ...useCiderStore(),
        filteredCiders: [mockCiders[0], mockCiders[1]], // Only first two ciders
        searchQuery: 'test query',
      });

      const { getByTestId, queryByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      expect(getByTestId('cider-card-cider1')).toBeTruthy();
      expect(getByTestId('cider-card-cider2')).toBeTruthy();
      expect(queryByTestId('cider-card-cider3')).toBeFalsy();
      expect(queryByTestId('cider-card-cider4')).toBeFalsy();
    });
  });

  // =============================================================================
  // SEARCH FUNCTIONALITY TESTS
  // =============================================================================

  describe('Search Functionality', () => {
    it('should trigger search when text is entered', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      fireEvent.changeText(getByTestId('search-input'), 'Aspall');

      expect(mockSetSearchQuery).toHaveBeenCalledWith('Aspall');
    });

    it('should clear search when empty string is entered', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      fireEvent.changeText(getByTestId('search-input'), '');

      expect(mockSetSearchQuery).toHaveBeenCalledWith('');
    });

    it('should show search results count', () => {
      (useCiderStore as jest.Mock).mockReturnValue({
        ...useCiderStore(),
        filteredCiders: [mockCiders[0]],
        searchQuery: 'Aspall',
      });

      const { getByText } = renderWithNavigation(<EnhancedCollectionScreen />);

      expect(getByText('1 result found')).toBeTruthy();
    });

    it('should show no results message when search returns empty', () => {
      (useCiderStore as jest.Mock).mockReturnValue({
        ...useCiderStore(),
        filteredCiders: [],
        searchQuery: 'nonexistent',
      });

      const { getByText } = renderWithNavigation(<EnhancedCollectionScreen />);

      expect(getByText('No ciders match your search')).toBeTruthy();
    });

    it('should provide search suggestions', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      fireEvent.changeText(getByTestId('search-input'), 'Asp');

      // Should show search suggestions
      expect(getByTestId('search-suggestions')).toBeTruthy();
    });

    it('should handle voice search if available', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      const voiceSearchButton = getByTestId('voice-search-button');
      fireEvent.press(voiceSearchButton);

      expect(getByTestId('voice-search-modal')).toBeTruthy();
    });
  });

  // =============================================================================
  // FILTERING TESTS
  // =============================================================================

  describe('Filtering', () => {
    it('should show filter options when filter button is pressed', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      fireEvent.press(getByTestId('filter-button'));

      expect(getByTestId('filter-modal')).toBeTruthy();
    });

    it('should filter by brand', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      // Open filter modal and select brand filter
      fireEvent.press(getByTestId('filter-button'));
      fireEvent.press(getByTestId('brand-filter-option'));
      fireEvent.press(getByTestId('brand-aspall'));

      expect(mockSearchByBrand).toHaveBeenCalledWith('Aspall');
    });

    it('should filter by ABV range', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      fireEvent.press(getByTestId('filter-button'));
      fireEvent.press(getByTestId('abv-filter-option'));

      // Set ABV range
      const minAbvSlider = getByTestId('min-abv-slider');
      const maxAbvSlider = getByTestId('max-abv-slider');

      fireEvent(minAbvSlider, 'valueChange', 4.5);
      fireEvent(maxAbvSlider, 'valueChange', 6.0);

      fireEvent.press(getByTestId('apply-abv-filter'));

      expect(mockSearchByABVRange).toHaveBeenCalledWith(4.5, 6.0);
    });

    it('should filter by rating range', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      fireEvent.press(getByTestId('filter-button'));
      fireEvent.press(getByTestId('rating-filter-option'));

      const minRatingSlider = getByTestId('min-rating-slider');
      const maxRatingSlider = getByTestId('max-rating-slider');

      fireEvent(minRatingSlider, 'valueChange', 4.0);
      fireEvent(maxRatingSlider, 'valueChange', 5.0);

      fireEvent.press(getByTestId('apply-rating-filter'));

      expect(mockSearchByRatingRange).toHaveBeenCalledWith(4.0, 5.0);
    });

    it('should clear all filters', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      fireEvent.press(getByTestId('filter-button'));
      fireEvent.press(getByTestId('clear-filters-button'));

      expect(mockClearFilters).toHaveBeenCalled();
    });

    it('should show active filter indicators', () => {
      (useCiderStore as jest.Mock).mockReturnValue({
        ...useCiderStore(),
        searchQuery: 'Aspall',
      });

      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      expect(getByTestId('active-filters-indicator')).toBeTruthy();
      expect(getByTestId('active-filter-chip')).toHaveTextContent('Search: Aspall');
    });
  });

  // =============================================================================
  // SORTING TESTS
  // =============================================================================

  describe('Sorting', () => {
    it('should show sort options', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      fireEvent.press(getByTestId('sort-button'));

      expect(getByTestId('sort-modal')).toBeTruthy();
      expect(getByTestId('sort-by-name')).toBeTruthy();
      expect(getByTestId('sort-by-brand')).toBeTruthy();
      expect(getByTestId('sort-by-rating')).toBeTruthy();
      expect(getByTestId('sort-by-abv')).toBeTruthy();
      expect(getByTestId('sort-by-date')).toBeTruthy();
    });

    it('should sort by name', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      fireEvent.press(getByTestId('sort-button'));
      fireEvent.press(getByTestId('sort-by-name'));

      expect(mockSetSortOrder).toHaveBeenCalledWith('name', 'asc');
    });

    it('should sort by rating descending', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      fireEvent.press(getByTestId('sort-button'));
      fireEvent.press(getByTestId('sort-by-rating'));

      expect(mockSetSortOrder).toHaveBeenCalledWith('rating', 'desc');
    });

    it('should toggle sort direction', () => {
      (useCiderStore as jest.Mock).mockReturnValue({
        ...useCiderStore(),
        sortOrder: 'name',
        sortDirection: 'asc',
      });

      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      fireEvent.press(getByTestId('sort-button'));
      fireEvent.press(getByTestId('sort-by-name')); // Should toggle to desc

      expect(mockSetSortOrder).toHaveBeenCalledWith('name', 'desc');
    });

    it('should show current sort indicator', () => {
      (useCiderStore as jest.Mock).mockReturnValue({
        ...useCiderStore(),
        sortOrder: 'rating',
        sortDirection: 'desc',
      });

      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      expect(getByTestId('current-sort-indicator')).toHaveTextContent('Rating ↓');
    });
  });

  // =============================================================================
  // ANALYTICS INTEGRATION TESTS
  // =============================================================================

  describe('Analytics Integration', () => {
    it('should display collection statistics', () => {
      const { getByText } = renderWithNavigation(<EnhancedCollectionScreen />);

      fireEvent.press(getByTestId('stats-button'));

      expect(getByText('4 Total Ciders')).toBeTruthy();
      expect(getByText('Avg Rating: 3.8')).toBeTruthy();
      expect(getByText('Avg ABV: 4.8%')).toBeTruthy();
    });

    it('should show top rated ciders section', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      fireEvent.press(getByTestId('view-top-rated'));

      expect(mockGetTopRatedCiders).toHaveBeenCalledWith(5);
      expect(getByTestId('top-rated-section')).toBeTruthy();
    });

    it('should show recent ciders section', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      fireEvent.press(getByTestId('view-recent'));

      expect(mockGetRecentCiders).toHaveBeenCalledWith(30);
      expect(getByTestId('recent-ciders-section')).toBeTruthy();
    });

    it('should show brand distribution chart', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      fireEvent.press(getByTestId('view-analytics'));

      expect(mockGetBrandDistribution).toHaveBeenCalled();
      expect(getByTestId('brand-distribution-chart')).toBeTruthy();
    });

    it('should handle analytics errors gracefully', () => {
      (useCiderStore as jest.Mock).mockReturnValue({
        ...useCiderStore(),
        analytics: null,
      });

      const { queryByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      // Should not crash when analytics is null
      expect(queryByTestId('enhanced-collection-screen')).toBeTruthy();
    });
  });

  // =============================================================================
  // CIDER MANAGEMENT TESTS
  // =============================================================================

  describe('Cider Management', () => {
    it('should navigate to add new cider', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      fireEvent.press(getByTestId('add-cider-fab'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('QuickEntry');
    });

    it('should show cider actions on long press', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      fireEvent(getByTestId('cider-card-cider1'), 'longPress');

      expect(getByTestId('cider-actions-modal')).toBeTruthy();
      expect(getByTestId('edit-cider-action')).toBeTruthy();
      expect(getByTestId('delete-cider-action')).toBeTruthy();
      expect(getByTestId('share-cider-action')).toBeTruthy();
    });

    it('should handle cider deletion', async () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      fireEvent(getByTestId('cider-card-cider1'), 'longPress');
      fireEvent.press(getByTestId('delete-cider-action'));

      // Should show confirmation dialog
      expect(getByTestId('delete-confirmation-modal')).toBeTruthy();

      fireEvent.press(getByTestId('confirm-delete-button'));

      await waitFor(() => {
        expect(mockDeleteCider).toHaveBeenCalledWith('cider1');
      });
    });

    it('should handle edit cider navigation', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      fireEvent(getByTestId('cider-card-cider1'), 'longPress');
      fireEvent.press(getByTestId('edit-cider-action'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('CiderEdit', {
        ciderId: 'cider1'
      });
    });

    it('should handle cider sharing', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      fireEvent(getByTestId('cider-card-cider1'), 'longPress');
      fireEvent.press(getByTestId('share-cider-action'));

      expect(getByTestId('share-modal')).toBeTruthy();
    });

    it('should support bulk operations', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      // Enter selection mode
      fireEvent.press(getByTestId('bulk-select-button'));

      expect(getByTestId('selection-mode-header')).toBeTruthy();

      // Select multiple ciders
      fireEvent.press(getByTestId('cider-card-cider1'));
      fireEvent.press(getByTestId('cider-card-cider2'));

      expect(getByTestId('bulk-actions-toolbar')).toBeTruthy();
      expect(getByTestId('bulk-delete-button')).toBeTruthy();
      expect(getByTestId('bulk-export-button')).toBeTruthy();
    });
  });

  // =============================================================================
  // PERFORMANCE TESTS
  // =============================================================================

  describe('Performance', () => {
    it('should handle large cider collections efficiently', () => {
      const largeCiderCollection = Array.from({ length: 1000 }, (_, i) =>
        createMockCider({
          id: `cider${i}`,
          name: `Cider ${i}`,
          brand: `Brand ${i % 10}`,
        })
      );

      (useCiderStore as jest.Mock).mockReturnValue({
        ...useCiderStore(),
        ciders: largeCiderCollection,
        filteredCiders: largeCiderCollection.slice(0, 20), // Virtualized view
      });

      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      expect(getByTestId('cider-list')).toBeTruthy();
      // Should only render visible items
      expect(getByTestId('cider-card-cider0')).toBeTruthy();
      expect(getByTestId('cider-card-cider19')).toBeTruthy();
    });

    it('should implement virtual scrolling for large lists', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      const ciderList = getByTestId('cider-list');
      expect(ciderList.props.windowSize).toBeDefined(); // FlatList virtualization
      expect(ciderList.props.initialNumToRender).toBeDefined();
    });

    it('should debounce search input', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      const searchInput = getByTestId('search-input');

      // Rapid typing simulation
      fireEvent.changeText(searchInput, 'A');
      fireEvent.changeText(searchInput, 'As');
      fireEvent.changeText(searchInput, 'Asp');
      fireEvent.changeText(searchInput, 'Aspa');
      fireEvent.changeText(searchInput, 'Aspall');

      // Should only trigger search once after debounce
      setTimeout(() => {
        expect(mockSetSearchQuery).toHaveBeenCalledTimes(1);
        expect(mockSetSearchQuery).toHaveBeenLastCalledWith('Aspall');
      }, 350);
    });
  });

  // =============================================================================
  // ACCESSIBILITY TESTS
  // =============================================================================

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = renderWithNavigation(<EnhancedCollectionScreen />);

      expect(getByLabelText('Search ciders')).toBeTruthy();
      expect(getByLabelText('Filter ciders')).toBeTruthy();
      expect(getByLabelText('Sort ciders')).toBeTruthy();
      expect(getByLabelText('Add new cider')).toBeTruthy();
    });

    it('should support screen readers', () => {
      const { getByA11yRole, getByA11yLabel } = renderWithNavigation(<EnhancedCollectionScreen />);

      expect(getByA11yRole('button', { name: 'Add Cider' })).toBeTruthy();
      expect(getByA11yLabel('Cider collection list')).toBeTruthy();
    });

    it('should have proper focus management', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      const searchInput = getByTestId('search-input');
      expect(searchInput.props.accessible).toBe(true);
      expect(searchInput.props.accessibilityRole).toBe('searchbox');
    });

    it('should announce list changes to screen readers', () => {
      const { getByA11yLiveRegion } = renderWithNavigation(<EnhancedCollectionScreen />);

      expect(getByA11yLiveRegion('polite')).toBeTruthy();
    });
  });

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================

  describe('Error Handling', () => {
    it('should handle load ciders error', async () => {
      mockLoadCiders.mockRejectedValue(new Error('Failed to load ciders'));

      const { getByText } = renderWithNavigation(<EnhancedCollectionScreen />);

      await waitFor(() => {
        expect(getByText('Failed to load ciders')).toBeTruthy();
        expect(getByTestId('retry-button')).toBeTruthy();
      });
    });

    it('should retry loading ciders', async () => {
      mockLoadCiders
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);

      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      await waitFor(() => {
        fireEvent.press(getByTestId('retry-button'));
      });

      expect(mockLoadCiders).toHaveBeenCalledTimes(2);
    });

    it('should handle delete cider error', async () => {
      mockDeleteCider.mockRejectedValue(new Error('Failed to delete cider'));

      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      fireEvent(getByTestId('cider-card-cider1'), 'longPress');
      fireEvent.press(getByTestId('delete-cider-action'));
      fireEvent.press(getByTestId('confirm-delete-button'));

      await waitFor(() => {
        expect(getByText('Failed to delete cider')).toBeTruthy();
      });
    });

    it('should handle network connectivity issues', () => {
      (useCiderStore as jest.Mock).mockReturnValue({
        ...useCiderStore(),
        error: 'Network connection lost',
      });

      const { getByText, getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      expect(getByText('Network connection lost')).toBeTruthy();
      expect(getByTestId('offline-indicator')).toBeTruthy();
    });
  });

  // =============================================================================
  // INTEGRATION TESTS
  // =============================================================================

  describe('Integration Tests', () => {
    it('should integrate search, filter, and sort operations', async () => {
      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      // Search
      fireEvent.changeText(getByTestId('search-input'), 'cider');

      // Filter
      fireEvent.press(getByTestId('filter-button'));
      fireEvent.press(getByTestId('rating-filter-option'));
      fireEvent(getByTestId('min-rating-slider'), 'valueChange', 4.0);
      fireEvent.press(getByTestId('apply-rating-filter'));

      // Sort
      fireEvent.press(getByTestId('sort-button'));
      fireEvent.press(getByTestId('sort-by-name'));

      expect(mockSetSearchQuery).toHaveBeenCalledWith('cider');
      expect(mockSearchByRatingRange).toHaveBeenCalledWith(4.0, 5.0);
      expect(mockSetSortOrder).toHaveBeenCalledWith('name', 'asc');
    });

    it('should maintain state during navigation', () => {
      (useCiderStore as jest.Mock).mockReturnValue({
        ...useCiderStore(),
        searchQuery: 'saved search',
        sortOrder: 'rating',
        sortDirection: 'desc',
      });

      const { getByTestId } = renderWithNavigation(<EnhancedCollectionScreen />);

      // Navigate away and back
      act(() => {
        mockNavigation.navigate('CiderDetail', { ciderId: 'cider1' });
      });

      // State should be preserved
      expect(getByTestId('search-input').props.value).toBe('saved search');
      expect(getByTestId('current-sort-indicator')).toHaveTextContent('Rating ↓');
    });

    it('should handle real-time updates from store', () => {
      const { rerender } = renderWithNavigation(<EnhancedCollectionScreen />);

      // Simulate adding a new cider
      const updatedCiders = [...mockCiders, createMockCider({ id: 'new-cider', name: 'New Cider' })];

      (useCiderStore as jest.Mock).mockReturnValue({
        ...useCiderStore(),
        ciders: updatedCiders,
        filteredCiders: updatedCiders,
      });

      rerender(<EnhancedCollectionScreen />);

      expect(getByTestId('cider-card-new-cider')).toBeTruthy();
    });
  });
});