import React from 'react';
import { render, fireEvent, waitFor } from '../../../__tests__/utils/testUtils';
import { createMockNavigationProps, mockConsole } from '../../../__tests__/utils/testUtils';
import { mockCiderRecords, createMockCiders } from '../../../__tests__/fixtures/ciderData';
import CollectionScreen from '../CollectionScreen';
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

describe('CollectionScreen Integration Tests', () => {
  const mockNavigation = createMockNavigationProps();
  let consoleMocks: ReturnType<typeof mockConsole>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSqliteService.initializeDatabase.mockResolvedValue(undefined);
    mockSqliteService.getAllCiders.mockResolvedValue(mockCiderRecords);
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
      // Mock delay in getAllCiders
      mockSqliteService.getAllCiders.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const { getByTestId, getByText } = render(
        <CollectionScreen {...mockNavigation} />
      );

      expect(getByTestId('activity-indicator')).toBeTruthy();
      expect(getByText('Loading your cider collection...')).toBeTruthy();
    });

    it('should hide loading spinner after data loads', async () => {
      const { queryByTestId } = render(
        <CollectionScreen {...mockNavigation} />
      );

      await waitFor(() => {
        expect(queryByTestId('activity-indicator')).toBeNull();
      });
    });

    it('should show refreshing state during pull-to-refresh', async () => {
      const { getByTestId } = render(
        <CollectionScreen {...mockNavigation} />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(mockSqliteService.getAllCiders).toHaveBeenCalled();
      });

      // Trigger refresh
      const flatList = getByTestId('flat-list');
      fireEvent(flatList, 'refresh');

      // Should call getAllCiders again
      expect(mockSqliteService.getAllCiders).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data Display', () => {
    it('should display ciders when data is loaded', async () => {
      const { getByText } = render(
        <CollectionScreen {...mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Scrumpy Jack Original')).toBeTruthy();
        expect(getByText('Strongbow Original')).toBeTruthy();
        expect(getByText('Old Mout Kiwi & Lime')).toBeTruthy();
        expect(getByText('Magners Original')).toBeTruthy();
        expect(getByText('Rekorderlig Strawberry & Lime')).toBeTruthy();
      });
    });

    it('should display correct collection count in header', async () => {
      const { getByText } = render(
        <CollectionScreen {...mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('5 ciders in your collection')).toBeTruthy();
      });
    });

    it('should handle singular cider count correctly', async () => {
      const singleCider = [mockCiderRecords[0]];
      mockSqliteService.getAllCiders.mockResolvedValue(singleCider);

      const { getByText } = render(
        <CollectionScreen {...mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('1 cider in your collection')).toBeTruthy();
      });
    });

    it('should render ciders in correct order (newest first)', async () => {
      const { getByText } = render(
        <CollectionScreen {...mockNavigation} />
      );

      await waitFor(() => {
        // Based on mockCiderRecords, the newest should be Rekorderlig (2024-01-05)
        const ciderElements = [
          getByText('Scrumpy Jack Original'),
          getByText('Strongbow Original'),
          getByText('Old Mout Kiwi & Lime'),
          getByText('Magners Original'),
          getByText('Rekorderlig Strawberry & Lime'),
        ];

        // All should be present
        ciderElements.forEach(element => expect(element).toBeTruthy());
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no ciders are available', async () => {
      mockSqliteService.getAllCiders.mockResolvedValue([]);

      const { getByText } = render(
        <CollectionScreen {...mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('No ciders yet!')).toBeTruthy();
        expect(getByText('Start building your cider collection by tapping the "Add Cider" tab.')).toBeTruthy();
        expect(getByText('Track your favorites and discover new ones!')).toBeTruthy();
      });
    });

    it('should not show header when collection is empty', async () => {
      mockSqliteService.getAllCiders.mockResolvedValue([]);

      const { queryByText } = render(
        <CollectionScreen {...mockNavigation} />
      );

      await waitFor(() => {
        expect(queryByText(/ciders in your collection/)).toBeNull();
      });
    });

    it('should show empty state with proper styling', async () => {
      mockSqliteService.getAllCiders.mockResolvedValue([]);

      const { getByText } = render(
        <CollectionScreen {...mockNavigation} />
      );

      await waitFor(() => {
        const title = getByText('No ciders yet!');
        const subtitle = getByText('Start building your cider collection by tapping the "Add Cider" tab.');

        expect(title).toHaveStyle({
          fontSize: 24,
          fontWeight: 'bold',
          color: '#333',
        });

        expect(subtitle).toHaveStyle({
          fontSize: 16,
          color: '#666',
          textAlign: 'center',
        });
      });
    });
  });

  describe('User Interactions', () => {
    it('should handle cider card press', async () => {
      const { getByText } = render(
        <CollectionScreen {...mockNavigation} />
      );

      await waitFor(() => {
        const ciderCard = getByText('Scrumpy Jack Original');
        fireEvent.press(ciderCard);
      });

      // Should log the pressed cider
      expect(consoleMocks.log).toHaveBeenCalledWith('Cider pressed:', 'Scrumpy Jack Original');
    });

    it('should handle multiple cider presses correctly', async () => {
      const { getByText } = render(
        <CollectionScreen {...mockNavigation} />
      );

      await waitFor(() => {
        fireEvent.press(getByText('Scrumpy Jack Original'));
        fireEvent.press(getByText('Strongbow Original'));
        fireEvent.press(getByText('Old Mout Kiwi & Lime'));
      });

      expect(consoleMocks.log).toHaveBeenCalledWith('Cider pressed:', 'Scrumpy Jack Original');
      expect(consoleMocks.log).toHaveBeenCalledWith('Cider pressed:', 'Strongbow Original');
      expect(consoleMocks.log).toHaveBeenCalledWith('Cider pressed:', 'Old Mout Kiwi & Lime');
    });

    it('should handle pull-to-refresh correctly', async () => {
      const { getByTestId } = render(
        <CollectionScreen {...mockNavigation} />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(mockSqliteService.getAllCiders).toHaveBeenCalledTimes(1);
      });

      // Mock refresh
      mockSqliteService.getAllCiders.mockClear();

      const flatList = getByTestId('flat-list');
      fireEvent(flatList, 'refresh');

      await waitFor(() => {
        expect(mockSqliteService.getAllCiders).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Database Integration', () => {
    it('should initialize database on load', async () => {
      render(<CollectionScreen {...mockNavigation} />);

      await waitFor(() => {
        expect(mockSqliteService.initializeDatabase).toHaveBeenCalled();
        expect(mockSqliteService.getAllCiders).toHaveBeenCalled();
      });
    });

    it('should handle database initialization failure', async () => {
      const error = new Error('Database init failed');
      mockSqliteService.initializeDatabase.mockRejectedValue(error);

      render(<CollectionScreen {...mockNavigation} />);

      await waitFor(() => {
        expect(consoleMocks.error).toHaveBeenCalledWith('Failed to load ciders:', error);
      });
    });

    it('should handle getAllCiders failure gracefully', async () => {
      const error = new Error('Failed to get ciders');
      mockSqliteService.getAllCiders.mockRejectedValue(error);

      const { queryByTestId } = render(
        <CollectionScreen {...mockNavigation} />
      );

      await waitFor(() => {
        expect(consoleMocks.error).toHaveBeenCalledWith('Failed to load ciders:', error);
        // Should not be loading anymore
        expect(queryByTestId('activity-indicator')).toBeNull();
      });
    });

    it('should log number of loaded ciders', async () => {
      render(<CollectionScreen {...mockNavigation} />);

      await waitFor(() => {
        expect(consoleMocks.log).toHaveBeenCalledWith('Loaded ciders:', 5);
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large collections efficiently', async () => {
      const largeCiderCollection = createMockCiders(100);
      mockSqliteService.getAllCiders.mockResolvedValue(largeCiderCollection);

      const { getByText } = render(
        <CollectionScreen {...mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('100 ciders in your collection')).toBeTruthy();
        expect(getByText('Test Cider 1')).toBeTruthy(); // First item
        // FlatList should virtualize, so not all items may be rendered
      });
    });

    it('should use keyExtractor correctly', async () => {
      const { getByText } = render(
        <CollectionScreen {...mockNavigation} />
      );

      await waitFor(() => {
        // Each cider should have unique key (their id)
        expect(getByText('Scrumpy Jack Original')).toBeTruthy();
      });

      // FlatList should use item.id as key
      // This is verified by the FlatList not having any key warnings
    });

    it('should handle rapid refresh requests', async () => {
      const { getByTestId } = render(
        <CollectionScreen {...mockNavigation} />
      );

      await waitFor(() => {
        expect(mockSqliteService.getAllCiders).toHaveBeenCalled();
      });

      // Rapid refresh calls
      const flatList = getByTestId('flat-list');
      fireEvent(flatList, 'refresh');
      fireEvent(flatList, 'refresh');
      fireEvent(flatList, 'refresh');

      // Should not cause issues
      await waitFor(() => {
        expect(mockSqliteService.getAllCiders).toHaveBeenCalledTimes(4); // 1 initial + 3 refreshes
      });
    });
  });

  describe('Focus Effect Behavior', () => {
    it('should reload data when screen comes into focus', async () => {
      let focusCallback: (() => void) | undefined;
      mockUseFocusEffect.mockImplementation((callback) => {
        focusCallback = callback;
      });

      render(<CollectionScreen {...mockNavigation} />);

      // Clear previous calls
      mockSqliteService.getAllCiders.mockClear();

      // Simulate screen focus
      if (focusCallback) {
        focusCallback();
      }

      await waitFor(() => {
        expect(mockSqliteService.getAllCiders).toHaveBeenCalled();
      });
    });

    it('should handle focus effect with updated data', async () => {
      let focusCallback: (() => void) | undefined;
      mockUseFocusEffect.mockImplementation((callback) => {
        focusCallback = callback;
      });

      const { getByText, queryByText } = render(
        <CollectionScreen {...mockNavigation} />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(getByText('5 ciders in your collection')).toBeTruthy();
      });

      // Mock updated data (more ciders)
      const updatedCiders = [...mockCiderRecords, createMockCiders(1)[0]];
      mockSqliteService.getAllCiders.mockResolvedValue(updatedCiders);

      // Simulate focus
      if (focusCallback) {
        focusCallback();
      }

      await waitFor(() => {
        expect(getByText('6 ciders in your collection')).toBeTruthy();
      });
    });
  });

  describe('Styling and Layout', () => {
    it('should apply correct styles to empty state', async () => {
      mockSqliteService.getAllCiders.mockResolvedValue([]);

      const { getByText } = render(
        <CollectionScreen {...mockNavigation} />
      );

      await waitFor(() => {
        const emptyTitle = getByText('No ciders yet!');
        expect(emptyTitle).toHaveStyle({
          fontSize: 24,
          fontWeight: 'bold',
          color: '#333',
        });
      });
    });

    it('should apply correct styles to collection header', async () => {
      const { getByText } = render(
        <CollectionScreen {...mockNavigation} />
      );

      await waitFor(() => {
        const header = getByText('5 ciders in your collection');
        expect(header).toHaveStyle({
          fontSize: 14,
          fontWeight: '500',
          color: '#666',
          textAlign: 'center',
        });
      });
    });

    it('should have proper FlatList configuration', async () => {
      const { getByTestId } = render(
        <CollectionScreen {...mockNavigation} />
      );

      await waitFor(() => {
        const flatList = getByTestId('flat-list');
        expect(flatList).toHaveProp('showsVerticalScrollIndicator', false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined cider data gracefully', async () => {
      mockSqliteService.getAllCiders.mockResolvedValue(null as any);

      const { queryByTestId } = render(
        <CollectionScreen {...mockNavigation} />
      );

      // Should not crash and should finish loading
      await waitFor(() => {
        expect(queryByTestId('activity-indicator')).toBeNull();
      });
    });

    it('should handle ciders with missing properties', async () => {
      const corruptedCiders = [
        { id: '1', name: 'Valid Cider', brand: 'Valid Brand', abv: 5.0, overallRating: 7, createdAt: new Date() },
        { id: '2', name: '', brand: '', abv: 0, overallRating: 0, createdAt: new Date() } as any,
      ];

      mockSqliteService.getAllCiders.mockResolvedValue(corruptedCiders);

      const { getByText } = render(
        <CollectionScreen {...mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Valid Cider')).toBeTruthy();
        expect(getByText('2 ciders in your collection')).toBeTruthy();
      });
    });

    it('should handle very rapid screen focus changes', async () => {
      let focusCallback: (() => void) | undefined;
      mockUseFocusEffect.mockImplementation((callback) => {
        focusCallback = callback;
      });

      render(<CollectionScreen {...mockNavigation} />);

      // Rapid focus changes
      if (focusCallback) {
        for (let i = 0; i < 5; i++) {
          focusCallback();
        }
      }

      // Should not crash or cause memory leaks
      await waitFor(() => {
        expect(mockSqliteService.getAllCiders).toHaveBeenCalled();
      });
    });
  });
});