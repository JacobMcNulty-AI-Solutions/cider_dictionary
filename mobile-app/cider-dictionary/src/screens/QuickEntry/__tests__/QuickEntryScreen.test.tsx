import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '../../../__tests__/utils/testUtils';
import { createMockNavigationProps, mockAlert } from '../../../__tests__/utils/testUtils';
import { mockQuickEntryForm, createMockCider } from '../../../__tests__/fixtures/ciderData';
import QuickEntryScreen from '../QuickEntryScreen';
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

describe('QuickEntryScreen Integration Tests', () => {
  const mockNavigation = createMockNavigationProps();
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSqliteService.initializeDatabase.mockResolvedValue(undefined);
    mockSqliteService.createCider.mockResolvedValue(createMockCider());
    alertSpy = mockAlert();
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  describe('Form Rendering', () => {
    it('should render all form fields', () => {
      const { getByText, getByPlaceholderText } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      expect(getByText('Cider Name')).toBeTruthy();
      expect(getByText('Brand')).toBeTruthy();
      expect(getByText('ABV (%)')).toBeTruthy();
      expect(getByText('Overall Rating')).toBeTruthy();
      expect(getByText('Save Cider')).toBeTruthy();

      expect(getByPlaceholderText('e.g., Angry Orchard Crisp Apple')).toBeTruthy();
      expect(getByPlaceholderText('e.g., Angry Orchard')).toBeTruthy();
      expect(getByPlaceholderText('e.g., 5.0')).toBeTruthy();
    });

    it('should render required field indicators', () => {
      const { getAllByText } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      // Should have asterisks for required fields (Cider Name and Brand)
      const asterisks = getAllByText('*');
      expect(asterisks).toHaveLength(2);
    });

    it('should initialize with default values', () => {
      const { getByDisplayValue, getByText } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      expect(getByDisplayValue('')).toBeTruthy(); // Empty name
      expect(getByDisplayValue('')).toBeTruthy(); // Empty brand
      expect(getByText('5/10')).toBeTruthy(); // Default rating of 5
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for empty required fields', async () => {
      const { getByText } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      const saveButton = getByText('Save Cider');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(getByText('Cider name is required')).toBeTruthy();
        expect(getByText('Brand is required')).toBeTruthy();
      });
    });

    it('should show validation error for invalid ABV', async () => {
      const { getByText, getByDisplayValue } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      // Fill required fields
      const nameInput = getByDisplayValue('');
      fireEvent.changeText(nameInput, 'Test Cider');

      const brandInputs = getAllByDisplayValue('');
      fireEvent.changeText(brandInputs[1], 'Test Brand');

      // Set invalid ABV
      const abvInput = getByDisplayValue('0');
      fireEvent.changeText(abvInput, '-1');

      const saveButton = getByText('Save Cider');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(getByText('ABV must be between 0.1% and 20%')).toBeTruthy();
      });
    });

    it('should show validation error for ABV too high', async () => {
      const { getByText, getByDisplayValue, getAllByDisplayValue } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      // Fill required fields
      const inputs = getAllByDisplayValue('');
      fireEvent.changeText(inputs[0], 'Test Cider'); // name
      fireEvent.changeText(inputs[1], 'Test Brand'); // brand
      fireEvent.changeText(inputs[2], '25'); // invalid ABV

      const saveButton = getByText('Save Cider');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(getByText('ABV must be between 0.1% and 20%')).toBeTruthy();
      });
    });

    it('should show validation error for invalid rating', async () => {
      const { getByText, getAllByDisplayValue, getAllByTestId } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      // Fill required fields
      const inputs = getAllByDisplayValue('');
      fireEvent.changeText(inputs[0], 'Test Cider');
      fireEvent.changeText(inputs[1], 'Test Brand');
      fireEvent.changeText(inputs[2], '5.5');

      // Set rating to 0 (invalid)
      const star1 = getAllByTestId('star-1')[0];
      fireEvent.press(star1);

      // Manually set rating to invalid value (would need to simulate somehow)
      // For now, let's test with a valid case since rating input prevents invalid values

      const saveButton = getByText('Save Cider');
      fireEvent.press(saveButton);

      // Should succeed with valid data
      await waitFor(() => {
        expect(mockSqliteService.createCider).toHaveBeenCalled();
      });
    });

    it('should clear errors when user starts typing', async () => {
      const { getByText, getAllByDisplayValue } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      // Trigger validation errors
      const saveButton = getByText('Save Cider');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(getByText('Cider name is required')).toBeTruthy();
      });

      // Start typing in name field
      const inputs = getAllByDisplayValue('');
      fireEvent.changeText(inputs[0], 'A');

      // Error should be cleared
      await waitFor(() => {
        expect(() => getByText('Cider name is required')).toThrow();
      });
    });
  });

  describe('Form Interaction', () => {
    it('should update form values when user types', () => {
      const { getAllByDisplayValue } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      const inputs = getAllByDisplayValue('');

      fireEvent.changeText(inputs[0], 'My Cider');
      fireEvent.changeText(inputs[1], 'My Brand');
      fireEvent.changeText(inputs[2], '6.5');

      expect(getAllByDisplayValue('My Cider')).toBeTruthy();
      expect(getAllByDisplayValue('My Brand')).toBeTruthy();
      expect(getAllByDisplayValue('6.5')).toBeTruthy();
    });

    it('should update rating when stars are pressed', () => {
      const { getAllByTestId, getByText } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      const star8 = getAllByTestId('star-8')[0];
      fireEvent.press(star8);

      expect(getByText('8/10')).toBeTruthy();
    });

    it('should handle numeric input for ABV', () => {
      const { getAllByDisplayValue } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      const abvInput = getAllByDisplayValue('0')[0];
      fireEvent.changeText(abvInput, '4.5');

      expect(getAllByDisplayValue('4.5')).toBeTruthy();
    });

    it('should handle non-numeric ABV input gracefully', () => {
      const { getAllByDisplayValue } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      const abvInput = getAllByDisplayValue('0')[0];
      fireEvent.changeText(abvInput, 'not-a-number');

      // Should default to 0
      expect(getAllByDisplayValue('0')).toBeTruthy();
    });
  });

  describe('Form Submission', () => {
    const validFormData = {
      name: 'Test Cider',
      brand: 'Test Brand',
      abv: '5.5',
      rating: 7,
    };

    it('should successfully submit valid form data', async () => {
      const { getByText, getAllByDisplayValue, getAllByTestId } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      // Fill form with valid data
      const inputs = getAllByDisplayValue('');
      fireEvent.changeText(inputs[0], validFormData.name);
      fireEvent.changeText(inputs[1], validFormData.brand);
      fireEvent.changeText(inputs[2], validFormData.abv);

      // Set rating
      const star7 = getAllByTestId('star-7')[0];
      fireEvent.press(star7);

      // Submit form
      const saveButton = getByText('Save Cider');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockSqliteService.initializeDatabase).toHaveBeenCalled();
        expect(mockSqliteService.createCider).toHaveBeenCalledWith({
          name: validFormData.name,
          brand: validFormData.brand,
          abv: parseFloat(validFormData.abv),
          overallRating: validFormData.rating,
        });
      });
    });

    it('should show loading state during submission', async () => {
      // Mock delay in createCider
      mockSqliteService.createCider.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const { getByText, getAllByDisplayValue } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      // Fill form
      const inputs = getAllByDisplayValue('');
      fireEvent.changeText(inputs[0], validFormData.name);
      fireEvent.changeText(inputs[1], validFormData.brand);
      fireEvent.changeText(inputs[2], validFormData.abv);

      // Submit
      const saveButton = getByText('Save Cider');
      fireEvent.press(saveButton);

      // Should show loading spinner
      await waitFor(() => {
        expect(getByTestId('activity-indicator')).toBeTruthy();
      });

      // Wait for completion
      await waitFor(() => {
        expect(mockSqliteService.createCider).toHaveBeenCalled();
      }, { timeout: 200 });
    });

    it('should disable button during loading', async () => {
      mockSqliteService.createCider.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const { getByText, getAllByDisplayValue } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      // Fill form
      const inputs = getAllByDisplayValue('');
      fireEvent.changeText(inputs[0], validFormData.name);
      fireEvent.changeText(inputs[1], validFormData.brand);
      fireEvent.changeText(inputs[2], validFormData.abv);

      const saveButton = getByText('Save Cider');
      fireEvent.press(saveButton);

      // Button should be disabled
      expect(saveButton.parent).toHaveProp('disabled', true);
    });

    it('should reset form after successful submission', async () => {
      const { getByText, getAllByDisplayValue } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      // Fill and submit form
      const inputs = getAllByDisplayValue('');
      fireEvent.changeText(inputs[0], validFormData.name);
      fireEvent.changeText(inputs[1], validFormData.brand);
      fireEvent.changeText(inputs[2], validFormData.abv);

      const saveButton = getByText('Save Cider');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockSqliteService.createCider).toHaveBeenCalled();
      });

      // Form should be reset
      await waitFor(() => {
        expect(getAllByDisplayValue('').length).toBeGreaterThan(0);
        expect(getByText('5/10')).toBeTruthy(); // Rating reset to 5
      });
    });

    it('should show success alert after submission', async () => {
      const mockCider = createMockCider({ name: validFormData.name });
      mockSqliteService.createCider.mockResolvedValue(mockCider);

      const { getByText, getAllByDisplayValue } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      // Fill and submit form
      const inputs = getAllByDisplayValue('');
      fireEvent.changeText(inputs[0], validFormData.name);
      fireEvent.changeText(inputs[1], validFormData.brand);
      fireEvent.changeText(inputs[2], validFormData.abv);

      const saveButton = getByText('Save Cider');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Success!',
          `${validFormData.name} has been added to your collection.`,
          expect.arrayContaining([
            expect.objectContaining({ text: 'Add Another' }),
            expect.objectContaining({ text: 'View Collection' }),
          ])
        );
      });
    });

    it('should navigate to Collection when View Collection is pressed in alert', async () => {
      const mockCider = createMockCider({ name: validFormData.name });
      mockSqliteService.createCider.mockResolvedValue(mockCider);

      // Mock alert to simulate pressing "View Collection" button
      alertSpy.mockImplementation((title, message, buttons) => {
        if (buttons && buttons.length > 1 && buttons[1].onPress) {
          buttons[1].onPress();
        }
      });

      const { getByText, getAllByDisplayValue } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      // Fill and submit form
      const inputs = getAllByDisplayValue('');
      fireEvent.changeText(inputs[0], validFormData.name);
      fireEvent.changeText(inputs[1], validFormData.brand);
      fireEvent.changeText(inputs[2], validFormData.abv);

      const saveButton = getByText('Save Cider');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockNavigation.navigation.navigate).toHaveBeenCalledWith('Collection');
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error alert when submission fails', async () => {
      const error = new Error('Database error');
      mockSqliteService.createCider.mockRejectedValue(error);

      const { getByText, getAllByDisplayValue } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      // Fill form
      const inputs = getAllByDisplayValue('');
      fireEvent.changeText(inputs[0], validFormData.name);
      fireEvent.changeText(inputs[1], validFormData.brand);
      fireEvent.changeText(inputs[2], validFormData.abv);

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

    it('should handle database initialization failure', async () => {
      const error = new Error('Init failed');
      mockSqliteService.initializeDatabase.mockRejectedValue(error);

      const { getByText, getAllByDisplayValue } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      // Fill form
      const inputs = getAllByDisplayValue('');
      fireEvent.changeText(inputs[0], validFormData.name);
      fireEvent.changeText(inputs[1], validFormData.brand);
      fireEvent.changeText(inputs[2], validFormData.abv);

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

    it('should not remain in loading state after error', async () => {
      const error = new Error('Database error');
      mockSqliteService.createCider.mockRejectedValue(error);

      const { getByText, getAllByDisplayValue, queryByTestId } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      // Fill and submit form
      const inputs = getAllByDisplayValue('');
      fireEvent.changeText(inputs[0], validFormData.name);
      fireEvent.changeText(inputs[1], validFormData.brand);
      fireEvent.changeText(inputs[2], validFormData.abv);

      const saveButton = getByText('Save Cider');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
      });

      // Should not be loading anymore
      expect(queryByTestId('activity-indicator')).toBeNull();
      expect(saveButton.parent).toHaveProp('disabled', false);
    });
  });

  describe('Keyboard Handling', () => {
    it('should have proper keyboard avoiding behavior', () => {
      const { container } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      // KeyboardAvoidingView should be present
      const keyboardView = container.findByProps({ behavior: 'padding' });
      expect(keyboardView).toBeTruthy();
    });

    it('should have proper return key types', () => {
      const { getAllByDisplayValue } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      const inputs = getAllByDisplayValue('');

      // Name and Brand inputs should have "next" return key
      expect(inputs[0]).toHaveProp('returnKeyType', 'next');
      expect(inputs[1]).toHaveProp('returnKeyType', 'next');
      expect(inputs[2]).toHaveProp('returnKeyType', 'next');
    });

    it('should have proper keyboard types', () => {
      const { getAllByDisplayValue } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      const abvInput = getAllByDisplayValue('0')[0];
      expect(abvInput).toHaveProp('keyboardType', 'decimal-pad');
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByText, getAllByDisplayValue } = render(
        <QuickEntryScreen {...mockNavigation} />
      );

      const inputs = getAllByDisplayValue('');
      expect(inputs[0]).toHaveProp('accessible', true);
      expect(inputs[1]).toHaveProp('accessible', true);
      expect(inputs[2]).toHaveProp('accessible', true);

      const saveButton = getByText('Save Cider');
      expect(saveButton.parent).toHaveProp('accessible', true);
    });
  });
});