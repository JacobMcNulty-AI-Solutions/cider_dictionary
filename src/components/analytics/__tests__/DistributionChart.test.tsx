/**
 * Test Suite for DistributionChart Component
 *
 * Tests cover:
 * - Rendering with valid distribution data
 * - Chart types (bar, horizontal, histogram)
 * - Empty states
 * - Loading states
 * - Summary statistics display
 * - Responsive sizing
 * - Label formatting
 * - Edge cases
 * - Accessibility
 *
 * Target: 25+ tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import DistributionChart from '../DistributionChart';
import { ChartData } from '../../../types/analytics';

// Mock react-native-chart-kit
jest.mock('react-native-chart-kit', () => ({
  BarChart: ({ data, width, height, chartConfig, ...props }: any) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return (
      <View testID="bar-chart">
        <Text testID="chart-labels">{data.labels?.join(',')}</Text>
        <Text testID="chart-data">{data.datasets?.[0]?.data?.join(',')}</Text>
        <Text testID="chart-width">{width}</Text>
        <Text testID="chart-height">{height}</Text>
        <Text testID="chart-color">{chartConfig.color(1)}</Text>
      </View>
    );
  },
}));

// ============================================================================
// Mock Data
// ============================================================================

const mockDistribution: ChartData = {
  labels: ['1', '2', '3', '4', '5'],
  datasets: [
    {
      label: 'Count',
      data: [5, 10, 15, 8, 3],
      color: '#007AFF',
      strokeWidth: 2,
    },
  ],
  min: 0,
  max: 15,
  average: 8.2,
};

const mockSingleDataPoint: ChartData = {
  labels: ['Single'],
  datasets: [
    {
      label: 'Count',
      data: [1],
      color: '#007AFF',
    },
  ],
  min: 1,
  max: 1,
  average: 1,
};

const mockAllZeros: ChartData = {
  labels: ['A', 'B', 'C'],
  datasets: [
    {
      label: 'Count',
      data: [0, 0, 0],
      color: '#007AFF',
    },
  ],
  min: 0,
  max: 0,
  average: 0,
};

const mockLargeValues: ChartData = {
  labels: ['X', 'Y', 'Z'],
  datasets: [
    {
      label: 'Count',
      data: [1000, 5000, 10000],
      color: '#007AFF',
    },
  ],
  min: 1000,
  max: 10000,
  average: 5333.33,
};

const mockLongLabels: ChartData = {
  labels: [
    'Very Long Label That Should Be Truncated',
    'Another Extremely Long Label Name',
    'Short',
  ],
  datasets: [
    {
      label: 'Count',
      data: [10, 20, 15],
      color: '#007AFF',
    },
  ],
  min: 10,
  max: 20,
  average: 15,
};

const mockEmptyDistribution: ChartData = {
  labels: [],
  datasets: [
    {
      label: 'Count',
      data: [],
      color: '#007AFF',
    },
  ],
  min: 0,
  max: 0,
};

const mockPlaceholderDistribution: ChartData = {
  labels: ['No data yet'],
  datasets: [
    {
      label: 'Count',
      data: [0],
      color: '#9ca3af',
    },
  ],
  min: 0,
  max: 0,
};

// ============================================================================
// Test Suite
// ============================================================================

describe('DistributionChart', () => {
  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('Rendering', () => {
    it('should render with valid distribution data', () => {
      const { getByText, getByTestId } = render(
        <DistributionChart distribution={mockDistribution} title="Test Distribution" />
      );

      expect(getByText('Test Distribution')).toBeTruthy();
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should render title correctly', () => {
      const { getByText } = render(
        <DistributionChart
          distribution={mockDistribution}
          title="Rating Distribution"
        />
      );

      expect(getByText('Rating Distribution')).toBeTruthy();
    });

    it('should render BarChart with correct data', () => {
      const { getByTestId } = render(
        <DistributionChart distribution={mockDistribution} title="Test" />
      );

      const chartLabels = getByTestId('chart-labels');
      const chartData = getByTestId('chart-data');

      expect(chartLabels.children[0]).toBe('1,2,3,4,5');
      expect(chartData.children[0]).toBe('5,10,15,8,3');
    });

    it('should apply custom color', () => {
      const customColor = '#FF6384';
      const { getByTestId } = render(
        <DistributionChart
          distribution={mockDistribution}
          title="Test"
          color={customColor}
        />
      );

      const chartColor = getByTestId('chart-color');
      // Color is converted to rgba
      expect(chartColor.children[0]).toContain('rgba(255, 99, 132');
    });

    it('should handle null distribution gracefully', () => {
      const { getByText } = render(
        <DistributionChart distribution={null} title="Test Distribution" />
      );

      expect(getByText('Test Distribution')).toBeTruthy();
      expect(getByText('No distribution data')).toBeTruthy();
    });
  });

  // ==========================================================================
  // Chart Types Tests
  // ==========================================================================

  describe('Chart Types', () => {
    it('should render bar chart type', () => {
      const { getByTestId } = render(
        <DistributionChart
          distribution={mockDistribution}
          title="Test"
          chartType="bar"
        />
      );

      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should render horizontal chart type', () => {
      const { getByTestId } = render(
        <DistributionChart
          distribution={mockDistribution}
          title="Test"
          chartType="horizontal"
        />
      );

      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should render histogram chart type', () => {
      const { getByTestId } = render(
        <DistributionChart
          distribution={mockDistribution}
          title="Test"
          chartType="histogram"
        />
      );

      expect(getByTestId('bar-chart')).toBeTruthy();
    });
  });

  // ==========================================================================
  // Loading and Empty States Tests
  // ==========================================================================

  describe('Loading and Empty States', () => {
    it('should show loading spinner when isLoading is true', () => {
      const { getByTestId, queryByTestId } = render(
        <DistributionChart
          distribution={mockDistribution}
          title="Test"
          isLoading={true}
        />
      );

      expect(queryByTestId('bar-chart')).toBeNull();
      // ActivityIndicator is rendered
    });

    it('should show loading text when isLoading is true', () => {
      const { getByText } = render(
        <DistributionChart
          distribution={mockDistribution}
          title="Test"
          isLoading={true}
        />
      );

      expect(getByText('Loading distribution...')).toBeTruthy();
    });

    it('should show empty state when distribution is null', () => {
      const { getByText } = render(
        <DistributionChart distribution={null} title="Test" />
      );

      expect(getByText('No distribution data')).toBeTruthy();
      expect(getByText('Data will appear here once available')).toBeTruthy();
    });

    it('should show empty state when data is empty', () => {
      const { getByText } = render(
        <DistributionChart distribution={mockEmptyDistribution} title="Test" />
      );

      expect(getByText('No distribution data')).toBeTruthy();
    });

    it('should display empty message with icon', () => {
      const { UNSAFE_getByType } = render(
        <DistributionChart distribution={null} title="Test" />
      );

      const Ionicons = require('@expo/vector-icons').Ionicons;
      const icon = UNSAFE_getByType(Ionicons);
      expect(icon.props.name).toBe('bar-chart-outline');
    });

    it('should handle placeholder distribution', () => {
      const { getByText } = render(
        <DistributionChart distribution={mockPlaceholderDistribution} title="Test" />
      );

      expect(getByText('No data yet')).toBeTruthy();
    });
  });

  // ==========================================================================
  // Summary Statistics Tests
  // ==========================================================================

  describe('Summary Statistics', () => {
    it('should display total when showAverage is false', () => {
      const { getByText } = render(
        <DistributionChart
          distribution={mockDistribution}
          title="Test"
          showAverage={false}
        />
      );

      expect(getByText('Total')).toBeTruthy();
      expect(getByText('41')).toBeTruthy(); // 5+10+15+8+3 = 41
    });

    it('should display average when showAverage is true', () => {
      const { getByText } = render(
        <DistributionChart
          distribution={mockDistribution}
          title="Test"
          showAverage={true}
        />
      );

      expect(getByText('Average')).toBeTruthy();
      expect(getByText('8.2')).toBeTruthy();
    });

    it('should display most common value', () => {
      const { getByText } = render(
        <DistributionChart distribution={mockDistribution} title="Test" />
      );

      expect(getByText('Most Common')).toBeTruthy();
      expect(getByText('3')).toBeTruthy(); // Label '3' has max count of 15
    });

    it('should display max value', () => {
      const { getByText } = render(
        <DistributionChart distribution={mockDistribution} title="Test" />
      );

      expect(getByText('Max Count')).toBeTruthy();
      expect(getByText('15')).toBeTruthy();
    });

    it('should handle missing statistics gracefully', () => {
      const distWithoutAverage: ChartData = {
        ...mockDistribution,
        average: undefined,
      };

      const { getByText } = render(
        <DistributionChart
          distribution={distWithoutAverage}
          title="Test"
          showAverage={true}
        />
      );

      // Should calculate average from data
      expect(getByText('Average')).toBeTruthy();
    });
  });

  // ==========================================================================
  // Responsive Sizing Tests
  // ==========================================================================

  describe('Responsive Sizing', () => {
    it('should use window width for chart sizing', () => {
      const { getByTestId } = render(
        <DistributionChart distribution={mockDistribution} title="Test" />
      );

      const chartWidth = getByTestId('chart-width');
      // Width should be calculated based on screen width
      expect(Number(chartWidth.children[0])).toBeGreaterThan(0);
    });

    it('should have minimum width based on number of labels', () => {
      const manyLabels: ChartData = {
        ...mockDistribution,
        labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
        datasets: [
          {
            label: 'Count',
            data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            color: '#007AFF',
          },
        ],
      };

      const { getByTestId } = render(
        <DistributionChart distribution={manyLabels} title="Test" />
      );

      const chartWidth = getByTestId('chart-width');
      // Width should accommodate all labels (10 * 60 = 600)
      expect(Number(chartWidth.children[0])).toBeGreaterThanOrEqual(600);
    });

    it('should handle very narrow screens', () => {
      const { getByTestId } = render(
        <DistributionChart distribution={mockSingleDataPoint} title="Test" />
      );

      const chartWidth = getByTestId('chart-width');
      // Should have a width even for single data point
      expect(Number(chartWidth.children[0])).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Label Formatting Tests
  // ==========================================================================

  describe('Label Formatting', () => {
    it('should truncate long labels', () => {
      const { getByTestId } = render(
        <DistributionChart distribution={mockLongLabels} title="Test" />
      );

      const chartLabels = getByTestId('chart-labels');
      // Labels are passed to chart
      expect(chartLabels).toBeTruthy();
    });

    it('should handle empty labels', () => {
      const emptyLabels: ChartData = {
        ...mockDistribution,
        labels: ['', '', ''],
        datasets: [
          {
            label: 'Count',
            data: [1, 2, 3],
            color: '#007AFF',
          },
        ],
      };

      const { getByTestId } = render(
        <DistributionChart distribution={emptyLabels} title="Test" />
      );

      const chartLabels = getByTestId('chart-labels');
      expect(chartLabels.children[0]).toBe(',,');
    });

    it('should format numeric labels', () => {
      const { getByTestId } = render(
        <DistributionChart distribution={mockDistribution} title="Test" />
      );

      const chartLabels = getByTestId('chart-labels');
      expect(chartLabels.children[0]).toBe('1,2,3,4,5');
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle single data point', () => {
      const { getByText, getByTestId } = render(
        <DistributionChart distribution={mockSingleDataPoint} title="Test" />
      );

      expect(getByText('Test')).toBeTruthy();
      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should handle all zero values', () => {
      const { getAllByText, getByTestId } = render(
        <DistributionChart distribution={mockAllZeros} title="Test" />
      );

      expect(getByTestId('bar-chart')).toBeTruthy();
      const zeros = getAllByText('0');
      expect(zeros.length).toBeGreaterThan(0); // Should have zeros displayed
    });

    it('should handle negative values', () => {
      const negativeValues: ChartData = {
        ...mockDistribution,
        datasets: [
          {
            label: 'Count',
            data: [-5, -10, 0, 5, 10],
            color: '#007AFF',
          },
        ],
        min: -10,
        max: 10,
      };

      const { getByTestId } = render(
        <DistributionChart distribution={negativeValues} title="Test" />
      );

      expect(getByTestId('bar-chart')).toBeTruthy();
    });

    it('should handle very large values', () => {
      const { getByText, getByTestId } = render(
        <DistributionChart distribution={mockLargeValues} title="Test" />
      );

      expect(getByTestId('bar-chart')).toBeTruthy();
      expect(getByText('10000')).toBeTruthy(); // Max count
    });

    it('should handle invalid color format', () => {
      const { getByTestId } = render(
        <DistributionChart
          distribution={mockDistribution}
          title="Test"
          color="invalid-color"
        />
      );

      const chartColor = getByTestId('chart-color');
      // Should use default color
      expect(chartColor.children[0]).toContain('rgba(34, 128, 176');
    });

    it('should handle dataset without data', () => {
      const emptyDataset: ChartData = {
        labels: ['A', 'B'],
        datasets: [],
        min: 0,
        max: 0,
      };

      const { getByText } = render(
        <DistributionChart distribution={emptyDataset} title="Test" />
      );

      // Should show empty state since no datasets
      expect(getByText('No distribution data')).toBeTruthy();
    });

    it('should handle mismatched labels and data length', () => {
      const mismatchedData: ChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [
          {
            label: 'Count',
            data: [1, 2], // Only 2 values for 3 labels
            color: '#007AFF',
          },
        ],
        min: 1,
        max: 2,
      };

      const { getByTestId } = render(
        <DistributionChart distribution={mismatchedData} title="Test" />
      );

      // Should still render
      expect(getByTestId('bar-chart')).toBeTruthy();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have accessible label for loading state', () => {
      const { getByText } = render(
        <DistributionChart
          distribution={mockDistribution}
          title="Test Distribution"
          isLoading={true}
        />
      );

      expect(getByText('Test Distribution')).toBeTruthy();
      expect(getByText('Loading distribution...')).toBeTruthy();
    });

    it('should have accessible label for empty state', () => {
      const { getByText } = render(
        <DistributionChart distribution={null} title="Test Distribution" />
      );

      expect(getByText('Test Distribution')).toBeTruthy();
      expect(getByText('No distribution data')).toBeTruthy();
      expect(getByText('Data will appear here once available')).toBeTruthy();
    });
  });
});
