/**
 * Distributions Tab Screen
 *
 * Main dashboard screen displaying all 7 distribution types for cider analytics.
 * Shows comprehensive distribution visualizations including ratings, ABV, styles,
 * brands, taste tags, prices, and venue types.
 *
 * Features:
 * - 7 distribution visualizations
 * - Statistical summary cards for numeric metrics
 * - Pull-to-refresh support
 * - Loading states with skeleton UI
 * - Empty state handling
 * - Error handling with retry
 * - Responsive card layouts
 *
 * @module DistributionsTab
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DistributionChart from '../../components/analytics/DistributionChart';
import StatSummaryCard, { StatMetrics } from '../../components/analytics/StatSummaryCard';
import DistributionAnalyzer, { FullDistributionResult } from '../../services/analytics/DistributionAnalyzer';
import { CiderMasterRecord } from '../../types/cider';
import { ExperienceLog } from '../../types/experience';
import { mean, median, mode, standardDeviation, min, max } from '../../utils/statistics';

// ============================================================================
// Type Definitions
// ============================================================================

interface DistributionsTabProps {
  ciders: CiderMasterRecord[];
  experiences: ExperienceLog[];
  timeRange?: string; // TimeRange from parent (not actively used but accepted for consistency)
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Compute statistical metrics from an array of values
 */
function computeStatMetrics(values: number[]): StatMetrics | null {
  if (values.length === 0) {
    return null;
  }

  const meanValue = mean(values);
  const medianValue = median(values);
  const modeValue = mode(values);
  const minValue = min(values);
  const maxValue = max(values);
  const stdDevValue = standardDeviation(values);

  return {
    mean: meanValue,
    median: medianValue,
    mode: modeValue,
    min: minValue,
    max: maxValue,
    stdDev: stdDevValue,
    count: values.length,
  };
}

/**
 * Get summary text for rating distribution
 */
function getRatingSummary(stats: StatMetrics | null): string {
  if (!stats) return 'No ratings yet';
  return `Your average rating is ${stats.mean.toFixed(1)}/10`;
}

/**
 * Get summary text for ABV distribution
 */
function getAbvSummary(stats: StatMetrics | null): string {
  if (!stats) return 'No ABV data yet';
  return `You prefer ${stats.mean.toFixed(1)}% ABV ciders`;
}

/**
 * Get summary text for style distribution
 */
function getStyleSummary(styleCount: number): string {
  if (styleCount === 0) return 'No styles yet';
  return `You've tried ${styleCount} different style${styleCount !== 1 ? 's' : ''}`;
}

/**
 * Get summary text for brand distribution
 */
function getBrandSummary(brandCount: number): string {
  if (brandCount === 0) return 'No brands yet';
  return `${brandCount} unique brand${brandCount !== 1 ? 's' : ''} in your collection`;
}

/**
 * Get summary text for tag distribution
 */
function getTagSummary(mostCommon: string | null): string {
  if (!mostCommon) return 'No taste tags yet';
  return `Most common: ${mostCommon}`;
}

/**
 * Get summary text for price distribution
 */
function getPriceSummary(stats: StatMetrics | null): string {
  if (!stats) return 'No price data yet';
  return `Average spend: £${stats.mean.toFixed(2)} per pint`;
}

/**
 * Get summary text for venue distribution
 */
