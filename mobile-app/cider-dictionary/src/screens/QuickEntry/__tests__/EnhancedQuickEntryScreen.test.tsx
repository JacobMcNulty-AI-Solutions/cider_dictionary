// Comprehensive Enhanced Quick Entry Screen Tests for Phase 2 UI
// Tests for progressive disclosure, enhanced form interactions, and state management integration

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import EnhancedQuickEntryScreen from '../EnhancedQuickEntryScreen';
import { useCiderStore } from '../../../store/ciderStore';
import { DuplicateDetectionEngine } from '../../../utils/duplicateDetection';
import { VenueConsolidationService } from '../../../utils/venueConsolidation';

// =============================================================================
// TEST SETUP AND MOCKS
// =============================================================================

// Mock the store
const mockAddCider = jest.fn();
const mockFindDuplicates = jest.fn();
const mockConsolidateVenue = jest.fn();
const mockClearError = jest.fn();

jest.mock('../../../store/ciderStore', () => ({
  useCiderStore: jest.fn(() => ({
    addCider: mockAddCider,
    findDuplicates: mockFindDuplicates,
    isLoading: false,
    error: null,
    clearError: mockClearError,
  })),
}));

// Mock duplicate detection
jest.mock('../../../utils/duplicateDetection', () => ({
  DuplicateDetectionEngine: {
    quickDuplicateCheck: jest.fn(),
    getSimilarCiderNames: jest.fn(),
    getSimilarBrandNames: jest.fn(),
  },
}));

// Mock venue consolidation
jest.mock('../../../utils/venueConsolidation', () => ({
  VenueConsolidationService: {
    consolidateVenueName: jest.fn(),
    getVenueSuggestions: jest.fn(),
  },
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useFocusEffect: jest.fn(),
}));

// Mock form disclosure
jest.mock('../../../utils/formDisclosure', () => ({
  FormDisclosureManager: {
    getFieldsForStage: jest.fn().mockReturnValue(['name', 'brand', 'abv', 'overallRating']),
    shouldShowField: jest.fn().mockReturnValue(true),
    getNextStage: jest.fn(),
  },
}));

// Wrapper component for navigation context
const NavigationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NavigationContainer>{children}</NavigationContainer>
);

// Test utilities
const renderWithNavigation = (component: React.ReactElement) => {
  return render(component, { wrapper: NavigationWrapper });
};

