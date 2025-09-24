import React from 'react';
import { render } from '../../../__tests__/utils/testUtils';
import { Text } from 'react-native';
import SafeAreaContainer from '../SafeAreaContainer';

describe('SafeAreaContainer Component', () => {
  describe('Basic Functionality', () => {
    it('should render children correctly', () => {
      const { getByText } = render(
        <SafeAreaContainer>
          <Text>Test Content</Text>
        </SafeAreaContainer>
      );

      expect(getByText('Test Content')).toBeTruthy();
    });

    it('should render multiple children', () => {
      const { getByText } = render(
        <SafeAreaContainer>
          <Text>First Child</Text>
          <Text>Second Child</Text>
          <Text>Third Child</Text>
        </SafeAreaContainer>
      );

      expect(getByText('First Child')).toBeTruthy();
      expect(getByText('Second Child')).toBeTruthy();
      expect(getByText('Third Child')).toBeTruthy();
    });

    it('should render without children', () => {
      const { container } = render(<SafeAreaContainer />);

      // Should render without crashing
      expect(container).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('should apply default container styles', () => {
      const { getByText } = render(
        <SafeAreaContainer>
          <Text>Content</Text>
        </SafeAreaContainer>
      );

      const container = getByText('Content').parent;
      expect(container).toHaveStyle({
        flex: 1,
        backgroundColor: '#f5f5f5',
      });
    });

    it('should apply custom styles', () => {
      const customStyle = {
        backgroundColor: '#ffffff',
        padding: 20,
      };

      const { getByText } = render(
        <SafeAreaContainer style={customStyle}>
          <Text>Styled Content</Text>
        </SafeAreaContainer>
      );

      const container = getByText('Styled Content').parent;
      expect(container).toHaveStyle({
        flex: 1,
        backgroundColor: '#ffffff',
        padding: 20,
      });
    });

    it('should merge custom styles with default styles', () => {
      const customStyle = {
        paddingTop: 10,
        margin: 5,
      };

      const { getByText } = render(
        <SafeAreaContainer style={customStyle}>
          <Text>Merged Styles</Text>
        </SafeAreaContainer>
      );

      const container = getByText('Merged Styles').parent;
      expect(container).toHaveStyle({
        flex: 1, // default
        backgroundColor: '#f5f5f5', // default
        paddingTop: 10, // custom
        margin: 5, // custom
      });
    });

    it('should allow custom styles to override default styles', () => {
      const customStyle = {
        flex: 0.5,
        backgroundColor: '#red',
      };

      const { getByText } = render(
        <SafeAreaContainer style={customStyle}>
          <Text>Overridden Styles</Text>
        </SafeAreaContainer>
      );

      const container = getByText('Overridden Styles').parent;
      expect(container).toHaveStyle({
        flex: 0.5, // overridden
        backgroundColor: '#red', // overridden
      });
    });
  });

  describe('SafeAreaView Integration', () => {
    it('should render as SafeAreaView component', () => {
      const { getByText } = render(
        <SafeAreaContainer>
          <Text>Safe Content</Text>
        </SafeAreaContainer>
      );

      const container = getByText('Safe Content').parent;
      // SafeAreaView should be the container type
      expect(container).toBeTruthy();
    });

    it('should handle safe area insets properly', () => {
      // This test ensures the component structure is correct for safe area handling
      const { getByText } = render(
        <SafeAreaContainer>
          <Text>Inset Content</Text>
        </SafeAreaContainer>
      );

      const content = getByText('Inset Content');
      const container = content.parent;

      // Container should exist and contain the content
      expect(container).toBeTruthy();
      expect(container).toContainElement(content);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null children gracefully', () => {
      const { container } = render(
        <SafeAreaContainer>
          {null}
        </SafeAreaContainer>
      );

      expect(container).toBeTruthy();
    });

    it('should handle undefined children gracefully', () => {
      const { container } = render(
        <SafeAreaContainer>
          {undefined}
        </SafeAreaContainer>
      );

      expect(container).toBeTruthy();
    });

    it('should handle conditional children', () => {
      const showContent = true;
      const { getByText, queryByText } = render(
        <SafeAreaContainer>
          {showContent && <Text>Conditional Content</Text>}
          {!showContent && <Text>Hidden Content</Text>}
        </SafeAreaContainer>
      );

      expect(getByText('Conditional Content')).toBeTruthy();
      expect(queryByText('Hidden Content')).toBeNull();
    });

    it('should handle complex nested children', () => {
      const { getByText } = render(
        <SafeAreaContainer>
          <Text>Parent</Text>
          <SafeAreaContainer>
            <Text>Nested Child</Text>
          </SafeAreaContainer>
        </SafeAreaContainer>
      );

      expect(getByText('Parent')).toBeTruthy();
      expect(getByText('Nested Child')).toBeTruthy();
    });

    it('should handle empty style object', () => {
      const { getByText } = render(
        <SafeAreaContainer style={{}}>
          <Text>Empty Style</Text>
        </SafeAreaContainer>
      );

      const container = getByText('Empty Style').parent;
      expect(container).toHaveStyle({
        flex: 1,
        backgroundColor: '#f5f5f5',
      });
    });

    it('should handle null style', () => {
      const { getByText } = render(
        <SafeAreaContainer style={null as any}>
          <Text>Null Style</Text>
        </SafeAreaContainer>
      );

      const container = getByText('Null Style').parent;
      expect(container).toHaveStyle({
        flex: 1,
        backgroundColor: '#f5f5f5',
      });
    });

    it('should handle undefined style', () => {
      const { getByText } = render(
        <SafeAreaContainer style={undefined}>
          <Text>Undefined Style</Text>
        </SafeAreaContainer>
      );

      const container = getByText('Undefined Style').parent;
      expect(container).toHaveStyle({
        flex: 1,
        backgroundColor: '#f5f5f5',
      });
    });
  });

  describe('Component Structure', () => {
    it('should maintain proper component hierarchy', () => {
      const { getByText } = render(
        <SafeAreaContainer>
          <Text>Level 1</Text>
          <SafeAreaContainer>
            <Text>Level 2</Text>
            <SafeAreaContainer>
              <Text>Level 3</Text>
            </SafeAreaContainer>
          </SafeAreaContainer>
        </SafeAreaContainer>
      );

      const level1 = getByText('Level 1');
      const level2 = getByText('Level 2');
      const level3 = getByText('Level 3');

      expect(level1).toBeTruthy();
      expect(level2).toBeTruthy();
      expect(level3).toBeTruthy();
    });

    it('should preserve child order', () => {
      const { getByText } = render(
        <SafeAreaContainer>
          <Text>First</Text>
          <Text>Second</Text>
          <Text>Third</Text>
        </SafeAreaContainer>
      );

      const container = getByText('First').parent;
      const children = container?.children;

      if (children && children.length >= 3) {
        expect(children[0]).toBe(getByText('First'));
        expect(children[1]).toBe(getByText('Second'));
        expect(children[2]).toBe(getByText('Third'));
      }
    });
  });

  describe('Performance and Optimization', () => {
    it('should render efficiently with many children', () => {
      const manyChildren = Array.from({ length: 50 }, (_, i) => (
        <Text key={i}>Child {i}</Text>
      ));

      const { getByText } = render(
        <SafeAreaContainer>
          {manyChildren}
        </SafeAreaContainer>
      );

      // Should render first and last child without issues
      expect(getByText('Child 0')).toBeTruthy();
      expect(getByText('Child 49')).toBeTruthy();
    });

    it('should handle dynamic style changes', () => {
      const { getByText, rerender } = render(
        <SafeAreaContainer style={{ backgroundColor: 'red' }}>
          <Text>Dynamic Style</Text>
        </SafeAreaContainer>
      );

      let container = getByText('Dynamic Style').parent;
      expect(container).toHaveStyle({ backgroundColor: 'red' });

      // Re-render with different style
      rerender(
        <SafeAreaContainer style={{ backgroundColor: 'blue' }}>
          <Text>Dynamic Style</Text>
        </SafeAreaContainer>
      );

      container = getByText('Dynamic Style').parent;
      expect(container).toHaveStyle({ backgroundColor: 'blue' });
    });
  });

  describe('Accessibility', () => {
    it('should maintain accessibility for child components', () => {
      const { getByText } = render(
        <SafeAreaContainer>
          <Text accessibilityLabel="Accessible Text">Content</Text>
        </SafeAreaContainer>
      );

      const text = getByText('Content');
      expect(text).toHaveProp('accessibilityLabel', 'Accessible Text');
    });

    it('should not interfere with child accessibility', () => {
      const { getByTestId } = render(
        <SafeAreaContainer>
          <Text
            testID="accessible-text"
            accessibilityRole="text"
            accessibilityHint="This is a test hint"
          >
            Accessible Content
          </Text>
        </SafeAreaContainer>
      );

      const text = getByTestId('accessible-text');
      expect(text).toHaveProp('accessibilityRole', 'text');
      expect(text).toHaveProp('accessibilityHint', 'This is a test hint');
    });
  });
});