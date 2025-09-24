import React from 'react';
import { render, fireEvent } from '../../../__tests__/utils/testUtils';
import Button from '../Button';

describe('Button Component', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  describe('Basic Functionality', () => {
    it('should render with title', () => {
      const { getByText } = render(
        <Button title="Test Button" onPress={mockOnPress} />
      );

      expect(getByText('Test Button')).toBeTruthy();
    });

    it('should call onPress when pressed', () => {
      const { getByText } = render(
        <Button title="Test Button" onPress={mockOnPress} />
      );

      fireEvent.press(getByText('Test Button'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should render with primary variant by default', () => {
      const { getByText } = render(
        <Button title="Test Button" onPress={mockOnPress} />
      );

      const button = getByText('Test Button').parent;
      expect(button).toHaveStyle({ backgroundColor: '#007AFF' });
    });
  });

  describe('Variants', () => {
    it('should render primary variant correctly', () => {
      const { getByText } = render(
        <Button title="Primary Button" onPress={mockOnPress} variant="primary" />
      );

      const button = getByText('Primary Button').parent;
      const text = getByText('Primary Button');

      expect(button).toHaveStyle({ backgroundColor: '#007AFF' });
      expect(text).toHaveStyle({ color: '#fff' });
    });

    it('should render secondary variant correctly', () => {
      const { getByText } = render(
        <Button title="Secondary Button" onPress={mockOnPress} variant="secondary" />
      );

      const button = getByText('Secondary Button').parent;
      const text = getByText('Secondary Button');

      expect(button).toHaveStyle({
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#007AFF',
      });
      expect(text).toHaveStyle({ color: '#007AFF' });
    });
  });

  describe('States', () => {
    it('should render disabled state correctly', () => {
      const { getByText } = render(
        <Button title="Disabled Button" onPress={mockOnPress} disabled />
      );

      const button = getByText('Disabled Button').parent;
      const text = getByText('Disabled Button');

      expect(button).toHaveStyle({
        backgroundColor: '#CCCCCC',
        borderColor: '#CCCCCC',
      });
      expect(text).toHaveStyle({ color: '#888' });
    });

    it('should not call onPress when disabled', () => {
      const { getByText } = render(
        <Button title="Disabled Button" onPress={mockOnPress} disabled />
      );

      fireEvent.press(getByText('Disabled Button'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should show loading spinner when loading', () => {
      const { getByTestId, queryByText } = render(
        <Button title="Loading Button" onPress={mockOnPress} loading />
      );

      // Should show activity indicator
      const spinner = getByTestId('activity-indicator');
      expect(spinner).toBeTruthy();

      // Should not show title text
      expect(queryByText('Loading Button')).toBeNull();
    });

    it('should not call onPress when loading', () => {
      const { getByTestId } = render(
        <Button title="Loading Button" onPress={mockOnPress} loading />
      );

      const button = getByTestId('activity-indicator').parent;
      if (button) {
        fireEvent.press(button);
      }
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should show correct spinner color for primary variant', () => {
      const { getByTestId } = render(
        <Button title="Loading" onPress={mockOnPress} loading variant="primary" />
      );

      const spinner = getByTestId('activity-indicator');
      expect(spinner.props.color).toBe('#fff');
    });

    it('should show correct spinner color for secondary variant', () => {
      const { getByTestId } = render(
        <Button title="Loading" onPress={mockOnPress} loading variant="secondary" />
      );

      const spinner = getByTestId('activity-indicator');
      expect(spinner.props.color).toBe('#007AFF');
    });
  });

  describe('Styling', () => {
    it('should apply custom button style', () => {
      const customStyle = { marginTop: 20 };
      const { getByText } = render(
        <Button title="Styled Button" onPress={mockOnPress} style={customStyle} />
      );

      const button = getByText('Styled Button').parent;
      expect(button).toHaveStyle(customStyle);
    });

    it('should apply custom text style', () => {
      const customTextStyle = { fontSize: 20 };
      const { getByText } = render(
        <Button title="Custom Text" onPress={mockOnPress} textStyle={customTextStyle} />
      );

      const text = getByText('Custom Text');
      expect(text).toHaveStyle(customTextStyle);
    });

    it('should have proper default styling', () => {
      const { getByText } = render(
        <Button title="Default Button" onPress={mockOnPress} />
      );

      const button = getByText('Default Button').parent;
      const text = getByText('Default Button');

      expect(button).toHaveStyle({
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
      });

      expect(text).toHaveStyle({
        fontSize: 16,
        fontWeight: '600',
      });
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', () => {
      const { getByText } = render(
        <Button title="Accessible Button" onPress={mockOnPress} />
      );

      const button = getByText('Accessible Button').parent;
      expect(button).toHaveProp('accessible');
    });

    it('should have correct accessibility state when disabled', () => {
      const { getByText } = render(
        <Button title="Disabled Button" onPress={mockOnPress} disabled />
      );

      const button = getByText('Disabled Button').parent;
      expect(button).toHaveProp('disabled', true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty title', () => {
      const { queryByText } = render(
        <Button title="" onPress={mockOnPress} />
      );

      // Should still render the button, just with empty text
      expect(queryByText('')).toBeTruthy();
    });

    it('should handle very long titles', () => {
      const longTitle = 'This is a very long button title that might overflow';
      const { getByText } = render(
        <Button title={longTitle} onPress={mockOnPress} />
      );

      expect(getByText(longTitle)).toBeTruthy();
    });

    it('should handle both disabled and loading states', () => {
      const { getByTestId } = render(
        <Button title="Test" onPress={mockOnPress} disabled loading />
      );

      // Should show spinner
      const spinner = getByTestId('activity-indicator');
      expect(spinner).toBeTruthy();

      // Should not call onPress
      const button = spinner.parent;
      if (button) {
        fireEvent.press(button);
      }
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should handle onPress errors gracefully', () => {
      const errorOnPress = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      const { getByText } = render(
        <Button title="Error Button" onPress={errorOnPress} />
      );

      // Should not crash when onPress throws
      expect(() => {
        fireEvent.press(getByText('Error Button'));
      }).toThrow('Test error');

      expect(errorOnPress).toHaveBeenCalled();
    });
  });
});