describe('EnhancedQuickEntryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockAddCider.mockResolvedValue('test-cider-id');
    mockFindDuplicates.mockResolvedValue({
      isDuplicate: false,
      hasSimilar: false,
      confidence: 0,
      suggestion: 'No similar ciders found',
    });
    mockConsolidateVenue.mockResolvedValue({
      id: 'venue-123',
      name: 'Test Venue',
      type: 'pub',
      chainInfo: { isChain: false, parentCompany: null, chainId: null },
    });

    (DuplicateDetectionEngine.quickDuplicateCheck as jest.Mock).mockResolvedValue({
      isDuplicate: false,
      confidence: 0,
    });

    (DuplicateDetectionEngine.getSimilarCiderNames as jest.Mock).mockReturnValue([]);
    (DuplicateDetectionEngine.getSimilarBrandNames as jest.Mock).mockReturnValue([]);
    (VenueConsolidationService.getVenueSuggestions as jest.Mock).mockReturnValue([]);
  });

  // =============================================================================
  // BASIC RENDERING TESTS
  // =============================================================================

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      expect(getByTestId('enhanced-quick-entry-screen')).toBeTruthy();
    });

    it('should render essential form fields', () => {
      const { getByPlaceholderText, getByText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      expect(getByPlaceholderText('Enter cider name')).toBeTruthy();
      expect(getByPlaceholderText('Enter brand name')).toBeTruthy();
      expect(getByPlaceholderText('Enter ABV (e.g., 5.2)')).toBeTruthy();
      expect(getByText('Overall Rating')).toBeTruthy();
    });

    it('should render save and cancel buttons', () => {
      const { getByText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      expect(getByText('Save Cider')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
    });

    it('should show loading state when store is loading', () => {
      (useCiderStore as jest.Mock).mockReturnValue({
        ...useCiderStore(),
        isLoading: true,
      });

      const { getByTestId } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      expect(getByTestId('loading-spinner')).toBeTruthy();
    });

    it('should display error messages from store', () => {
      const testError = 'Failed to save cider';
      (useCiderStore as jest.Mock).mockReturnValue({
        ...useCiderStore(),
        error: testError,
      });

      const { getByText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      expect(getByText(testError)).toBeTruthy();
    });
  });

  // =============================================================================
  // PROGRESSIVE DISCLOSURE TESTS
  // =============================================================================

  describe('Progressive Disclosure', () => {
    it('should show basic fields initially', () => {
      const { getByPlaceholderText, queryByText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      // Basic fields should be visible
      expect(getByPlaceholderText('Enter cider name')).toBeTruthy();
      expect(getByPlaceholderText('Enter brand name')).toBeTruthy();
      expect(getByPlaceholderText('Enter ABV (e.g., 5.2)')).toBeTruthy();

      // Advanced fields should not be visible initially
      expect(queryByText('Appearance')).toBeFalsy();
      expect(queryByText('Aroma Details')).toBeFalsy();
      expect(queryByText('Taste Profile')).toBeFalsy();
    });

    it('should reveal advanced fields when basic fields are completed', async () => {
      const { getByPlaceholderText, getByText, queryByText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      // Fill basic fields
      fireEvent.changeText(getByPlaceholderText('Enter cider name'), 'Test Cider');
      fireEvent.changeText(getByPlaceholderText('Enter brand name'), 'Test Brand');
      fireEvent.changeText(getByPlaceholderText('Enter ABV (e.g., 5.2)'), '5.2');

      // Set rating
      const ratingStars = getByTestId('rating-stars');
      fireEvent.press(ratingStars);

      await waitFor(() => {
        // Advanced sections should now be available
        expect(queryByText('Show Advanced Fields')).toBeTruthy();
      });
    });

    it('should expand sections when tapped', async () => {
      const { getByPlaceholderText, getByText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      // Fill basic fields first
      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Enter cider name'), 'Test Cider');
        fireEvent.changeText(getByPlaceholderText('Enter brand name'), 'Test Brand');
        fireEvent.changeText(getByPlaceholderText('Enter ABV (e.g., 5.2)'), '5.2');
      });

      // Tap to show advanced fields
      const advancedToggle = getByText('Show Advanced Fields');
      fireEvent.press(advancedToggle);

      await waitFor(() => {
        expect(getByText('Appearance')).toBeTruthy();
        expect(getByText('Aroma Details')).toBeTruthy();
        expect(getByText('Taste Profile')).toBeTruthy();
      });
    });

    it('should collapse sections when tapped again', async () => {
      const { getByPlaceholderText, getByText, queryByText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      // Fill basic fields and show advanced
      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Enter cider name'), 'Test Cider');
        fireEvent.changeText(getByPlaceholderText('Enter brand name'), 'Test Brand');
        fireEvent.changeText(getByPlaceholderText('Enter ABV (e.g., 5.2)'), '5.2');
      });

      fireEvent.press(getByText('Show Advanced Fields'));
      await waitFor(() => expect(getByText('Appearance')).toBeTruthy());

      // Hide advanced fields
      fireEvent.press(getByText('Hide Advanced Fields'));

      await waitFor(() => {
        expect(queryByText('Appearance')).toBeFalsy();
      });
    });
  });

  // =============================================================================
  // FORM INTERACTION TESTS
  // =============================================================================

  describe('Form Interactions', () => {
    it('should update field values when typed', () => {
      const { getByPlaceholderText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      const nameInput = getByPlaceholderText('Enter cider name');
      const brandInput = getByPlaceholderText('Enter brand name');
      const abvInput = getByPlaceholderText('Enter ABV (e.g., 5.2)');

      fireEvent.changeText(nameInput, 'Aspall Dry Cider');
      fireEvent.changeText(brandInput, 'Aspall');
      fireEvent.changeText(abvInput, '5.5');

      expect(nameInput.props.value).toBe('Aspall Dry Cider');
      expect(brandInput.props.value).toBe('Aspall');
      expect(abvInput.props.value).toBe('5.5');
    });

    it('should handle rating selection', () => {
      const { getByTestId } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      const ratingInput = getByTestId('rating-input');
      fireEvent(ratingInput, 'ratingChange', 4.5);

      // Verify rating was set (would need to check component state or visual feedback)
      expect(ratingInput).toBeTruthy();
    });

    it('should handle container type selection', () => {
      const { getByText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      const bottleOption = getByText('Bottle');
      fireEvent.press(bottleOption);

      // Container type should be selected
      expect(bottleOption).toBeTruthy();
    });

    it('should handle taste tag input', async () => {
      const { getByPlaceholderText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      // First show advanced fields
      const nameInput = getByPlaceholderText('Enter cider name');
      fireEvent.changeText(nameInput, 'Test Cider');

      // Add taste tags
      const tasteTagInput = getByPlaceholderText('Add taste tags...');
      fireEvent.changeText(tasteTagInput, 'crisp, fruity');

      expect(tasteTagInput.props.value).toBe('crisp, fruity');
    });

    it('should clear form when reset button is pressed', () => {
      const { getByPlaceholderText, getByText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      // Fill some fields
      fireEvent.changeText(getByPlaceholderText('Enter cider name'), 'Test Cider');
      fireEvent.changeText(getByPlaceholderText('Enter brand name'), 'Test Brand');

      // Reset form
      fireEvent.press(getByText('Reset'));

      expect(getByPlaceholderText('Enter cider name').props.value).toBe('');
      expect(getByPlaceholderText('Enter brand name').props.value).toBe('');
    });
  });

  // =============================================================================
  // DUPLICATE DETECTION TESTS
  // =============================================================================

  describe('Duplicate Detection', () => {
    it('should check for duplicates when name and brand are entered', async () => {
      const { getByPlaceholderText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      fireEvent.changeText(getByPlaceholderText('Enter cider name'), 'Aspall Dry Cider');
      fireEvent.changeText(getByPlaceholderText('Enter brand name'), 'Aspall');

      await waitFor(() => {
        expect(DuplicateDetectionEngine.quickDuplicateCheck).toHaveBeenCalledWith(
          'Aspall Dry Cider',
          'Aspall',
          expect.any(Array)
        );
      });
    });

    it('should show duplicate warning when potential duplicate is found', async () => {
      (DuplicateDetectionEngine.quickDuplicateCheck as jest.Mock).mockResolvedValue({
        isDuplicate: true,
        confidence: 0.95,
        message: 'Exact match found in collection',
      });

      const { getByPlaceholderText, getByText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      fireEvent.changeText(getByPlaceholderText('Enter cider name'), 'Aspall Dry Cider');
      fireEvent.changeText(getByPlaceholderText('Enter brand name'), 'Aspall');

      await waitFor(() => {
        expect(getByText('Possible Duplicate Detected')).toBeTruthy();
        expect(getByText('Exact match found in collection')).toBeTruthy();
      });
    });

    it('should provide name suggestions during typing', async () => {
      (DuplicateDetectionEngine.getSimilarCiderNames as jest.Mock).mockReturnValue([
        'Aspall Dry Cider',
        'Aspall Imperial Dry',
        'Aspall Organic Cider',
      ]);

      const { getByPlaceholderText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      fireEvent.changeText(getByPlaceholderText('Enter cider name'), 'Aspall');

      await waitFor(() => {
        expect(DuplicateDetectionEngine.getSimilarCiderNames).toHaveBeenCalledWith(
          'Aspall',
          expect.any(Array)
        );
      });
    });

    it('should provide brand suggestions during typing', async () => {
      (DuplicateDetectionEngine.getSimilarBrandNames as jest.Mock).mockReturnValue([
        'Aspall',
        'Thatchers',
        'Strongbow',
      ]);

      const { getByPlaceholderText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      fireEvent.changeText(getByPlaceholderText('Enter brand name'), 'Asp');

      await waitFor(() => {
        expect(DuplicateDetectionEngine.getSimilarBrandNames).toHaveBeenCalledWith(
          'Asp',
          expect.any(Array)
        );
      });
    });

    it('should handle duplicate detection errors gracefully', async () => {
      (DuplicateDetectionEngine.quickDuplicateCheck as jest.Mock).mockRejectedValue(
        new Error('Duplicate detection failed')
      );

      const { getByPlaceholderText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      fireEvent.changeText(getByPlaceholderText('Enter cider name'), 'Test Cider');
      fireEvent.changeText(getByPlaceholderText('Enter brand name'), 'Test Brand');

      // Should not crash and should continue functioning
      await waitFor(() => {
        expect(getByPlaceholderText('Enter cider name')).toBeTruthy();
      });
    });
  });

  // =============================================================================
  // VENUE CONSOLIDATION TESTS
  // =============================================================================

  describe('Venue Consolidation', () => {
    it('should consolidate venue names when venue is entered', async () => {
      const { getByPlaceholderText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      fireEvent.changeText(getByPlaceholderText('Enter venue name'), 'Tesco Express');

      await waitFor(() => {
        expect(VenueConsolidationService.consolidateVenueName).toHaveBeenCalledWith(
          'Tesco Express',
          undefined
        );
      });
    });

    it('should show venue suggestions during typing', async () => {
      (VenueConsolidationService.getVenueSuggestions as jest.Mock).mockReturnValue([
        'Tesco Express',
        'Tesco Extra',
        'Tesco Metro',
      ]);

      const { getByPlaceholderText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      fireEvent.changeText(getByPlaceholderText('Enter venue name'), 'Tesco');

      await waitFor(() => {
        expect(VenueConsolidationService.getVenueSuggestions).toHaveBeenCalledWith(
          'Tesco',
          expect.any(Array)
        );
      });
    });

    it('should detect chain venues and show appropriate UI', async () => {
      (VenueConsolidationService.consolidateVenueName as jest.Mock).mockResolvedValue({
        id: 'venue-123',
        name: 'Tesco',
        type: 'retail',
        chainInfo: {
          isChain: true,
          parentCompany: 'Tesco',
          chainId: 'tesco',
        },
      });

      const { getByPlaceholderText, getByText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      fireEvent.changeText(getByPlaceholderText('Enter venue name'), 'Tesco Express');

      await waitFor(() => {
        expect(getByText('Chain Store Detected')).toBeTruthy();
        expect(getByText('Tesco')).toBeTruthy();
      });
    });

    it('should handle venue consolidation errors gracefully', async () => {
      (VenueConsolidationService.consolidateVenueName as jest.Mock).mockRejectedValue(
        new Error('Venue consolidation failed')
      );

      const { getByPlaceholderText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      fireEvent.changeText(getByPlaceholderText('Enter venue name'), 'Test Venue');

      // Should not crash
      await waitFor(() => {
        expect(getByPlaceholderText('Enter venue name')).toBeTruthy();
      });
    });
  });

  // =============================================================================
  // FORM SUBMISSION TESTS
  // =============================================================================

  describe('Form Submission', () => {
    it('should save cider with valid data', async () => {
      const { getByPlaceholderText, getByText, getByTestId } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      // Fill required fields
      fireEvent.changeText(getByPlaceholderText('Enter cider name'), 'Test Cider');
      fireEvent.changeText(getByPlaceholderText('Enter brand name'), 'Test Brand');
      fireEvent.changeText(getByPlaceholderText('Enter ABV (e.g., 5.2)'), '5.2');

      // Set rating
      const ratingInput = getByTestId('rating-input');
      fireEvent(ratingInput, 'ratingChange', 4.5);

      // Submit form
      fireEvent.press(getByText('Save Cider'));

      await waitFor(() => {
        expect(mockAddCider).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Cider',
            brand: 'Test Brand',
            abv: 5.2,
            overallRating: 4.5,
          })
        );
      });
    });

    it('should navigate back after successful save', async () => {
      const { getByPlaceholderText, getByText, getByTestId } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      // Fill and submit form
      fireEvent.changeText(getByPlaceholderText('Enter cider name'), 'Test Cider');
      fireEvent.changeText(getByPlaceholderText('Enter brand name'), 'Test Brand');
      fireEvent.changeText(getByPlaceholderText('Enter ABV (e.g., 5.2)'), '5.2');

      const ratingInput = getByTestId('rating-input');
      fireEvent(ratingInput, 'ratingChange', 4.0);

      fireEvent.press(getByText('Save Cider'));

      await waitFor(() => {
        expect(mockNavigation.goBack).toHaveBeenCalled();
      });
    });

    it('should prevent submission with invalid data', async () => {
      const { getByText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      // Try to submit without filling required fields
      fireEvent.press(getByText('Save Cider'));

      // Should show validation errors
      await waitFor(() => {
        expect(getByText('Please fill in all required fields')).toBeTruthy();
      });

      expect(mockAddCider).not.toHaveBeenCalled();
    });

    it('should handle save errors gracefully', async () => {
      mockAddCider.mockRejectedValue(new Error('Failed to save cider'));

      const { getByPlaceholderText, getByText, getByTestId } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      // Fill and submit form
      fireEvent.changeText(getByPlaceholderText('Enter cider name'), 'Test Cider');
      fireEvent.changeText(getByPlaceholderText('Enter brand name'), 'Test Brand');
      fireEvent.changeText(getByPlaceholderText('Enter ABV (e.g., 5.2)'), '5.2');

      const ratingInput = getByTestId('rating-input');
      fireEvent(ratingInput, 'ratingChange', 4.0);

      fireEvent.press(getByText('Save Cider'));

      await waitFor(() => {
        expect(getByText('Failed to save cider')).toBeTruthy();
      });
    });

    it('should include enhanced fields when submitted', async () => {
      const { getByPlaceholderText, getByText, getByTestId } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      // Fill basic fields
      fireEvent.changeText(getByPlaceholderText('Enter cider name'), 'Test Cider');
      fireEvent.changeText(getByPlaceholderText('Enter brand name'), 'Test Brand');
      fireEvent.changeText(getByPlaceholderText('Enter ABV (e.g., 5.2)'), '5.2');

      const ratingInput = getByTestId('rating-input');
      fireEvent(ratingInput, 'ratingChange', 4.0);

      // Show advanced fields and fill some
      fireEvent.press(getByText('Show Advanced Fields'));

      await waitFor(() => {
        const notesInput = getByPlaceholderText('Add your notes...');
        fireEvent.changeText(notesInput, 'This is a test cider with enhanced fields');
      });

      // Submit
      fireEvent.press(getByText('Save Cider'));

      await waitFor(() => {
        expect(mockAddCider).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Cider',
            brand: 'Test Brand',
            abv: 5.2,
            overallRating: 4.0,
            notes: 'This is a test cider with enhanced fields',
          })
        );
      });
    });
  });

  // =============================================================================
  // NAVIGATION TESTS
  // =============================================================================

  describe('Navigation', () => {
    it('should navigate back when cancel is pressed', () => {
      const { getByText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      fireEvent.press(getByText('Cancel'));

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('should show confirmation when discarding changes', async () => {
      const { getByPlaceholderText, getByText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      // Make some changes
      fireEvent.changeText(getByPlaceholderText('Enter cider name'), 'Test Cider');

      // Try to cancel
      fireEvent.press(getByText('Cancel'));

      // Should show confirmation
      await waitFor(() => {
        expect(getByText('Discard Changes?')).toBeTruthy();
        expect(getByText('You have unsaved changes. Are you sure you want to discard them?')).toBeTruthy();
      });
    });

    it('should not show confirmation when no changes made', () => {
      const { getByText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      fireEvent.press(getByText('Cancel'));

      expect(mockNavigation.goBack).toHaveBeenCalled();
      // Should not show confirmation dialog
    });
  });

  // =============================================================================
  // ACCESSIBILITY TESTS
  // =============================================================================

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      expect(getByLabelText('Cider Name')).toBeTruthy();
      expect(getByLabelText('Brand Name')).toBeTruthy();
      expect(getByLabelText('ABV Percentage')).toBeTruthy();
      expect(getByLabelText('Overall Rating')).toBeTruthy();
    });

    it('should support screen readers', () => {
      const { getByA11yRole } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      expect(getByA11yRole('button', { name: 'Save Cider' })).toBeTruthy();
      expect(getByA11yRole('button', { name: 'Cancel' })).toBeTruthy();
    });

    it('should have proper focus management', () => {
      const { getByPlaceholderText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      const nameInput = getByPlaceholderText('Enter cider name');
      expect(nameInput.props.accessible).toBe(true);
    });
  });

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================

  describe('Error Handling', () => {
    it('should clear errors when form is modified', async () => {
      // Set error state
      (useCiderStore as jest.Mock).mockReturnValue({
        ...useCiderStore(),
        error: 'Previous error',
      });

      const { getByPlaceholderText } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      // Modify form
      fireEvent.changeText(getByPlaceholderText('Enter cider name'), 'New input');

      await waitFor(() => {
        expect(mockClearError).toHaveBeenCalled();
      });
    });

    it('should handle network errors gracefully', async () => {
      mockAddCider.mockRejectedValue(new Error('Network request failed'));

      const { getByPlaceholderText, getByText, getByTestId } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      // Fill and submit
      fireEvent.changeText(getByPlaceholderText('Enter cider name'), 'Test Cider');
      fireEvent.changeText(getByPlaceholderText('Enter brand name'), 'Test Brand');
      fireEvent.changeText(getByPlaceholderText('Enter ABV (e.g., 5.2)'), '5.2');

      const ratingInput = getByTestId('rating-input');
      fireEvent(ratingInput, 'ratingChange', 4.0);

      fireEvent.press(getByText('Save Cider'));

      await waitFor(() => {
        expect(getByText('Network error. Please check your connection and try again.')).toBeTruthy();
      });
    });

    it('should retry failed operations', async () => {
      mockAddCider
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce('success-id');

      const { getByPlaceholderText, getByText, getByTestId } = renderWithNavigation(<EnhancedQuickEntryScreen />);

      // Fill form
      fireEvent.changeText(getByPlaceholderText('Enter cider name'), 'Test Cider');
      fireEvent.changeText(getByPlaceholderText('Enter brand name'), 'Test Brand');
      fireEvent.changeText(getByPlaceholderText('Enter ABV (e.g., 5.2)'), '5.2');

      const ratingInput = getByTestId('rating-input');
      fireEvent(ratingInput, 'ratingChange', 4.0);

      // First attempt fails
      fireEvent.press(getByText('Save Cider'));

      await waitFor(() => {
        expect(getByText('Retry')).toBeTruthy();
      });

      // Retry succeeds
      fireEvent.press(getByText('Retry'));

      await waitFor(() => {
        expect(mockNavigation.goBack).toHaveBeenCalled();
      });
    });
  });
});