function getVenueSummary(venueCount: number): string {
  if (venueCount === 0) return 'No venues yet';
  return `You've visited ${venueCount} different venue${venueCount !== 1 ? 's' : ''}`;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * DistributionsTab component - main distributions dashboard
 *
 * @example
 * <DistributionsTab ciders={ciders} experiences={experiences} timeRange="3M" />
 */
export default function DistributionsTab({ ciders, experiences, timeRange }: DistributionsTabProps) {
  // State
  const [distributions, setDistributions] = useState<FullDistributionResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived stats
  const [ratingStats, setRatingStats] = useState<StatMetrics | null>(null);
  const [abvStats, setAbvStats] = useState<StatMetrics | null>(null);
  const [priceStats, setPriceStats] = useState<StatMetrics | null>(null);

  /**
   * Load distributions from ciders and experiences props
   */
  const loadDistributions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[DistributionsTab] Computing distributions...');
      console.log(
        `[DistributionsTab] Using ${ciders.length} ciders and ${experiences.length} experiences`
      );

      // Compute distributions
      const analyzer = DistributionAnalyzer.getInstance();
      const distributionData = await analyzer.computeDistributions(ciders, experiences);

      setDistributions(distributionData);

      // Compute stats for stat cards
      const ratings = ciders.map((c) => c.overallRating).filter((r) => r >= 1 && r <= 10);
      const abvValues = ciders.map((c) => c.abv).filter((v) => typeof v === 'number' && isFinite(v));
      const prices = experiences
        .map((e) => e.pricePerPint)
        .filter((p) => p !== null && p !== undefined && p > 0);

      setRatingStats(computeStatMetrics(ratings));
      setAbvStats(computeStatMetrics(abvValues));
      setPriceStats(computeStatMetrics(prices as number[]));

      console.log('[DistributionsTab] Distributions computed successfully');
    } catch (err) {
      console.error('[DistributionsTab] Failed to load distributions:', err);
      setError('Failed to load distributions. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [ciders, experiences]);

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadDistributions();
  }, [loadDistributions]);

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    setError(null);
    loadDistributions();
  }, [loadDistributions]);

  // Load on mount
  useEffect(() => {
    loadDistributions();
  }, [loadDistributions]);

  // ============================================================================
  // Render: Loading State
  // ============================================================================

  if (isLoading && !distributions) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2280b0" />
          <Text style={styles.loadingText}>Loading distributions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================================================
  // Render: Error State
  // ============================================================================

  if (error && !distributions) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Ionicons name="refresh" size={20} color="#ffffff" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================================================
  // Render: Empty State
  // ============================================================================

  if (
    !distributions ||
    (distributions.metadata.ciderCount === 0 && distributions.metadata.experienceCount === 0)
  ) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.emptyScrollContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#2280b0']} />
          }
        >
          <View style={styles.emptyContainer}>
            <Ionicons name="analytics-outline" size={80} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No Data Yet</Text>
            <Text style={styles.emptyMessage}>
              Start adding ciders and tasting experiences to see distribution analytics
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ============================================================================
  // Render: Main Content
  // ============================================================================

  // Extract distribution counts for summaries
  const styleCount = distributions.styleDistribution.labels.filter((l) => !l.includes('No ')).length;
  const brandCount = distributions.brandDistribution.labels.filter((l) => !l.includes('No ')).length;
  const mostCommonTag = distributions.tagDistribution.labels[0]?.includes('No ')
    ? null
    : distributions.tagDistribution.labels[0];
  const venueCount = distributions.venueTypeDistribution.labels.filter((l) => !l.includes('No ')).length;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#2280b0']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Distribution Analysis</Text>
          <Text style={styles.headerSubtitle}>
            {distributions.metadata.ciderCount} ciders • {distributions.metadata.experienceCount} experiences
          </Text>
        </View>

        {/* Rating Distribution Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={24} color="#FFD700" />
            <Text style={styles.sectionTitle}>Rating Distribution</Text>
          </View>
          <DistributionChart
            distribution={distributions.ratingDistribution}
            title="How you rate ciders"
            chartType="bar"
            color="#FFD700"
            showAverage={true}
            isLoading={false}
          />
          {ratingStats && (
            <StatSummaryCard
              title="Rating Statistics"
              stats={ratingStats}
              icon="star"
              color="#FFD700"
              format="rating"
            />
          )}
          <Text style={styles.summaryText}>{getRatingSummary(ratingStats)}</Text>
        </View>

        {/* ABV Distribution Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flask" size={24} color="#36A2EB" />
            <Text style={styles.sectionTitle}>ABV Distribution</Text>
          </View>
          <DistributionChart
            distribution={distributions.abvDistribution}
            title="Alcohol by volume ranges"
            chartType="bar"
            color="#36A2EB"
            showAverage={true}
            isLoading={false}
          />
          {abvStats && (
            <StatSummaryCard
              title="ABV Statistics"
              stats={abvStats}
              icon="flask"
              color="#36A2EB"
              format="percentage"
            />
          )}
          <Text style={styles.summaryText}>{getAbvSummary(abvStats)}</Text>
        </View>

        {/* Style Breakdown Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="color-palette" size={24} color="#FFCE56" />
            <Text style={styles.sectionTitle}>Style Breakdown</Text>
          </View>
          <DistributionChart
            distribution={distributions.styleDistribution}
            title="Cider styles you've tried"
            chartType="bar"
            color="#FFCE56"
            showAverage={false}
            isLoading={false}
          />
          <Text style={styles.summaryText}>{getStyleSummary(styleCount)}</Text>
        </View>

        {/* Top Brands Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business" size={24} color="#4BC0C0" />
            <Text style={styles.sectionTitle}>Top Brands</Text>
          </View>
          <DistributionChart
            distribution={distributions.brandDistribution}
            title="Your favorite brands"
            chartType="bar"
            color="#4BC0C0"
            showAverage={false}
            isLoading={false}
          />
          <Text style={styles.summaryText}>{getBrandSummary(brandCount)}</Text>
        </View>

        {/* Taste Tags Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="pricetag" size={24} color="#9966FF" />
            <Text style={styles.sectionTitle}>Taste Tags</Text>
          </View>
          <DistributionChart
            distribution={distributions.tagDistribution}
            title="Most common flavors"
            chartType="bar"
            color="#9966FF"
            showAverage={false}
            isLoading={false}
          />
          <Text style={styles.summaryText}>{getTagSummary(mostCommonTag)}</Text>
        </View>

        {/* Price Distribution Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash" size={24} color="#FF9F40" />
            <Text style={styles.sectionTitle}>Price Distribution</Text>
          </View>
          <DistributionChart
            distribution={distributions.priceDistribution}
            title="Price per pint ranges"
            chartType="bar"
            color="#FF9F40"
            showAverage={true}
            isLoading={false}
          />
          {priceStats && (
            <StatSummaryCard
              title="Price Statistics"
              stats={priceStats}
              icon="cash"
              color="#FF9F40"
              format="currency"
            />
          )}
          <Text style={styles.summaryText}>{getPriceSummary(priceStats)}</Text>
        </View>

        {/* Venue Types Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={24} color="#FF6384" />
            <Text style={styles.sectionTitle}>Venue Types</Text>
          </View>
          <DistributionChart
            distribution={distributions.venueTypeDistribution}
            title="Where you drink cider"
            chartType="bar"
            color="#FF6384"
            showAverage={false}
            isLoading={false}
          />
          <Text style={styles.summaryText}>{getVenueSummary(venueCount)}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Pull down to refresh</Text>
          {distributions.metadata.cached && (
            <View style={styles.cacheIndicator}>
              <Ionicons name="flash" size={12} color="#10b981" />
              <Text style={styles.cacheText}>Cached data</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // Header
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  summaryText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    marginLeft: 4,
    fontStyle: 'italic',
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2280b0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  cacheIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cacheText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '500',
  },
});
