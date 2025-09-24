import React from 'react';
import { render, fireEvent, waitFor } from '../../../__tests__/utils/testUtils';
import { createMockNavigationProps, mockConsole } from '../../../__tests__/utils/testUtils';
import { mockAnalyticsData, mockCiderRecords } from '../../../__tests__/fixtures/ciderData';
import AnalyticsScreen from '../AnalyticsScreen';
import * as SQLiteModule from '../../../services/database/sqlite';

// Mock the SQLite service
const mockSqliteService = {
  initializeDatabase: jest.fn(),
  createCider: jest.fn(),
  getAllCiders: jest.fn(),
  getCiderById: jest.fn(),
  updateCider: jest.fn(),
  deleteCider: jest.fn(),
  getBasicAnalytics: jest.fn(),
};

jest.mock('../../../services/database/sqlite', () => ({
  sqliteService: mockSqliteService,
}));

// Mock useFocusEffect
const mockUseFocusEffect = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: mockUseFocusEffect,
}));

describe('AnalyticsScreen Integration Tests', () => {
  const mockNavigation = createMockNavigationProps();
  let consoleMocks: ReturnType<typeof mockConsole>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSqliteService.initializeDatabase.mockResolvedValue(undefined);
    mockSqliteService.getBasicAnalytics.mockResolvedValue(mockAnalyticsData);
    consoleMocks = mockConsole();

    // Mock useFocusEffect to call the callback immediately
    mockUseFocusEffect.mockImplementation((callback) => {
      callback();
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Loading States', () => {
    it('should show loading spinner initially', () => {
      // Mock delay in getBasicAnalytics
      mockSqliteService.getBasicAnalytics.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const { getByTestId, getByText } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      expect(getByTestId('activity-indicator')).toBeTruthy();
      expect(getByText('Calculating your cider statistics...')).toBeTruthy();
    });

    it('should hide loading spinner after data loads', async () => {
      const { queryByTestId } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      await waitFor(() => {
        expect(queryByTestId('activity-indicator')).toBeNull();
      });
    });

    it('should show refreshing state during pull-to-refresh', async () => {
      const { getByTestId } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(mockSqliteService.getBasicAnalytics).toHaveBeenCalled();
      });

      // Trigger refresh
      const scrollView = getByTestId('scroll-view');
      fireEvent(scrollView, 'refresh');

      // Should call getBasicAnalytics again
      expect(mockSqliteService.getBasicAnalytics).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data Display - Statistics Cards', () => {
    it('should display all statistic cards with correct data', async () => {
      const { getByText } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      await waitFor(() => {
        // Collection Overview section
        expect(getByText('Collection Overview')).toBeTruthy();

        // Total Ciders card
        expect(getByText('Total Ciders')).toBeTruthy();
        expect(getByText('5')).toBeTruthy();

        // Average Rating card
        expect(getByText('Average Rating')).toBeTruthy();
        expect(getByText('7.0/10')).toBeTruthy();

        // Average ABV card
        expect(getByText('Average ABV')).toBeTruthy();
        expect(getByText('4.7%')).toBeTruthy();
      });
    });

    it('should display statistic cards with correct icons and colors', async () => {
      const { getAllByTestId } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      await waitFor(() => {
        // Check for icon presence (icons are rendered as Ionicons components)
        const libraryIcon = getAllByTestId(/library-outline/);
        const starIcon = getAllByTestId(/star/);
        const wineIcon = getAllByTestId(/wine-outline/);

        expect(libraryIcon.length).toBeGreaterThan(0);
        expect(starIcon.length).toBeGreaterThan(0);
        expect(wineIcon.length).toBeGreaterThan(0);
      });
    });

    it('should display statistic values with proper formatting', async () => {
      const customAnalytics = {
        ...mockAnalyticsData,
        totalCiders: 1,
        averageRating: 8.3,
        averageAbv: 6.25,
      };

      mockSqliteService.getBasicAnalytics.mockResolvedValue(customAnalytics);

      const { getByText } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('1')).toBeTruthy(); // Single cider
        expect(getByText('8.3/10')).toBeTruthy(); // Decimal rating
        expect(getByText('6.25%')).toBeTruthy(); // Decimal ABV
      });
    });
  });

  describe('Data Display - Highlights', () => {
    it('should display highest rated cider highlight', async () => {
      const { getByText } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Top Performer')).toBeTruthy();
        expect(getByText('Highest Rated')).toBeTruthy();
        expect(getByText('Rekorderlig Strawberry & Lime')).toBeTruthy();
        expect(getByText('by Abro Bryggeri')).toBeTruthy();
        expect(getByText('9/10')).toBeTruthy(); // Rating
        expect(getByText('4%')).toBeTruthy(); // ABV
      });
    });

    it('should display lowest rated cider highlight when different from highest', async () => {
      const { getByText } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Room for Improvement')).toBeTruthy();
        expect(getByText('Lowest Rated')).toBeTruthy();
        expect(getByText('Magners Original')).toBeTruthy();
        expect(getByText('by C&C Group')).toBeTruthy();
        expect(getByText('5/10')).toBeTruthy(); // Rating
        expect(getByText('4.5%')).toBeTruthy(); // ABV
      });
    });

    it('should not display lowest rated section when same as highest rated', async () => {
      const singleCiderAnalytics = {
        totalCiders: 1,
        averageRating: 8.0,
        averageAbv: 5.0,
        highestRated: mockCiderRecords[0],
        lowestRated: mockCiderRecords[0], // Same cider
      };

      mockSqliteService.getBasicAnalytics.mockResolvedValue(singleCiderAnalytics);

      const { getByText, queryByText } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Top Performer')).toBeTruthy();
        expect(queryByText('Room for Improvement')).toBeNull();
        expect(queryByText('Lowest Rated')).toBeNull();
      });
    });

    it('should display highlights with proper icons', async () => {
      const { getAllByTestId } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      await waitFor(() => {
        // Trophy icon for highest rated
        const trophyIcon = getAllByTestId(/trophy/);
        expect(trophyIcon.length).toBeGreaterThan(0);

        // Trending down icon for lowest rated
        const trendingDownIcon = getAllByTestId(/trending-down/);
        expect(trendingDownIcon.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no ciders exist', async () => {
      const emptyAnalytics = {
        totalCiders: 0,
        averageRating: 0,
        averageAbv: 0,
        highestRated: null,
        lowestRated: null,
      };

      mockSqliteService.getBasicAnalytics.mockResolvedValue(emptyAnalytics);

      const { getByText, getAllByTestId } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('No Statistics Yet')).toBeTruthy();
        expect(getByText('Add some ciders to your collection to see your personalized analytics.')).toBeTruthy();

        // Should show analytics icon
        const analyticsIcon = getAllByTestId(/analytics-outline/);
        expect(analyticsIcon.length).toBeGreaterThan(0);
      });
    });

    it('should show empty state when analytics is null', async () => {
      mockSqliteService.getBasicAnalytics.mockResolvedValue(null);

      const { getByText } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('No Statistics Yet')).toBeTruthy();
      });
    });

    it('should handle refresh from empty state', async () => {
      const emptyAnalytics = {
        totalCiders: 0,
        averageRating: 0,
        averageAbv: 0,
        highestRated: null,
        lowestRated: null,
      };

      mockSqliteService.getBasicAnalytics.mockResolvedValue(emptyAnalytics);

      const { getByTestId } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      await waitFor(() => {
        expect(mockSqliteService.getBasicAnalytics).toHaveBeenCalled();
      });

      // Trigger refresh from empty state
      const scrollView = getByTestId('scroll-view');
      fireEvent(scrollView, 'refresh');

      expect(mockSqliteService.getBasicAnalytics).toHaveBeenCalledTimes(2);
    });
  });

  describe('Database Integration', () => {
    it('should initialize database on load', async () => {
      render(<AnalyticsScreen {...mockNavigation} />);

      await waitFor(() => {
        expect(mockSqliteService.initializeDatabase).toHaveBeenCalled();
        expect(mockSqliteService.getBasicAnalytics).toHaveBeenCalled();
      });
    });

    it('should handle database initialization failure', async () => {
      const error = new Error('Database init failed');
      mockSqliteService.initializeDatabase.mockRejectedValue(error);

      render(<AnalyticsScreen {...mockNavigation} />);

      await waitFor(() => {
        expect(consoleMocks.error).toHaveBeenCalledWith('Failed to load analytics:', error);
      });
    });

    it('should handle getBasicAnalytics failure gracefully', async () => {
      const error = new Error('Failed to get analytics');
      mockSqliteService.getBasicAnalytics.mockRejectedValue(error);

      const { queryByTestId } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      await waitFor(() => {
        expect(consoleMocks.error).toHaveBeenCalledWith('Failed to load analytics:', error);
        // Should not be loading anymore
        expect(queryByTestId('activity-indicator')).toBeNull();
      });
    });

    it('should log analytics data when loaded', async () => {
      render(<AnalyticsScreen {...mockNavigation} />);

      await waitFor(() => {
        expect(consoleMocks.log).toHaveBeenCalledWith('Analytics loaded:', mockAnalyticsData);
      });
    });
  });

  describe('User Interactions', () => {
    it('should handle pull-to-refresh correctly', async () => {
      const { getByTestId } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(mockSqliteService.getBasicAnalytics).toHaveBeenCalledTimes(1);
      });

      // Mock refresh
      mockSqliteService.getBasicAnalytics.mockClear();

      const scrollView = getByTestId('scroll-view');
      fireEvent(scrollView, 'refresh');

      await waitFor(() => {
        expect(mockSqliteService.getBasicAnalytics).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle scrolling through content', async () => {
      const { getByTestId } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      await waitFor(() => {
        const scrollView = getByTestId('scroll-view');
        expect(scrollView).toHaveProp('showsVerticalScrollIndicator', false);

        // Should be scrollable
        fireEvent.scroll(scrollView, {
          nativeEvent: { contentOffset: { y: 100 } },
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values in analytics', async () => {
      const zeroAnalytics = {
        totalCiders: 10, // Has ciders but zeros for other values
        averageRating: 0,
        averageAbv: 0,
        highestRated: mockCiderRecords[0],
        lowestRated: mockCiderRecords[1],
      };

      mockSqliteService.getBasicAnalytics.mockResolvedValue(zeroAnalytics);

      const { getByText } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('10')).toBeTruthy();
        expect(getByText('0/10')).toBeTruthy();
        expect(getByText('0%')).toBeTruthy();
      });
    });

    it('should handle very large numbers', async () => {
      const largeAnalytics = {
        totalCiders: 999999,
        averageRating: 10.0,
        averageAbv: 99.9,
        highestRated: mockCiderRecords[0],
        lowestRated: mockCiderRecords[1],
      };

      mockSqliteService.getBasicAnalytics.mockResolvedValue(largeAnalytics);

      const { getByText } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('999999')).toBeTruthy();
        expect(getByText('10/10')).toBeTruthy();
        expect(getByText('99.9%')).toBeTruthy();
      });
    });

    it('should handle null highest/lowest rated ciders', async () => {
      const nullHighlightsAnalytics = {
        totalCiders: 5,
        averageRating: 7.0,
        averageAbv: 4.5,
        highestRated: null,
        lowestRated: null,
      };

      mockSqliteService.getBasicAnalytics.mockResolvedValue(nullHighlightsAnalytics);

      const { getByText, queryByText } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      await waitFor(() => {
        // Should show stats but no highlights
        expect(getByText('Collection Overview')).toBeTruthy();
        expect(getByText('5')).toBeTruthy();
        expect(queryByText('Top Performer')).toBeNull();
        expect(queryByText('Room for Improvement')).toBeNull();
      });
    });

    it('should handle malformed analytics data', async () => {
      const malformedAnalytics = {
        totalCiders: 'invalid' as any,
        averageRating: null as any,
        averageAbv: undefined as any,
        highestRated: mockCiderRecords[0],
        lowestRated: mockCiderRecords[1],
      };

      mockSqliteService.getBasicAnalytics.mockResolvedValue(malformedAnalytics);

      const { queryByTestId } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      // Should not crash
      await waitFor(() => {
        expect(queryByTestId('activity-indicator')).toBeNull();
      });
    });
  });

  describe('Focus Effect Behavior', () => {
    it('should reload analytics when screen comes into focus', async () => {
      let focusCallback: (() => void) | undefined;
      mockUseFocusEffect.mockImplementation((callback) => {
        focusCallback = callback;
      });

      render(<AnalyticsScreen {...mockNavigation} />);

      // Clear previous calls
      mockSqliteService.getBasicAnalytics.mockClear();

      // Simulate screen focus
      if (focusCallback) {
        focusCallback();
      }

      await waitFor(() => {
        expect(mockSqliteService.getBasicAnalytics).toHaveBeenCalled();
      });
    });

    it('should handle focus effect with updated analytics', async () => {
      let focusCallback: (() => void) | undefined;
      mockUseFocusEffect.mockImplementation((callback) => {
        focusCallback = callback;
      });

      const { getByText } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(getByText('5')).toBeTruthy();
      });

      // Mock updated analytics
      const updatedAnalytics = {
        ...mockAnalyticsData,
        totalCiders: 10,
      };
      mockSqliteService.getBasicAnalytics.mockResolvedValue(updatedAnalytics);

      // Simulate focus
      if (focusCallback) {
        focusCallback();
      }

      await waitFor(() => {
        expect(getByText('10')).toBeTruthy();
      });
    });
  });

  describe('Footer and Additional Content', () => {
    it('should display footer message', async () => {
      const { getByText } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Pull down to refresh • More analytics coming in Phase 2!')).toBeTruthy();
      });
    });

    it('should apply correct footer styling', async () => {
      const { getByText } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      await waitFor(() => {
        const footer = getByText('Pull down to refresh • More analytics coming in Phase 2!');
        expect(footer).toHaveStyle({
          fontSize: 12,
          color: '#999',
          textAlign: 'center',
          fontStyle: 'italic',
        });
      });
    });
  });

  describe('Styling and Layout', () => {
    it('should apply correct section styling', async () => {
      const { getByText } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      await waitFor(() => {
        const sectionTitle = getByText('Collection Overview');
        expect(sectionTitle).toHaveStyle({
          fontSize: 20,
          fontWeight: 'bold',
          color: '#333',
        });
      });
    });

    it('should have proper ScrollView configuration', async () => {
      const { getByTestId } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      await waitFor(() => {
        const scrollView = getByTestId('scroll-view');
        expect(scrollView).toHaveProp('showsVerticalScrollIndicator', false);
      });
    });

    it('should apply correct card styling', async () => {
      const { getByText } = render(
        <AnalyticsScreen {...mockNavigation} />
      );

      await waitFor(() => {
        // StatCards should have proper styling (tested through their container)
        const totalCidersValue = getByText('5');
        expect(totalCidersValue).toHaveStyle({
          fontSize: 24,
          fontWeight: 'bold',
        });
      });
    });
  });
});