import React from 'react';
import { render } from '../../../__tests__/utils/testUtils';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner Component', () => {
  describe('Basic Functionality', () => {
    it('should render activity indicator', () => {
      const { getByTestId } = render(<LoadingSpinner />);

      const spinner = getByTestId('activity-indicator');
      expect(spinner).toBeTruthy();
    });

    it('should render with default large size', () => {
      const { getByTestId } = render(<LoadingSpinner />);

      const spinner = getByTestId('activity-indicator');
      expect(spinner).toHaveProp('size', 'large');
    });

    it('should render with custom size', () => {
      const { getByTestId } = render(<LoadingSpinner size="small" />);

      const spinner = getByTestId('activity-indicator');
      expect(spinner).toHaveProp('size', 'small');
    });

    it('should render with correct color', () => {
      const { getByTestId } = render(<LoadingSpinner />);

      const spinner = getByTestId('activity-indicator');
      expect(spinner).toHaveProp('color', '#007AFF');
    });
  });

  describe('Message Display', () => {
    it('should display message when provided', () => {
      const { getByText } = render(
        <LoadingSpinner message="Loading ciders..." />
      );

      expect(getByText('Loading ciders...')).toBeTruthy();
    });

    it('should not display message when not provided', () => {
      const { queryByText } = render(<LoadingSpinner />);

      // Should not have any text elements
      expect(queryByText(/Loading/)).toBeNull();
    });

    it('should style message text correctly', () => {
      const { getByText } = render(
        <LoadingSpinner message="Loading..." />
      );

      const message = getByText('Loading...');
      expect(message).toHaveStyle({
        marginTop: 16,
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
      });
    });
  });

  describe('Layout and Styling', () => {
    it('should have proper container styling', () => {
      const { getByTestId } = render(<LoadingSpinner />);

      const spinner = getByTestId('activity-indicator');
      const container = spinner.parent;

      expect(container).toHaveStyle({
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      });
    });

    it('should center spinner and message', () => {
      const { getByTestId, getByText } = render(
        <LoadingSpinner message="Loading..." />
      );

      const container = getByTestId('activity-indicator').parent;
      expect(container).toHaveStyle({
        justifyContent: 'center',
        alignItems: 'center',
      });

      const message = getByText('Loading...');
      expect(message).toHaveStyle({ textAlign: 'center' });
    });

    it('should have proper spacing between spinner and message', () => {
      const { getByText } = render(
        <LoadingSpinner message="Loading..." />
      );

      const message = getByText('Loading...');
      expect(message).toHaveStyle({ marginTop: 16 });
    });
  });

  describe('Different Size Variations', () => {
    it('should render small spinner correctly', () => {
      const { getByTestId } = render(<LoadingSpinner size="small" />);

      const spinner = getByTestId('activity-indicator');
      expect(spinner).toHaveProp('size', 'small');
      expect(spinner).toHaveProp('color', '#007AFF');
    });

    it('should render large spinner correctly', () => {
      const { getByTestId } = render(<LoadingSpinner size="large" />);

      const spinner = getByTestId('activity-indicator');
      expect(spinner).toHaveProp('size', 'large');
      expect(spinner).toHaveProp('color', '#007AFF');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      const { getByText } = render(<LoadingSpinner message="" />);

      const message = getByText('');
      expect(message).toBeTruthy();
      expect(message).toHaveStyle({ marginTop: 16 });
    });

    it('should handle very long message', () => {
      const longMessage = 'This is a very long loading message that might wrap to multiple lines and should still be displayed correctly with proper styling';
      const { getByText } = render(<LoadingSpinner message={longMessage} />);

      const message = getByText(longMessage);
      expect(message).toBeTruthy();
      expect(message).toHaveStyle({ textAlign: 'center' });
    });

    it('should handle message with special characters', () => {
      const specialMessage = 'Loading... 加载中... الحمولة... 読み込み中...';
      const { getByText } = render(<LoadingSpinner message={specialMessage} />);

      expect(getByText(specialMessage)).toBeTruthy();
    });

    it('should handle undefined size gracefully', () => {
      const { getByTestId } = render(<LoadingSpinner size={undefined} />);

      const spinner = getByTestId('activity-indicator');
      // Should default to 'large' when size is undefined
      expect(spinner).toHaveProp('size', 'large');
    });
  });

  describe('Component Structure', () => {
    it('should have spinner before message in DOM order', () => {
      const { getByTestId, getByText } = render(
        <LoadingSpinner message="Loading..." />
      );

      const container = getByTestId('activity-indicator').parent;
      const children = container?.children;

      if (children && children.length >= 2) {
        // First child should be the ActivityIndicator
        expect(children[0]).toBe(getByTestId('activity-indicator'));
        // Second child should be the message text
        expect(children[1]).toBe(getByText('Loading...'));
      }
    });

    it('should only render spinner when no message', () => {
      const { getByTestId } = render(<LoadingSpinner />);

      const container = getByTestId('activity-indicator').parent;
      const children = container?.children;

      // Should only have one child (the spinner)
      expect(children).toHaveLength(1);
    });

    it('should render both spinner and message when message provided', () => {
      const { getByTestId, getByText } = render(
        <LoadingSpinner message="Test message" />
      );

      const container = getByTestId('activity-indicator').parent;
      const children = container?.children;

      // Should have two children (spinner and message)
      expect(children).toHaveLength(2);
      expect(getByTestId('activity-indicator')).toBeTruthy();
      expect(getByText('Test message')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', () => {
      const { getByTestId } = render(<LoadingSpinner />);

      const spinner = getByTestId('activity-indicator');
      expect(spinner).toHaveProp('accessible');
    });

    it('should have proper accessibility for message', () => {
      const { getByText } = render(
        <LoadingSpinner message="Loading content" />
      );

      const message = getByText('Loading content');
      expect(message).toBeTruthy();
    });

    it('should provide loading indication for screen readers', () => {
      const { getByTestId } = render(
        <LoadingSpinner message="Loading data..." />
      );

      const spinner = getByTestId('activity-indicator');
      // ActivityIndicator should be accessible by default
      expect(spinner).toHaveProp('accessible');
    });
  });
});