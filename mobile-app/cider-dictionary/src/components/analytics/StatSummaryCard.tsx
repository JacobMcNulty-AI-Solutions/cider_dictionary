/**
 * Statistical Summary Card Component
 *
 * Displays key statistical metrics for a distribution including mean, median,
 * mode, range, and standard deviation. Provides visual representation and
 * formatting based on metric type.
 *
 * Features:
 * - Multiple format types (number, percentage, currency, rating)
 * - Visual variance indicator
 * - Icon support
 * - Color theming
 * - Compact layout
 *
 * @module StatSummaryCard
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Format type for value display
 */
export type FormatType = 'number' | 'percentage' | 'currency' | 'rating';

/**
 * Statistical metrics
 */
export interface StatMetrics {
  /** Arithmetic mean */
  mean: number;
  /** Median value */
  median: number;
  /** Mode (most frequent value) */
  mode?: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Standard deviation */
  stdDev: number;
  /** Count of items */
  count: number;
}

/**
 * Props for StatSummaryCard component
 */
export interface StatSummaryCardProps {
  /** Card title */
  title: string;
  /** Statistical metrics */
  stats: StatMetrics;
  /** Icon name from Ionicons */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Theme color */
  color?: string;
  /** Value format type */
  format?: FormatType;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format value based on type
 */
function formatValue(value: number, format: FormatType): string {
  switch (format) {
    case 'currency':
      return `£${value.toFixed(2)}`;
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'rating':
      return `${value.toFixed(1)}/10`;
    case 'number':
    default:
      return value.toFixed(1);
  }
}

/**
 * Get variance level description
 */
function getVarianceLevel(stdDev: number, mean: number): {
  level: string;
  color: string;
} {
  if (mean === 0) {
    return { level: 'N/A', color: '#6b7280' };
  }

  const cv = (stdDev / mean) * 100; // Coefficient of variation

  if (cv < 15) {
    return { level: 'Low', color: '#10b981' }; // Green
  } else if (cv < 30) {
    return { level: 'Medium', color: '#f59e0b' }; // Orange
  } else {
    return { level: 'High', color: '#ef4444' }; // Red
  }
}

// ============================================================================
// StatSummaryCard Component
// ============================================================================

/**
 * StatSummaryCard component for displaying statistical summaries
 *
 * @example
 * <StatSummaryCard
 *   title="Rating Statistics"
 *   stats={{
 *     mean: 7.5,
 *     median: 8,
 *     mode: 8,
 *     min: 1,
 *     max: 10,
 *     stdDev: 1.8,
 *     count: 50
 *   }}
 *   icon="star"
 *   color="#FF6384"
 *   format="rating"
 * />
 */
export function StatSummaryCard({
  title,
  stats,
  icon = 'stats-chart',
  color = '#2280b0',
  format = 'number',
}: StatSummaryCardProps) {
  const variance = getVarianceLevel(stats.stdDev, stats.mean);

  return (
    <View style={[styles.container, { borderLeftColor: color }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name={icon} size={20} color={color} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.count}>{stats.count} items</Text>
      </View>

      {/* Primary Stats */}
      <View style={styles.primaryStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Mean</Text>
          <Text style={[styles.statValue, { color }]}>
            {formatValue(stats.mean, format)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Median</Text>
          <Text style={[styles.statValue, { color }]}>
            {formatValue(stats.median, format)}
          </Text>
        </View>

        {stats.mode !== undefined && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Mode</Text>
            <Text style={[styles.statValue, { color }]}>
              {formatValue(stats.mode, format)}
            </Text>
          </View>
        )}
      </View>

      {/* Range */}
      <View style={styles.rangeContainer}>
        <Text style={styles.rangeLabel}>Range</Text>
        <Text style={styles.rangeValue}>
          {formatValue(stats.min, format)} - {formatValue(stats.max, format)}
        </Text>
      </View>

      {/* Variance Indicator */}
      <View style={styles.varianceContainer}>
        <Text style={styles.varianceLabel}>Variance</Text>
        <View style={styles.varianceIndicator}>
          <View style={[styles.varianceDot, { backgroundColor: variance.color }]} />
          <Text style={[styles.varianceLevel, { color: variance.color }]}>
            {variance.level}
          </Text>
          <Text style={styles.varianceValue}>
            (σ = {stats.stdDev.toFixed(2)})
          </Text>
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
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  count: {
    fontSize: 12,
    color: '#6b7280',
  },
  primaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  rangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rangeLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  rangeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  varianceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  varianceLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  varianceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  varianceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  varianceLevel: {
    fontSize: 14,
    fontWeight: '500',
  },
  varianceValue: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

// ============================================================================
// Default Export
// ============================================================================

export default StatSummaryCard;
