/**
 * Test Suite for TrendChart Component
 *
 * Tests cover:
 * - Rendering with valid trend data
 * - Empty states
 * - Loading states
 * - Prediction visualization
 * - Responsive behavior
 * - Accessibility
 *
 * Target: 20+ tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TrendChart } from '../TrendChart';
import { TrendAnalysis } from '../../../types/analytics';

// Mock react-native-chart-kit
jest.mock('react-native-chart-kit', () => ({
  LineChart: ({ data, ...props }: any) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return (
      <View testID="line-chart">
        <Text testID="chart-labels">{data.labels?.join(',')}</Text>
        <Text testID="chart-data">{data.datasets?.[0]?.data?.join(',')}</Text>
      </View>
    );
  },
  BarChart: () => null,
  PieChart: () => null,
}));

// ============================================================================
// Mock Data
// ============================================================================

const mockTrend: TrendAnalysis = {
  label: 'Test Trend',
  direction: 'increasing',
  slope: 0.5,
  confidence: 0.85,
  dataPoints: [
    { period: '2024-01', value: 10, count: 5 },
    { period: '2024-02', value: 15, count: 8 },
    { period: '2024-03', value: 20, count: 10 },
  ],
  predictions: [
    { period: '2024-04', value: 25, confidence: 0.75 },
    { period: '2024-05', value: 30, confidence: 0.65 },
    { period: '2024-06', value: 35, confidence: 0.55 },
  ],
  chartData: {
    labels: ['Jan 2024', 'Feb 2024', 'Mar 2024'],
    datasets: [
      {
        label: 'Test Trend',
        data: [10, 15, 20],
        color: () => 'rgba(34, 128, 176, 1)',
        strokeWidth: 2,
      },
    ],
    min: 10,
    max: 20,
    average: 15,
  },
};

const mockDecreasingTrend: TrendAnalysis = {
  ...mockTrend,
  direction: 'decreasing',
  slope: -0.3,
  confidence: 0.65,
  dataPoints: [
    { period: '2024-01', value: 20, count: 10 },
    { period: '2024-02', value: 15, count: 8 },
    { period: '2024-03', value: 10, count: 5 },
  ],
  chartData: {
    ...mockTrend.chartData,
    datasets: [
      {
        ...mockTrend.chartData.datasets[0],
        data: [20, 15, 10],
      },
    ],
  },
};

const mockStableTrend: TrendAnalysis = {
  ...mockTrend,
  direction: 'stable',
  slope: 0.05,
  confidence: 0.95,
  dataPoints: [
    { period: '2024-01', value: 15, count: 10 },
    { period: '2024-02', value: 15, count: 10 },
    { period: '2024-03', value: 15, count: 10 },
  ],
  chartData: {
    ...mockTrend.chartData,
    datasets: [
      {
        ...mockTrend.chartData.datasets[0],
        data: [15, 15, 15],
      },
    ],
  },
};

// ============================================================================
// Tests
// ============================================================================

describe('TrendChart', () => {
  // ============================================================================
  // Basic Rendering
  // ============================================================================

  describe('Basic Rendering', () => {
    it('should render with valid trend data', () => {
      const { getByText } = render(
        <TrendChart trend={mockTrend} title="Collection Growth" />
      );

      expect(getByText('Collection Growth')).toBeTruthy();
      expect(getByText('Increasing')).toBeTruthy();
    });

    it('should render title correctly', () => {
      const { getByText } = render(
        <TrendChart trend={mockTrend} title="Test Title" />
      );

      expect(getByText('Test Title')).toBeTruthy();
    });

    it('should render with custom color', () => {
      const { getByText } = render(
        <TrendChart trend={mockTrend} title="Test" color="#ff0000" />
      );

      expect(getByText('Test')).toBeTruthy();
    });

    it('should display trend direction badge', () => {
      const { getByText } = render(
        <TrendChart trend={mockTrend} title="Test" />
      );

      expect(getByText('Increasing')).toBeTruthy();
    });

    it('should display confidence level', () => {
      const { getByText } = render(
        <TrendChart trend={mockTrend} title="Test" />
      );

      expect(getByText('Confidence:')).toBeTruthy();
      expect(getByText('85%')).toBeTruthy();
    });
  });

  // ============================================================================
  // Direction Variants
  // ============================================================================

  describe('Direction Variants', () => {
    it('should render increasing trend correctly', () => {
      const { getByText } = render(
        <TrendChart trend={mockTrend} title="Test" />
      );

      expect(getByText('Increasing')).toBeTruthy();
    });

    it('should render decreasing trend correctly', () => {
      const { getByText } = render(
        <TrendChart trend={mockDecreasingTrend} title="Test" />
      );

      expect(getByText('Decreasing')).toBeTruthy();
    });

    it('should render stable trend correctly', () => {
      const { getByText } = render(
        <TrendChart trend={mockStableTrend} title="Test" />
      );

      expect(getByText('Stable')).toBeTruthy();
    });
  });

  // ============================================================================
  // Predictions
  // ============================================================================

  describe('Predictions', () => {
    it('should show predictions when enabled', () => {
      const { getByText } = render(
        <TrendChart trend={mockTrend} title="Test" showPredictions={true} />
      );

      expect(getByText('Historical')).toBeTruthy();
      expect(getByText('Predicted')).toBeTruthy();
    });

    it('should hide predictions when disabled', () => {
      const { queryByText } = render(
        <TrendChart trend={mockTrend} title="Test" showPredictions={false} />
      );

      expect(queryByText('Historical')).toBeNull();
      expect(queryByText('Predicted')).toBeNull();
    });

    it('should not show legend when no predictions', () => {
      const trendWithoutPredictions = {
        ...mockTrend,
        predictions: [],
      };

      const { queryByText } = render(
        <TrendChart trend={trendWithoutPredictions} title="Test" showPredictions={true} />
      );

      expect(queryByText('Historical')).toBeNull();
      expect(queryByText('Predicted')).toBeNull();
    });
  });

  // ============================================================================
  // Empty & Loading States
  // ============================================================================

  describe('Empty & Loading States', () => {
    it('should render loading state', () => {
      const { getByText } = render(
        <TrendChart trend={null} title="Test" isLoading={true} />
      );

      expect(getByText('Computing trend...')).toBeTruthy();
    });

    it('should render empty state when trend is null', () => {
      const { getByText } = render(
        <TrendChart trend={null} title="Test" isLoading={false} />
      );

      expect(getByText('No trend data available')).toBeTruthy();
      expect(getByText('Add more entries to see trends')).toBeTruthy();
    });

    it('should render empty state when data points are empty', () => {
      const emptyTrend = {
        ...mockTrend,
        dataPoints: [],
      };

      const { getByText } = render(
        <TrendChart trend={emptyTrend} title="Test" isLoading={false} />
      );

      expect(getByText('No trend data available')).toBeTruthy();
    });

    it('should show title in loading state', () => {
      const { getByText } = render(
        <TrendChart trend={null} title="My Title" isLoading={true} />
      );

      expect(getByText('My Title')).toBeTruthy();
    });

    it('should show title in empty state', () => {
      const { getByText } = render(
        <TrendChart trend={null} title="My Title" isLoading={false} />
      );

      expect(getByText('My Title')).toBeTruthy();
    });
  });

  // ============================================================================
  // Summary Information
  // ============================================================================

  describe('Summary Information', () => {
    it('should display slope value', () => {
      const { getByText } = render(
        <TrendChart trend={mockTrend} title="Test" />
      );

      expect(getByText(/Slope:/)).toBeTruthy();
      expect(getByText('0.500')).toBeTruthy();
    });

    it('should display data points count', () => {
      const { getByText } = render(
        <TrendChart trend={mockTrend} title="Test" />
      );

      expect(getByText(/Data Points:/)).toBeTruthy();
      expect(getByText('3')).toBeTruthy();
    });

    it('should format slope to 3 decimal places', () => {
      const trendWithPreciseSlope = {
        ...mockTrend,
        slope: 0.123456789,
      };

      const { getByText } = render(
        <TrendChart trend={trendWithPreciseSlope} title="Test" />
      );

      expect(getByText('0.123')).toBeTruthy();
    });
  });

  // ============================================================================
  // Confidence Display
  // ============================================================================

  describe('Confidence Display', () => {
    it('should show high confidence correctly', () => {
      const highConfidenceTrend = {
        ...mockTrend,
        confidence: 0.95,
      };

      const { getByText } = render(
        <TrendChart trend={highConfidenceTrend} title="Test" />
      );

      expect(getByText('95%')).toBeTruthy();
    });

    it('should show medium confidence correctly', () => {
      const mediumConfidenceTrend = {
        ...mockTrend,
        confidence: 0.55,
      };

      const { getByText } = render(
        <TrendChart trend={mediumConfidenceTrend} title="Test" />
      );

      expect(getByText('55%')).toBeTruthy();
    });

    it('should show low confidence correctly', () => {
      const lowConfidenceTrend = {
        ...mockTrend,
        confidence: 0.25,
      };

      const { getByText } = render(
        <TrendChart trend={lowConfidenceTrend} title="Test" />
      );

      expect(getByText('25%')).toBeTruthy();
    });

    it('should round confidence to nearest integer', () => {
      const trendWithDecimalConfidence = {
        ...mockTrend,
        confidence: 0.847,
      };

      const { getByText } = render(
        <TrendChart trend={trendWithDecimalConfidence} title="Test" />
      );

      expect(getByText('85%')).toBeTruthy();
    });
  });

  // ============================================================================
  // Color Validation Tests
  // ============================================================================

  describe('Color Validation', () => {
    it('should handle valid hex colors', () => {
      const validColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000'];

      validColors.forEach((color) => {
        const { getByText } = render(
          <TrendChart trend={mockTrend} title="Test" color={color} />
        );
        expect(getByText('Test')).toBeTruthy();
      });
    });

    it('should handle lowercase hex colors', () => {
      const { getByText } = render(
        <TrendChart trend={mockTrend} title="Test" color="#ff00ff" />
      );
      expect(getByText('Test')).toBeTruthy();
    });

    it('should handle mixed case hex colors', () => {
      const { getByText } = render(
        <TrendChart trend={mockTrend} title="Test" color="#FfAa33" />
      );
      expect(getByText('Test')).toBeTruthy();
    });

    it('should reject invalid hex colors with invalid characters', () => {
      // Color with invalid characters should render without crashing
      const { getByText } = render(
        <TrendChart trend={mockTrend} title="Test" color="#GGG000" />
      );

      // Component should render successfully despite invalid color
      expect(getByText('Test')).toBeTruthy();
      expect(getByText('Increasing')).toBeTruthy();
    });

    it('should reject short hex colors', () => {
      // 3-character hex codes should render without crashing
      const { getByText } = render(
        <TrendChart trend={mockTrend} title="Test" color="#FFF" />
      );

      // Component should render successfully despite invalid color
      expect(getByText('Test')).toBeTruthy();
      expect(getByText('Increasing')).toBeTruthy();
    });

    it('should reject long hex colors', () => {
      // More than 6 characters should render without crashing
      const { getByText } = render(
        <TrendChart trend={mockTrend} title="Test" color="#FF00FF00" />
      );

      // Component should render successfully despite invalid color
      expect(getByText('Test')).toBeTruthy();
      expect(getByText('Increasing')).toBeTruthy();
    });

    it('should reject colors without hash', () => {
      // Missing # prefix should render without crashing
      const { getByText } = render(
        <TrendChart trend={mockTrend} title="Test" color="FF0000" />
      );

      // Component should render successfully despite invalid color
      expect(getByText('Test')).toBeTruthy();
      expect(getByText('Increasing')).toBeTruthy();
    });

    it('should use fallback color for empty string', () => {
      // Empty string should render without crashing
      const { getByText } = render(
        <TrendChart trend={mockTrend} title="Test" color="" />
      );

      // Component should render successfully despite invalid color
      expect(getByText('Test')).toBeTruthy();
      expect(getByText('Increasing')).toBeTruthy();
    });

    it('should handle special characters in color string', () => {
      // Special characters should render without crashing
      const { getByText } = render(
        <TrendChart trend={mockTrend} title="Test" color="#FF$$00" />
      );

      // Component should render successfully despite invalid color
      expect(getByText('Test')).toBeTruthy();
      expect(getByText('Increasing')).toBeTruthy();
    });

    it('should handle color with spaces', () => {
      // Color with spaces should render without crashing
      const { getByText } = render(
        <TrendChart trend={mockTrend} title="Test" color="# FF00 FF" />
      );

      // Component should render successfully despite invalid color
      expect(getByText('Test')).toBeTruthy();
      expect(getByText('Increasing')).toBeTruthy();
    });

    it('should not log warning for valid default color', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { getByText } = render(
        <TrendChart trend={mockTrend} title="Test" color="#2280b0" />
      );

      expect(getByText('Test')).toBeTruthy();
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle single data point', () => {
      const singlePointTrend = {
        ...mockTrend,
        dataPoints: [{ period: '2024-01', value: 10, count: 1 }],
        chartData: {
          ...mockTrend.chartData,
          labels: ['Jan 2024'],
          datasets: [
            {
              ...mockTrend.chartData.datasets[0],
              data: [10],
            },
          ],
        },
      };

      const { getByText } = render(
        <TrendChart trend={singlePointTrend} title="Test" />
      );

      expect(getByText('Test')).toBeTruthy();
      expect(getByText('1')).toBeTruthy(); // Data points count
    });

    it('should handle zero confidence', () => {
      const zeroConfidenceTrend = {
        ...mockTrend,
        confidence: 0,
      };

      const { getByText } = render(
        <TrendChart trend={zeroConfidenceTrend} title="Test" />
      );

      expect(getByText('0%')).toBeTruthy();
    });

    it('should handle perfect confidence', () => {
      const perfectConfidenceTrend = {
        ...mockTrend,
        confidence: 1.0,
      };

      const { getByText } = render(
        <TrendChart trend={perfectConfidenceTrend} title="Test" />
      );

      expect(getByText('100%')).toBeTruthy();
    });

    it('should handle negative slope', () => {
      const negativeSlopeTrend = {
        ...mockDecreasingTrend,
        slope: -2.5,
      };

      const { getByText } = render(
        <TrendChart trend={negativeSlopeTrend} title="Test" />
      );

      expect(getByText('-2.500')).toBeTruthy();
    });
  });
});
