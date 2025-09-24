import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '../../../__tests__/utils/testUtils';
import { createMockNavigationProps } from '../../../__tests__/utils/testUtils';
import { createMockCider } from '../../../__tests__/fixtures/ciderData';
import QuickEntryScreen from '../QuickEntryScreen';

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

describe('QuickEntryScreen', () => {
  const mockNavigation = createMockNavigationProps();
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSqliteService.initializeDatabase.mockResolvedValue(undefined);
    mockSqliteService.createCider.mockResolvedValue(createMockCider());
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  describe('Basic Rendering', () => {
    it('should render the screen without crashing', () => {
      const { root } = render(<QuickEntryScreen {...mockNavigation} />);
      expect(root).toBeTruthy();
    });

    it('should render form inputs', () => {
      const { getByPlaceholderText } = render(<QuickEntryScreen {...mockNavigation} />);

      expect(getByPlaceholderText('e.g., Angry Orchard Crisp Apple')).toBeTruthy();
      expect(getByPlaceholderText('e.g., Angry Orchard')).toBeTruthy();
      expect(getByPlaceholderText('e.g., 5.0')).toBeTruthy();
    });

    it('should render save button', () => {
      const { getByText } = render(<QuickEntryScreen {...mockNavigation} />);
      expect(getByText('Save Cider')).toBeTruthy();
    });

    it('should show default rating', () => {
      const { getByText } = render(<QuickEntryScreen {...mockNavigation} />);
      expect(getByText('5/10')).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    it('should show error for empty required fields', async () => {
      const { getByText } = render(<QuickEntryScreen {...mockNavigation} />);

      const saveButton = getByText('Save Cider');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(getByText('Cider name is required')).toBeTruthy();
        expect(getByText('Brand is required')).toBeTruthy();
      });
    });

    it('should show error for invalid ABV', async () => {
      const { getByText, getAllByDisplayValue } = render(<QuickEntryScreen {...mockNavigation} />);

      const inputs = getAllByDisplayValue('');
      fireEvent.changeText(inputs[0], 'Test Cider');
      fireEvent.changeText(inputs[1], 'Test Brand');
      fireEvent.changeText(inputs[2], '25'); // Too high

      const saveButton = getByText('Save Cider');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(getByText('ABV must be between 0.1% and 20%')).toBeTruthy();
      });
    });
  });

  describe('Form Interaction', () => {
    it('should update input values', () => {
      const { getAllByDisplayValue, getByDisplayValue } = render(<QuickEntryScreen {...mockNavigation} />);

      const inputs = getAllByDisplayValue('');
      fireEvent.changeText(inputs[0], 'Test Cider');

      expect(getByDisplayValue('Test Cider')).toBeTruthy();
    });
  });

  describe('Database Integration', () => {
    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockSqliteService.createCider.mockRejectedValue(error);

      const { getByText, getAllByDisplayValue } = render(<QuickEntryScreen {...mockNavigation} />);

      const inputs = getAllByDisplayValue('');
      fireEvent.changeText(inputs[0], 'Test Cider');
      fireEvent.changeText(inputs[1], 'Test Brand');
      fireEvent.changeText(inputs[2], '5.0');

      const saveButton = getByText('Save Cider');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Error',
          'Failed to save the cider. Please try again.',
          [{ text: 'OK' }]
        );
      });
    });
  });

  describe('Component Structure', () => {
    it('should have keyboard avoiding view', () => {
      const { root } = render(<QuickEntryScreen {...mockNavigation} />);
      const scrollView = root.findByType('RCTScrollView');
      expect(scrollView).toBeTruthy();
    });

    it('should have proper input types', () => {
      const { getAllByDisplayValue } = render(<QuickEntryScreen {...mockNavigation} />);

      const inputs = getAllByDisplayValue('');
      const abvInput = inputs[2];
      expect(abvInput.props.keyboardType).toBe('decimal-pad');
    });
  });
});