/**
 * Distribution Chart Component
 *
 * Versatile chart component for rendering different distribution types using
 * react-native-chart-kit BarChart. Supports bar charts, horizontal bars,
 * and histograms with summary statistics and responsive sizing.
 *
 * Features:
 * - Multiple chart types (bar, horizontal, histogram)
 * - Responsive sizing
 * - Data summary display
 * - Color-coded bars
 * - Loading and empty states
 * - Interactive labels
 *
 * @module DistributionChart
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { ChartData } from '../../types/analytics';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Chart type options
 */
export type ChartType = 'bar' | 'horizontal' | 'histogram';

/**
 * Props for DistributionChart component
 */
export interface DistributionChartProps {
  /** Distribution data to visualize */
  distribution: ChartData | null;
  /** Chart title */
  title: string;
  /** Chart type (default: 'bar') */
  chartType?: ChartType;
  /** Primary color for bars (default: blue) */
  color?: string;
  /** Whether to show average line (default: false) */
  showAverage?: boolean;
  /** Loading state */
  isLoading?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const { width: screenWidth } = Dimensions.get('window');
const CHART_WIDTH = screenWidth - 32; // Account for padding
const CHART_HEIGHT = 220;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate summary statistics from distribution data
 */
function calculateSummary(distribution: ChartData): {
  total: number;
  average: number;
  max: number;
  maxLabel: string;
} {
  const data = distribution.datasets[0]?.data || [];
  const labels = distribution.labels || [];

  const total = data.reduce((sum, val) => sum + val, 0);
  const average = distribution.average ?? (total / data.length || 0);
  const maxValue = Math.max(...data);
  const maxIndex = data.indexOf(maxValue);
  const maxLabel = labels[maxIndex] || 'N/A';

  return {
    total,
    average: Math.round(average * 100) / 100,
    max: maxValue,
    maxLabel,
  };
}

/**
 * Format color string to ensure valid hex
 */
function ensureValidColor(color: string): string {
  // Check if color is a valid hex code
  if (/^#[0-9A-F]{6}$/i.test(color)) {
    return color;
  }
  // Default to blue if invalid
  return '#2280b0';
}

// ============================================================================
// DistributionChart Component
// ============================================================================

/**
 * DistributionChart component for visualizing distributions
 *
 * @example
 * <DistributionChart
 *   distribution={ratingDistribution}
 *   title="Rating Distribution"
 *   chartType="bar"
 *   color="#FF6384"
 *   showAverage={true}
 * />
 */
export function DistributionChart({
  distribution,
  title,
  chartType = 'bar',
  color = '#2280b0',
  showAverage = false,
  isLoading = false,
}: DistributionChartProps) {
  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ensureValidColor(color)} />
          <Text style={styles.loadingText}>Loading distribution...</Text>
        </View>
      </View>
    );
  }

  // Empty state
  if (
    !distribution ||
    distribution.labels.length === 0 ||
    !distribution.datasets ||
    distribution.datasets.length === 0
  ) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="bar-chart-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyText}>No distribution data</Text>
          <Text style={styles.emptySubtext}>Data will appear here once available</Text>
        </View>
      </View>
    );
  }

  // Handle "No data" placeholder
  const isPlaceholder = distribution.labels[0]?.includes('No ') || distribution.labels[0]?.includes('yet');
  if (isPlaceholder) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="bar-chart-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyText}>{distribution.labels[0]}</Text>
        </View>
      </View>
    );
  }

  // Calculate summary
  const summary = calculateSummary(distribution);

  // Prepare chart data
  const chartData = {
    labels: distribution.labels,
    datasets: [
      {
        data: distribution.datasets[0].data,
      },
    ],
  };

  // Chart configuration
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => {
      const validColor = ensureValidColor(color);
      // Convert hex to rgba
      const r = parseInt(validColor.slice(1, 3), 16);
      const g = parseInt(validColor.slice(3, 5), 16);
      const b = parseInt(validColor.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    },
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeDasharray: '', // solid lines
      stroke: '#e5e7eb',
      strokeWidth: 1,
    },
    propsForLabels: {
      fontSize: 10,
    },
    barPercentage: 0.7,
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <BarChart
          data={chartData}
          width={Math.max(CHART_WIDTH, distribution.labels.length * 60)}
          height={CHART_HEIGHT}
          chartConfig={chartConfig}
          yAxisSuffix=""
          yAxisLabel=""
          fromZero
          showValuesOnTopOfBars={false}
          withInnerLines={true}
          style={styles.chart}
        />
      </ScrollView>

      {/* Summary Statistics */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>{summary.total}</Text>
        </View>

        {showAverage && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Average</Text>
            <Text style={styles.summaryValue}>{summary.average.toFixed(1)}</Text>
          </View>
        )}

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Most Common</Text>
          <Text style={styles.summaryValue} numberOfLines={1} ellipsizeMode="tail">
            {summary.maxLabel}
          </Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Max Count</Text>
          <Text style={styles.summaryValue}>{summary.max}</Text>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  loadingContainer: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
});

// ============================================================================
// Default Export
// ============================================================================

export default DistributionChart;
