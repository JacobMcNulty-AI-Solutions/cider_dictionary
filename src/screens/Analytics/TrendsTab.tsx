/**
 * Trends Tab Screen
 *
 * Displays comprehensive trend analyses for:
 * - Collection growth over time
 * - Rating trends
 * - Spending patterns
 * - ABV preferences
 *
 * Features:
 * - Multiple trend visualizations
 * - Time range selector
 * - Pull-to-refresh
 * - Loading states
 * - Empty states
 * - Error boundaries
 *
 * @module TrendsTab
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrendChart } from '../../components/analytics/TrendChart';
import { PredictionBadge } from '../../components/analytics/PredictionBadge';
import { trendAnalyzer, TrendAnalysisResult } from '../../services/analytics/TrendAnalyzer';
import { TimeRange, GroupBy, AnalyticsConfig } from '../../types/analytics';
import { CiderMasterRecord } from '../../types/cider';
import { ExperienceLog } from '../../types/experience';

// ============================================================================
// Type Definitions
// ============================================================================

interface TrendsTabProps {
  ciders: CiderMasterRecord[];
  experiences: ExperienceLog[];
  timeRange?: TimeRange;
}

interface TimeRangeOption {
  value: TimeRange;
  label: string;
}

const TIME_RANGES: TimeRangeOption[] = [
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1Y' },
  { value: 'ALL', label: 'All' },
];

// ============================================================================
// Components
// ============================================================================

/**
 * Time Range Selector Component
 */
function TimeRangeSelector({
  selected,
  onSelect,
}: {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
}) {
  return (
    <View style={styles.timeRangeContainer}>
      {TIME_RANGES.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.timeRangeButton,
            selected === option.value && styles.timeRangeButtonActive,
          ]}
          onPress={() => onSelect(option.value)}
        >
          <Text
            style={[
              styles.timeRangeText,
              selected === option.value && styles.timeRangeTextActive,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * TrendsTab Screen Component
 *
 * @example
 * <TrendsTab ciders={ciderData} experiences={experienceData} timeRange="3M" />
 */
export function TrendsTab({ ciders, experiences, timeRange: externalTimeRange }: TrendsTabProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(externalTimeRange || '3M');
  const [groupBy, setGroupBy] = useState<GroupBy>('month');
  const [trends, setTrends] = useState<TrendAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load trends based on current configuration
   */
  const loadTrends = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setIsLoading(true);
        }
        setError(null);

        const config: AnalyticsConfig = {
          timeRange: selectedTimeRange,
          groupBy,
          enableSampling: false,
        };

        const result = await trendAnalyzer.computeTrends(ciders, experiences, config);
        setTrends(result);
      } catch (err) {
        console.error('[TrendsTab] Error loading trends:', err);
        setError('Failed to load trends. Please try again.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [ciders, experiences, selectedTimeRange, groupBy]
  );

  /**
   * Sync external timeRange prop with internal state
   */
  useEffect(() => {
    if (externalTimeRange && externalTimeRange !== selectedTimeRange) {
      setSelectedTimeRange(externalTimeRange);
      // Adjust groupBy based on time range for optimal visualization
      if (externalTimeRange === '1M') {
        setGroupBy('week');
      } else if (externalTimeRange === 'ALL') {
        setGroupBy('quarter');
      } else {
        setGroupBy('month');
      }
    }
  }, [externalTimeRange, selectedTimeRange]);

  /**
   * Load trends on mount and when dependencies change
   */
  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  /**
   * Handle time range selection
   */
  const handleTimeRangeSelect = useCallback((range: TimeRange) => {
    setSelectedTimeRange(range);

    // Adjust groupBy based on time range for optimal visualization
    if (range === '1M') {
      setGroupBy('week');
    } else if (range === 'ALL') {
      setGroupBy('quarter');
    } else {
      setGroupBy('month');
    }
  }, []);

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadTrends(false);
  }, [loadTrends]);

  // ============================================================================
  // Render
  // ============================================================================

  // Error state
  if (error && !isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Failed to Load Trends</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadTrends()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Empty state (no data)
  if (!isLoading && ciders.length === 0) {
    return (
      <View style={styles.container}>
        <TimeRangeSelector
          selected={selectedTimeRange}
          onSelect={handleTimeRangeSelect}
        />
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics-outline" size={80} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No Data Yet</Text>
          <Text style={styles.emptyMessage}>
            Add cider entries to see trends and analytics
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trend Analysis</Text>
        <Text style={styles.headerSubtitle}>
          Tracking {ciders.length} ciders across {experiences.length} experiences
        </Text>
      </View>

      {/* Time Range Selector (only show if not controlled by parent) */}
      {!externalTimeRange && (
        <TimeRangeSelector
          selected={selectedTimeRange}
          onSelect={handleTimeRangeSelect}
        />
      )}

      {/* Collection Growth Trend */}
      <View style={styles.trendSection}>
        <TrendChart
          trend={trends?.collectionGrowth || null}
          title="Collection Growth"
          color="#2280b0"
          showPredictions={true}
          isLoading={isLoading}
        />
        {trends?.collectionGrowth && !isLoading && (
          <PredictionBadge
            direction={trends.collectionGrowth.direction}
            confidence={trends.collectionGrowth.confidence}
            label="Growth Outlook"
            size="medium"
            style={styles.badge}
          />
        )}
      </View>

      {/* Rating Trend */}
      <View style={styles.trendSection}>
        <TrendChart
          trend={trends?.ratingTrend || null}
          title="Average Rating"
          color="#10b981"
          showPredictions={true}
          isLoading={isLoading}
        />
        {trends?.ratingTrend && !isLoading && (
          <PredictionBadge
            direction={trends.ratingTrend.direction}
            confidence={trends.ratingTrend.confidence}
            label="Rating Outlook"
            size="medium"
            style={styles.badge}
          />
        )}
      </View>

      {/* Spending Trend */}
      {experiences.length > 0 && (
        <View style={styles.trendSection}>
          <TrendChart
            trend={trends?.spendingTrend || null}
            title="Total Spending"
            color="#f59e0b"
            showPredictions={true}
            isLoading={isLoading}
          />
          {trends?.spendingTrend && !isLoading && (
            <PredictionBadge
              direction={trends.spendingTrend.direction}
              confidence={trends.spendingTrend.confidence}
              label="Spending Outlook"
              size="medium"
              style={styles.badge}
            />
          )}
        </View>
      )}

      {/* ABV Preference Trend */}
      {experiences.length > 0 && (
        <View style={styles.trendSection}>
          <TrendChart
            trend={trends?.abvTrend || null}
            title="Average ABV"
            color="#8b5cf6"
            showPredictions={true}
            isLoading={isLoading}
          />
          {trends?.abvTrend && !isLoading && (
            <PredictionBadge
              direction={trends.abvTrend.direction}
              confidence={trends.abvTrend.confidence}
              label="ABV Outlook"
              size="medium"
              style={styles.badge}
            />
          )}
        </View>
      )}

      {/* Info Footer */}
      <View style={styles.footer}>
        <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
        <Text style={styles.footerText}>
          Trends are calculated using linear regression. Confidence indicates reliability.
        </Text>
      </View>
    </ScrollView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: '#2280b0',
    borderColor: '#2280b0',
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  timeRangeTextActive: {
    color: '#ffffff',
  },
  trendSection: {
    marginBottom: 24,
  },
  badge: {
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 16,
    marginBottom: 32,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#2280b0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default TrendsTab;
