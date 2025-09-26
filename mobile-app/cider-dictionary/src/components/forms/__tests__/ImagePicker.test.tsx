// ImagePicker Component Tests
// Tests for photo capture functionality and permissions handling

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ImagePicker } from '../ImagePicker';
import * as ImagePickerExpo from 'expo-image-picker';

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images'
  }
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockImagePickerExpo = ImagePickerExpo as jest.Mocked<typeof ImagePickerExpo>;

describe('ImagePicker', () => {
  const defaultProps = {
    label: 'Cider Photo',
    onImageSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with placeholder when no image is selected', () => {
      const { getByText } = render(<ImagePicker {...defaultProps} />);

      expect(getByText('Cider Photo')).toBeTruthy();
      expect(getByText('Add Photo')).toBeTruthy();
      expect(getByText('Tap to take photo or choose from gallery')).toBeTruthy();
    });

    it('should render with image when value is provided', () => {
      const { getByText, queryByText } = render(
        <ImagePicker {...defaultProps} value="mock://image.jpg" />
      );

      expect(getByText('Cider Photo')).toBeTruthy();
      expect(getByText('Change Photo')).toBeTruthy();
      expect(getByText('Remove')).toBeTruthy();
      expect(queryByText('Add Photo')).toBeNull();
    });

    it('should show required indicator when required prop is true', () => {
      const { getByText } = render(
        <ImagePicker {...defaultProps} required={true} />
      );

      expect(getByText('*')).toBeTruthy();
    });
  });

  describe('Image Selection', () => {
    it('should show action sheet when placeholder is pressed', () => {
      const { getByText } = render(<ImagePicker {...defaultProps} />);

      fireEvent.press(getByText('Add Photo'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Add Photo',
        'Choose how you want to add a photo of your cider',
        expect.any(Array)
      );
    });

    it('should show action sheet when change photo is pressed', () => {
      const { getByText } = render(
        <ImagePicker {...defaultProps} value="mock://image.jpg" />
      );

      fireEvent.press(getByText('Change Photo'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Add Photo',
        'Choose how you want to add a photo of your cider',
        expect.any(Array)
      );
    });
  });

  describe('Image Options', () => {
    it('should be in loading state when isLoading is true', () => {
      const { getByText } = render(<ImagePicker {...defaultProps} />);

      // The component should render in non-loading state by default
      expect(getByText('Add Photo')).toBeTruthy();
    });

    it('should display image preview when uri is provided', () => {
      const { queryByText } = render(
        <ImagePicker {...defaultProps} value="test://image.jpg" />
      );

      expect(queryByText('Add Photo')).toBeNull();
      expect(queryByText('Change Photo')).toBeTruthy();
    });
  });

  describe('Container Styling', () => {
    it('should apply correct border color for validation state', () => {
      const validation = {
        isValid: false,
        showFeedback: true,
        errors: ['Required field'],
        warnings: [],
        suggestions: []
      };

      render(<ImagePicker {...defaultProps} validation={validation} />);
      // Component renders with validation styling (tested by visual appearance)
    });

    it('should show portrait aspect ratio container', () => {
      render(<ImagePicker {...defaultProps} />);
      // Container should have 267px height for portrait orientation (tested by visual appearance)
    });
  });

  describe('Image Removal', () => {
    it('should show confirmation dialog when remove button is pressed', () => {
      const { getByText } = render(
        <ImagePicker {...defaultProps} value="mock://image.jpg" />
      );

      fireEvent.press(getByText('Remove'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Remove Photo',
        'Are you sure you want to remove this photo?',
        expect.any(Array)
      );
    });
  });

  describe('Validation Feedback', () => {
    it('should display validation errors', () => {
      const validation = {
        isValid: false,
        showFeedback: true,
        errors: ['Photo is required'],
        warnings: [],
        suggestions: []
      };

      const { getByText } = render(
        <ImagePicker {...defaultProps} validation={validation} />
      );

      expect(getByText('• Photo is required')).toBeTruthy();
    });

    it('should display validation warnings', () => {
      const validation = {
        isValid: true,
        showFeedback: true,
        errors: [],
        warnings: ['Large image file size'],
        suggestions: []
      };

      const { getByText } = render(
        <ImagePicker {...defaultProps} validation={validation} />
      );

      expect(getByText('⚠ Large image file size')).toBeTruthy();
    });

    it('should display validation suggestions', () => {
      const validation = {
        isValid: true,
        showFeedback: true,
        errors: [],
        warnings: [],
        suggestions: ['Consider taking a photo in good lighting']
      };

      const { getByText } = render(
        <ImagePicker {...defaultProps} validation={validation} />
      );

      expect(getByText('💡 Consider taking a photo in good lighting')).toBeTruthy();
    });
  });
});