/**
 * Trend Chart Component
 *
 * Visualizes trend analysis data using react-native-chart-kit LineChart.
 * Displays historical data points and optional future predictions with
 * different styling.
 *
 * Features:
 * - Responsive sizing based on screen width
 * - Historical vs predicted data visualization
 * - Trend direction indicator
 * - Confidence level display
 * - Loading and empty states
 * - Smooth bezier curves
 *
 * @module TrendChart
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { TrendAnalysis } from '../../types/analytics';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Props for TrendChart component
 */
export interface TrendChartProps {
  /** Trend analysis data to visualize */
  trend: TrendAnalysis | null;
  /** Chart title */
  title: string;
  /** Primary color for the chart line (default: blue) */
  color?: string;
  /** Whether to show prediction points (default: true) */
  showPredictions?: boolean;
  /** Loading state */
  isLoading?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const { width: screenWidth } = Dimensions.get('window');
const CHART_WIDTH = screenWidth - 32; // Account for padding

/**
 * Get trend direction icon
 */
function getTrendIcon(direction: 'increasing' | 'decreasing' | 'stable'): keyof typeof Ionicons.glyphMap {
  switch (direction) {
    case 'increasing':
      return 'trending-up';
    case 'decreasing':
      return 'trending-down';
    case 'stable':
      return 'remove';
  }
}

/**
 * Get trend direction color
 */
function getTrendColor(direction: 'increasing' | 'decreasing' | 'stable'): string {
  switch (direction) {
    case 'increasing':
      return '#10b981'; // Green
    case 'decreasing':
      return '#ef4444'; // Red
    case 'stable':
      return '#6b7280'; // Gray
  }
}

// ============================================================================
// TrendChart Component
// ============================================================================

/**
 * TrendChart component for visualizing trend analysis
 *
 * @example
 * <TrendChart
 *   trend={collectionGrowthTrend}
 *   title="Collection Growth"
 *   color="#2280b0"
 *   showPredictions={true}
 * />
 */
export function TrendChart({
  trend,
  title,
  color = '#2280b0',
  showPredictions = true,
  isLoading = false,
}: TrendChartProps) {
  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={color} />
          <Text style={styles.loadingText}>Computing trend...</Text>
        </View>
      </View>
    );
  }

  // Empty state
  if (!trend || trend.dataPoints.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyText}>No trend data available</Text>
          <Text style={styles.emptySubtext}>
            Add more entries to see trends
          </Text>
        </View>
      </View>
    );
  }

  // Prepare chart data
  const labels = [...trend.chartData.labels];
  const data = [...trend.chartData.datasets[0].data];

  // Add predictions if enabled
  if (showPredictions && trend.predictions.length > 0) {
    trend.predictions.forEach((pred) => {
      // Format prediction label
      const labelParts = pred.period.split('-');
      let formattedLabel = pred.period;

      if (labelParts.length === 2 && labelParts[1].length === 2) {
        // Month format: 2024-01
        const monthNames = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        const month = parseInt(labelParts[1], 10) - 1;
        formattedLabel = `${monthNames[month]} ${labelParts[0]}`;
      }

      labels.push(formattedLabel);
      data.push(pred.value);
    });
  }

  // Calculate chart config
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(34, 128, 176, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: color,
    },
    propsForBackgroundLines: {
      strokeDasharray: '', // solid lines
      stroke: '#e5e7eb',
      strokeWidth: 1,
    },
  };

  // Override color with validation
  if (color) {
    // Helper function to parse and validate hex color
    const colorWithOpacity = (hexColor: string, opacity: number): string => {
      try {
        // Validate hex color format
        const hexColorRegex = /^#[0-9A-F]{6}$/i;
        if (!hexColorRegex.test(hexColor)) {
          console.warn(`[TrendChart] Invalid hex color: ${hexColor}, using default`);
          return `rgba(54, 162, 235, ${opacity})`; // Default blue
        }

        const r = parseInt(hexColor.substring(1, 3), 16);
        const g = parseInt(hexColor.substring(3, 5), 16);
        const b = parseInt(hexColor.substring(5, 7), 16);

        // Validate parsed values
        if (isNaN(r) || isNaN(g) || isNaN(b)) {
          console.warn(`[TrendChart] Failed to parse hex color: ${hexColor}, using default`);
          return `rgba(54, 162, 235, ${opacity})`; // Default blue
        }

        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      } catch (error) {
        console.error('[TrendChart] Error parsing color:', error);
        return `rgba(54, 162, 235, ${opacity})`; // Default blue
      }
    };

    chartConfig.color = (opacity = 1) => colorWithOpacity(color, opacity);
    chartConfig.propsForDots.stroke = color;
  }

  const trendColor = getTrendColor(trend.direction);
  const trendIcon = getTrendIcon(trend.direction);
  const confidence = Math.round(trend.confidence * 100);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          <View style={[styles.directionBadge, { backgroundColor: trendColor + '20' }]}>
            <Ionicons name={trendIcon} size={16} color={trendColor} />
            <Text style={[styles.directionText, { color: trendColor }]}>
              {trend.direction.charAt(0).toUpperCase() + trend.direction.slice(1)}
            </Text>
          </View>
        </View>

        {/* Confidence */}
        <View style={styles.confidenceRow}>
          <Text style={styles.confidenceLabel}>Confidence:</Text>
          <View style={styles.confidenceBar}>
            <View
              style={[
                styles.confidenceBarFill,
                {
                  width: `${confidence}%`,
                  backgroundColor: confidence > 70 ? '#10b981' : confidence > 40 ? '#f59e0b' : '#ef4444',
                },
              ]}
            />
          </View>
          <Text style={styles.confidenceValue}>{confidence}%</Text>
        </View>
      </View>

      {/* Chart */}
      <LineChart
        data={{
          labels,
          datasets: [
            {
              data,
              color: (opacity = 1) => chartConfig.color(opacity),
              strokeWidth: 2,
            },
          ],
        }}
        width={CHART_WIDTH}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withInnerLines
        withOuterLines
        withVerticalLines={false}
        withHorizontalLines
        withDots
        withShadow={false}
        withVerticalLabels
        withHorizontalLabels
        segments={4}
      />

      {/* Legend */}
      {showPredictions && trend.predictions.length > 0 && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>Historical</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color, opacity: 0.5 }]} />
            <Text style={styles.legendText}>Predicted</Text>
          </View>
        </View>
      )}

      {/* Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          Slope: <Text style={styles.summaryValue}>{trend.slope.toFixed(3)}</Text>
          {' • '}
          Data Points: <Text style={styles.summaryValue}>{trend.dataPoints.length}</Text>
        </Text>
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
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  directionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  directionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  confidenceBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  confidenceValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    minWidth: 35,
    textAlign: 'right',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
  },
  summary: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  summaryText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  summaryValue: {
    fontWeight: '600',
    color: '#374151',
  },
  loadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
});

export default TrendChart;
