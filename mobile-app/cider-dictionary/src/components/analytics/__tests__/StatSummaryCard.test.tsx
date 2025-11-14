/**
 * Test Suite for StatSummaryCard Component
 *
 * Tests cover:
 * - Rendering with all statistics
 * - Format types (number, percentage, currency, rating)
 * - Statistics display
 * - Variance indicator
 * - Edge cases
 * - Layout
 *
 * Target: 20+ tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import StatSummaryCard, { StatMetrics } from '../StatSummaryCard';

// ============================================================================
// Mock Data
// ============================================================================

const mockStats: StatMetrics = {
  mean: 7.5,
  median: 8.0,
  mode: 9,
  min: 3,
  max: 10,
  stdDev: 1.8,
  count: 50,
};

const lowVarianceStats: StatMetrics = {
  mean: 100,
  median: 100,
  mode: 100,
  min: 95,
  max: 105,
  stdDev: 5, // CV = 5/100 = 0.05 = 5% (Low)
  count: 30,
};

const mediumVarianceStats: StatMetrics = {
  mean: 100,
  median: 100,
  mode: 100,
  min: 80,
  max: 120,
  stdDev: 20, // CV = 20/100 = 0.20 = 20% (Medium)
  count: 40,
};

const highVarianceStats: StatMetrics = {
  mean: 100,
  median: 95,
  mode: 90,
  min: 50,
  max: 200,
  stdDev: 40, // CV = 40/100 = 0.40 = 40% (High)
  count: 25,
};

const zeroMeanStats: StatMetrics = {
  mean: 0,
  median: 0,
  mode: 0,
  min: 0,
  max: 0,
  stdDev: 0,
  count: 10,
};

const zeroStdDevStats: StatMetrics = {
  mean: 50,
  median: 50,
  mode: 50,
  min: 50,
  max: 50,
  stdDev: 0, // All same values
  count: 15,
};

const smallValueStats: StatMetrics = {
  mean: 0.5,
  median: 0.6,
  mode: 0.7,
  min: 0.1,
  max: 0.9,
  stdDev: 0.2,
  count: 20,
};

const largeValueStats: StatMetrics = {
  mean: 5000,
  median: 4800,
  mode: 4500,
  min: 1000,
  max: 10000,
  stdDev: 2500,
  count: 100,
};

const singleValueStats: StatMetrics = {
  mean: 42,
  median: 42,
  mode: 42,
  min: 42,
  max: 42,
  stdDev: 0,
  count: 1,
};

const statsWithoutMode: StatMetrics = {
  mean: 7.5,
  median: 8.0,
  mode: undefined,
  min: 3,
  max: 10,
  stdDev: 1.8,
  count: 50,
};

// ============================================================================
// Test Suite
// ============================================================================

describe('StatSummaryCard', () => {
  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('Rendering', () => {
    it('should render with all statistics', () => {
      const { getByText } = render(
        <StatSummaryCard title="Test Stats" stats={mockStats} />
      );

      expect(getByText('Test Stats')).toBeTruthy();
      expect(getByText('Mean')).toBeTruthy();
      expect(getByText('Median')).toBeTruthy();
      expect(getByText('Mode')).toBeTruthy();
      expect(getByText('Range')).toBeTruthy();
      expect(getByText('Variance')).toBeTruthy();
    });

    it('should display title', () => {
      const { getByText } = render(
        <StatSummaryCard title="Rating Statistics" stats={mockStats} />
      );

      expect(getByText('Rating Statistics')).toBeTruthy();
    });

    it('should display icon when provided', () => {
      const { UNSAFE_getByType } = render(
        <StatSummaryCard title="Test" stats={mockStats} icon="star" />
      );

      const Ionicons = require('@expo/vector-icons').Ionicons;
      const icons = UNSAFE_getByType(Ionicons);
      expect(icons.props.name).toBe('star');
    });

    it('should apply custom color', () => {
      const { getByText } = render(
        <StatSummaryCard title="Test" stats={mockStats} color="#FF6384" />
      );

      const meanValue = getByText('7.5');
      const color = Array.isArray(meanValue.props.style)
        ? meanValue.props.style.find((s: any) => s?.color)?.color
        : meanValue.props.style.color;
      expect(color).toBe('#FF6384');
    });
  });

  // ==========================================================================
  // Format Types Tests
  // ==========================================================================

  describe('Format Types', () => {
    it('should format as number', () => {
      const { getByText } = render(
        <StatSummaryCard title="Test" stats={mockStats} format="number" />
      );

      expect(getByText('7.5')).toBeTruthy(); // mean
      expect(getByText('8.0')).toBeTruthy(); // median
    });

    it('should format as percentage', () => {
      const { getByText } = render(
        <StatSummaryCard title="Test" stats={mockStats} format="percentage" />
      );

      expect(getByText('7.5%')).toBeTruthy(); // mean
      expect(getByText('8.0%')).toBeTruthy(); // median
    });

    it('should format as currency', () => {
      const { getByText } = render(
        <StatSummaryCard title="Test" stats={mockStats} format="currency" />
      );

      expect(getByText('£7.50')).toBeTruthy(); // mean
      expect(getByText('£8.00')).toBeTruthy(); // median
    });

    it('should format as rating', () => {
      const { getByText } = render(
        <StatSummaryCard title="Test" stats={mockStats} format="rating" />
      );

      expect(getByText('7.5/10')).toBeTruthy(); // mean
      expect(getByText('8.0/10')).toBeTruthy(); // median
    });

    it('should default to number format', () => {
      const { getByText } = render(<StatSummaryCard title="Test" stats={mockStats} />);

      expect(getByText('7.5')).toBeTruthy(); // mean (no special formatting)
    });
  });

  // ==========================================================================
  // Statistics Display Tests
  // ==========================================================================

  describe('Statistics Display', () => {
    it('should display mean value', () => {
      const { getByText } = render(<StatSummaryCard title="Test" stats={mockStats} />);

      expect(getByText('Mean')).toBeTruthy();
      expect(getByText('7.5')).toBeTruthy();
    });

    it('should display median value', () => {
      const { getByText } = render(<StatSummaryCard title="Test" stats={mockStats} />);

      expect(getByText('Median')).toBeTruthy();
      expect(getByText('8.0')).toBeTruthy();
    });

    it('should display mode when present', () => {
      const { getByText } = render(<StatSummaryCard title="Test" stats={mockStats} />);

      expect(getByText('Mode')).toBeTruthy();
      expect(getByText('9.0')).toBeTruthy();
    });

    it('should handle missing mode', () => {
      const { queryByText } = render(
        <StatSummaryCard title="Test" stats={statsWithoutMode} />
      );

      // Mode should not be displayed if undefined
      expect(queryByText('Mode')).toBeNull();
    });

    it('should display range (min - max)', () => {
      const { getByText } = render(<StatSummaryCard title="Test" stats={mockStats} />);

      expect(getByText('Range')).toBeTruthy();
      expect(getByText('3.0 - 10.0')).toBeTruthy();
    });

    it('should display standard deviation', () => {
      const { getByText } = render(<StatSummaryCard title="Test" stats={mockStats} />);

      expect(getByText('(σ = 1.80)')).toBeTruthy();
    });

    it('should display count', () => {
      const { getByText } = render(<StatSummaryCard title="Test" stats={mockStats} />);

      expect(getByText('50 items')).toBeTruthy();
    });
  });

  // ==========================================================================
  // Variance Indicator Tests
  // ==========================================================================

  describe('Variance Indicator', () => {
    it('should show "Low" for CV < 0.15', () => {
      const { getByText } = render(
        <StatSummaryCard title="Test" stats={lowVarianceStats} />
      );

      expect(getByText('Low')).toBeTruthy();
    });

    it('should show "Medium" for 0.15 <= CV < 0.30', () => {
      const { getByText } = render(
        <StatSummaryCard title="Test" stats={mediumVarianceStats} />
      );

      expect(getByText('Medium')).toBeTruthy();
    });

    it('should show "High" for CV >= 0.30', () => {
      const { getByText } = render(
        <StatSummaryCard title="Test" stats={highVarianceStats} />
      );

      expect(getByText('High')).toBeTruthy();
    });

    it('should use green color for low variance', () => {
      const { getByText } = render(
        <StatSummaryCard title="Test" stats={lowVarianceStats} />
      );

      const lowText = getByText('Low');
      const color = Array.isArray(lowText.props.style)
        ? lowText.props.style.find((s: any) => s?.color)?.color
        : lowText.props.style.color;
      expect(color).toBe('#10b981'); // Green
    });

    it('should use orange color for medium variance', () => {
      const { getByText } = render(
        <StatSummaryCard title="Test" stats={mediumVarianceStats} />
      );

      const mediumText = getByText('Medium');
      const color = Array.isArray(mediumText.props.style)
        ? mediumText.props.style.find((s: any) => s?.color)?.color
        : mediumText.props.style.color;
      expect(color).toBe('#f59e0b'); // Orange
    });

    it('should use red color for high variance', () => {
      const { getByText } = render(
        <StatSummaryCard title="Test" stats={highVarianceStats} />
      );

      const highText = getByText('High');
      const color = Array.isArray(highText.props.style)
        ? highText.props.style.find((s: any) => s?.color)?.color
        : highText.props.style.color;
      expect(color).toBe('#ef4444'); // Red
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle zero mean', () => {
      const { getAllByText, getByText } = render(
        <StatSummaryCard title="Test" stats={zeroMeanStats} />
      );

      const zeros = getAllByText('0.0');
      expect(zeros.length).toBeGreaterThan(0); // Multiple 0.0 values (mean, median, etc.)
      expect(getByText('N/A')).toBeTruthy(); // Variance level when mean is 0
    });

    it('should handle zero standard deviation', () => {
      const { getByText } = render(
        <StatSummaryCard title="Test" stats={zeroStdDevStats} />
      );

      expect(getByText('(σ = 0.00)')).toBeTruthy();
      expect(getByText('Low')).toBeTruthy(); // CV = 0/50 = 0 (Low)
    });

    it('should handle very small values', () => {
      const { getByText } = render(
        <StatSummaryCard title="Test" stats={smallValueStats} />
      );

      expect(getByText('0.5')).toBeTruthy(); // mean
      expect(getByText('0.6')).toBeTruthy(); // median
    });

    it('should handle very large values', () => {
      const { getByText } = render(
        <StatSummaryCard title="Test" stats={largeValueStats} />
      );

      expect(getByText('5000.0')).toBeTruthy(); // mean
      expect(getByText('4800.0')).toBeTruthy(); // median
    });

    it('should handle negative values', () => {
      const negativeStats: StatMetrics = {
        mean: -5,
        median: -3,
        mode: -2,
        min: -10,
        max: 0,
        stdDev: 3,
        count: 20,
      };

      const { getByText } = render(<StatSummaryCard title="Test" stats={negativeStats} />);

      expect(getByText('-5.0')).toBeTruthy(); // mean
    });

    it('should handle single data point (count = 1)', () => {
      const { getAllByText, getByText } = render(
        <StatSummaryCard title="Test" stats={singleValueStats} />
      );

      expect(getByText('1 items')).toBeTruthy();
      const fortyTwos = getAllByText('42.0');
      expect(fortyTwos.length).toBeGreaterThan(0); // All stats should be 42 (mean, median, mode)
    });

    it('should handle currency format with large values', () => {
      const { getByText } = render(
        <StatSummaryCard title="Test" stats={largeValueStats} format="currency" />
      );

      expect(getByText('£5000.00')).toBeTruthy();
    });

    it('should handle percentage format with decimal values', () => {
      const { getByText } = render(
        <StatSummaryCard title="Test" stats={smallValueStats} format="percentage" />
      );

      expect(getByText('0.5%')).toBeTruthy();
    });
  });

  // ==========================================================================
  // Layout Tests
  // ==========================================================================

  describe('Layout', () => {
    it('should have card styling', () => {
      const { getByText } = render(<StatSummaryCard title="Test" stats={mockStats} />);

      const card = getByText('Test').parent?.parent?.parent;
      expect(card?.props.style).toBeDefined();
    });

    it('should be compact', () => {
      const { getByText } = render(<StatSummaryCard title="Test" stats={mockStats} />);

      // Should render all content without scroll
      expect(getByText('Mean')).toBeTruthy();
      expect(getByText('Range')).toBeTruthy();
      expect(getByText('Variance')).toBeTruthy();
    });
  });
});
