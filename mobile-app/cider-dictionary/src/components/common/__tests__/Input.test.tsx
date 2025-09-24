import React from 'react';
import { render, fireEvent } from '../../../__tests__/utils/testUtils';
import Input from '../Input';

describe('Input Component', () => {
  const mockOnChangeText = jest.fn();
  const defaultProps = {
    label: 'Test Input',
    value: '',
    onChangeText: mockOnChangeText,
  };

  beforeEach(() => {
    mockOnChangeText.mockClear();
  });

  describe('Basic Functionality', () => {
    it('should render with label', () => {
      const { getByText } = render(<Input {...defaultProps} />);

      expect(getByText('Test Input')).toBeTruthy();
    });

    it('should render with initial value', () => {
      const { getByDisplayValue } = render(
        <Input {...defaultProps} value="Initial Value" />
      );

      expect(getByDisplayValue('Initial Value')).toBeTruthy();
    });

    it('should call onChangeText when text changes', () => {
      const { getByDisplayValue } = render(<Input {...defaultProps} />);

      const input = getByDisplayValue('');
      fireEvent.changeText(input, 'New Text');

      expect(mockOnChangeText).toHaveBeenCalledWith('New Text');
      expect(mockOnChangeText).toHaveBeenCalledTimes(1);
    });

    it('should show placeholder text', () => {
      const { getByPlaceholderText } = render(
        <Input {...defaultProps} placeholder="Enter text here" />
      );

      expect(getByPlaceholderText('Enter text here')).toBeTruthy();
    });
  });

  describe('Required Field', () => {
    it('should show asterisk for required fields', () => {
      const { getByText } = render(
        <Input {...defaultProps} required />
      );

      expect(getByText('*')).toBeTruthy();
      expect(getByText('*')).toHaveStyle({ color: '#FF3B30' });
    });

    it('should not show asterisk for non-required fields', () => {
      const { queryByText } = render(<Input {...defaultProps} />);

      expect(queryByText('*')).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should display error message', () => {
      const { getByText } = render(
        <Input {...defaultProps} error="This field is required" />
      );

      expect(getByText('This field is required')).toBeTruthy();
      expect(getByText('This field is required')).toHaveStyle({ color: '#FF3B30' });
    });

    it('should apply error styling to input', () => {
      const { getByDisplayValue } = render(
        <Input {...defaultProps} error="Error message" />
      );

      const input = getByDisplayValue('');
      expect(input).toHaveStyle({ borderColor: '#FF3B30' });
    });

    it('should not show error message when no error', () => {
      const { queryByText } = render(<Input {...defaultProps} />);

      expect(queryByText('This field is required')).toBeNull();
    });

    it('should have normal border color when no error', () => {
      const { getByDisplayValue } = render(<Input {...defaultProps} />);

      const input = getByDisplayValue('');
      expect(input).toHaveStyle({ borderColor: '#DDD' });
    });
  });

  describe('Styling', () => {
    it('should apply custom container style', () => {
      const customStyle = { marginTop: 20 };
      const { getByText } = render(
        <Input {...defaultProps} containerStyle={customStyle} />
      );

      const container = getByText('Test Input').parent;
      expect(container).toHaveStyle(customStyle);
    });

    it('should have default styling', () => {
      const { getByText, getByDisplayValue } = render(<Input {...defaultProps} />);

      const label = getByText('Test Input');
      const input = getByDisplayValue('');

      expect(label).toHaveStyle({
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 4,
      });

      expect(input).toHaveStyle({
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: '#fff',
      });
    });

    it('should have correct placeholder text color', () => {
      const { getByPlaceholderText } = render(
        <Input {...defaultProps} placeholder="Placeholder text" />
      );

      const input = getByPlaceholderText('Placeholder text');
      expect(input).toHaveProp('placeholderTextColor', '#999');
    });
  });

  describe('TextInput Props Pass-through', () => {
    it('should pass through keyboardType', () => {
      const { getByDisplayValue } = render(
        <Input {...defaultProps} keyboardType="numeric" />
      );

      const input = getByDisplayValue('');
      expect(input).toHaveProp('keyboardType', 'numeric');
    });

    it('should pass through autoCapitalize', () => {
      const { getByDisplayValue } = render(
        <Input {...defaultProps} autoCapitalize="words" />
      );

      const input = getByDisplayValue('');
      expect(input).toHaveProp('autoCapitalize', 'words');
    });

    it('should pass through returnKeyType', () => {
      const { getByDisplayValue } = render(
        <Input {...defaultProps} returnKeyType="done" />
      );

      const input = getByDisplayValue('');
      expect(input).toHaveProp('returnKeyType', 'done');
    });

    it('should pass through secureTextEntry', () => {
      const { getByDisplayValue } = render(
        <Input {...defaultProps} secureTextEntry />
      );

      const input = getByDisplayValue('');
      expect(input).toHaveProp('secureTextEntry', true);
    });

    it('should pass through multiline', () => {
      const { getByDisplayValue } = render(
        <Input {...defaultProps} multiline />
      );

      const input = getByDisplayValue('');
      expect(input).toHaveProp('multiline', true);
    });

    it('should pass through onFocus', () => {
      const mockOnFocus = jest.fn();
      const { getByDisplayValue } = render(
        <Input {...defaultProps} onFocus={mockOnFocus} />
      );

      const input = getByDisplayValue('');
      fireEvent(input, 'focus');

      expect(mockOnFocus).toHaveBeenCalledTimes(1);
    });

    it('should pass through onBlur', () => {
      const mockOnBlur = jest.fn();
      const { getByDisplayValue } = render(
        <Input {...defaultProps} onBlur={mockOnBlur} />
      );

      const input = getByDisplayValue('');
      fireEvent(input, 'blur');

      expect(mockOnBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty label', () => {
      const { queryByText } = render(
        <Input {...defaultProps} label="" />
      );

      // Empty label should still render
      expect(queryByText('')).toBeTruthy();
    });

    it('should handle very long labels', () => {
      const longLabel = 'This is a very long label that might cause display issues';
      const { getByText } = render(
        <Input {...defaultProps} label={longLabel} />
      );

      expect(getByText(longLabel)).toBeTruthy();
    });

    it('should handle very long error messages', () => {
      const longError = 'This is a very long error message that might cause display issues in the UI';
      const { getByText } = render(
        <Input {...defaultProps} error={longError} />
      );

      expect(getByText(longError)).toBeTruthy();
    });

    it('should handle null value gracefully', () => {
      // TypeScript would prevent this, but JavaScript might allow it
      const { getByDisplayValue } = render(
        <Input {...defaultProps} value={null as any} />
      );

      // Should handle null by converting to empty string
      expect(getByDisplayValue('')).toBeTruthy();
    });

    it('should handle undefined value gracefully', () => {
      const { getByDisplayValue } = render(
        <Input {...defaultProps} value={undefined as any} />
      );

      expect(getByDisplayValue('')).toBeTruthy();
    });

    it('should handle special characters in text', () => {
      const specialText = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./ 测试';
      const { getByDisplayValue } = render(
        <Input {...defaultProps} value={specialText} />
      );

      expect(getByDisplayValue(specialText)).toBeTruthy();

      const input = getByDisplayValue(specialText);
      fireEvent.changeText(input, 'New ' + specialText);
      expect(mockOnChangeText).toHaveBeenCalledWith('New ' + specialText);
    });

    it('should handle rapid text changes', () => {
      const { getByDisplayValue } = render(<Input {...defaultProps} />);

      const input = getByDisplayValue('');

      // Simulate rapid typing
      fireEvent.changeText(input, 'H');
      fireEvent.changeText(input, 'He');
      fireEvent.changeText(input, 'Hel');
      fireEvent.changeText(input, 'Hell');
      fireEvent.changeText(input, 'Hello');

      expect(mockOnChangeText).toHaveBeenCalledTimes(5);
      expect(mockOnChangeText).toHaveBeenLastCalledWith('Hello');
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', () => {
      const { getByDisplayValue } = render(<Input {...defaultProps} />);

      const input = getByDisplayValue('');
      expect(input).toHaveProp('accessible', true);
    });

    it('should have proper accessibility label', () => {
      const { getByDisplayValue } = render(
        <Input {...defaultProps} accessibilityLabel="Custom accessibility label" />
      );

      const input = getByDisplayValue('');
      expect(input).toHaveProp('accessibilityLabel', 'Custom accessibility label');
    });
  });
});