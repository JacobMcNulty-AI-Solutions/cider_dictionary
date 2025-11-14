/**
 * Overview Tab Screen
 *
 * Enhanced version of the original Analytics screen content.
 * Displays collection stats, value analysis, venue highlights, and quick insights.
 *
 * Features:
 * - Collection overview stats
 * - Value analysis highlights
 * - Venue highlights
 * - Monthly activity trend
 * - Rating distribution
 * - Pull-to-refresh
 * - Loading states
 * - Empty states
 *
 * @module OverviewTab
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { analyticsService, AnalyticsData, TimeRange } from '../../services/analytics/AnalyticsService';

// ============================================================================
// Type Definitions
// ============================================================================

interface OverviewTabProps {
  timeRange: TimeRange;
}

const { width: screenWidth } = Dimensions.get('window');

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  color: string;
  subtitle?: string;
}

// ============================================================================
// Components
// ============================================================================

/**
 * Stat Card Component
 */
function StatCard({ icon, title, value, color, subtitle }: StatCardProps) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <View style={styles.statTextContainer}>
          <Text style={styles.statTitle}>{title}</Text>
          {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * OverviewTab Screen Component
 *
 * @example
 * <OverviewTab timeRange="3M" />
 */
export default function OverviewTab({ timeRange }: OverviewTabProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAnalytics = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setIsLoading(true);
        }

        const startTime = Date.now();

        // Load enhanced analytics data
        const analyticsData = await analyticsService.calculateAnalytics(timeRange);
        setAnalytics(analyticsData);

        const loadTime = Date.now() - startTime;
        console.log(`[OverviewTab] Analytics loaded in ${loadTime}ms (target: <500ms)`);
      } catch (error) {
        console.error('[OverviewTab] Failed to load analytics:', error);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [timeRange]
  );

  // Load analytics when time range changes
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAnalytics(false);
  };

  // ============================================================================
  // Render: Loading State
  // ============================================================================

  if (isLoading && !analytics) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner message="Calculating your cider analytics..." />
      </View>
    );
  }

  // ============================================================================
  // Render: Empty State
  // ============================================================================

  if (!analytics || analytics.collectionStats.totalCiders === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.emptyContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
            colors={['#007AFF']}
          />
        }
      >
        <View style={styles.emptyState}>
          <Ionicons name="analytics-outline" size={64} color="#DDD" />
          <Text style={styles.emptyTitle}>No Analytics Yet</Text>
          <Text style={styles.emptySubtitle}>
            Add some ciders and log experiences to see your personalized analytics and insights.
          </Text>
        </View>
      </ScrollView>
    );
  }

  // ============================================================================
  // Render: Main Content
  // ============================================================================

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#007AFF"
          colors={['#007AFF']}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Collection Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Collection Overview</Text>

        <View style={styles.statsGrid}>
          <StatCard
            icon="library-outline"
            title="Total Ciders"
            value={analytics.collectionStats.totalCiders.toString()}
            color="#007AFF"
          />

          <StatCard
            icon="compass-outline"
            title="Experiences"
            value={analytics.collectionStats.totalExperiences.toString()}
            color="#32D74B"
          />

          <StatCard
            icon="star"
            title="Average Rating"
            value={`${analytics.collectionStats.averageRating.toFixed(1)}/10`}
            color="#FFD700"
          />

          <StatCard
            icon="checkmark-circle"
            title="Collection Completeness"
            value={`${analytics.collectionStats.completionPercentage.toFixed(0)}%`}
            color="#AF52DE"
            subtitle="Personal diversity score"
          />
        </View>
      </View>

      {/* Value Analysis */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Value Analysis</Text>

        <StatCard
          icon="trending-down"
          title="Average Price per pint"
          value={`£${analytics.valueAnalytics.averagePricePerPint.toFixed(2)}`}
          color="#FF9500"
        />

        <StatCard
          icon="card-outline"
          title="Monthly Spending"
          value={`£${analytics.valueAnalytics.monthlySpending.toFixed(2)}`}
          color="#FF6B6B"
          subtitle="Last 30 days"
        />

        {analytics.valueAnalytics.bestValue && (
          <View style={styles.valueHighlight}>
            <View style={styles.highlightHeader}>
              <Ionicons name="trophy" size={20} color="#32D74B" />
              <Text style={styles.highlightTitle}>Best Value</Text>
            </View>
            <Text style={styles.valueText}>
              {analytics.valueAnalytics.bestValue.cider.name} at {analytics.valueAnalytics.bestValue.venue}
            </Text>
            <Text style={styles.valuePrice}>
              £{analytics.valueAnalytics.bestValue.pricePerPint.toFixed(2)}/pint
            </Text>
          </View>
        )}
      </View>

      {/* Venue Insights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Venue Insights</Text>

        <StatCard
          icon="location"
          title="Total Venues"
          value={analytics.venueAnalytics.totalVenues.toString()}
          color="#5856D6"
        />

        {analytics.venueAnalytics.mostVisited && (
          <View style={styles.venueHighlight}>
            <View style={styles.highlightHeader}>
              <Ionicons name="heart" size={20} color="#FF3B30" />
              <Text style={styles.highlightTitle}>Most Visited</Text>
            </View>
            <Text style={styles.venueText}>
              {analytics.venueAnalytics.mostVisited.venue.name}
            </Text>
            <Text style={styles.venueCount}>
              {analytics.venueAnalytics.mostVisited.visitCount} visits
            </Text>
          </View>
        )}
      </View>

      {/* Trends */}
      {analytics.trends.monthlyTrend.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trends</Text>

          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Monthly Activity</Text>
            <LineChart
              data={{
                labels: analytics.trends.monthlyTrend
                  .map((item) => item.month.substring(5)) // Show MM format
                  .slice(-6), // Last 6 months
                datasets: [
                  {
                    data: analytics.trends.monthlyTrend.map((item) => item.count).slice(-6),
                  },
                ],
              }}
              width={screenWidth - 32}
              height={200}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
              }}
              style={styles.chart}
              bezier
            />
          </View>

          {analytics.trends.ratingDistribution.some((item) => item.count > 0) ? (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Rating Distribution</Text>
              <BarChart
                data={{
                  labels: analytics.trends.ratingDistribution
                    .filter((item) => item.count > 0)
                    .map((item) => item.rating.toString()),
                  datasets: [
                    {
                      data: analytics.trends.ratingDistribution
                        .filter((item) => item.count > 0)
                        .map((item) => item.count),
                    },
                  ],
                }}
                width={screenWidth - 32}
                height={200}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(255, 215, 0, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                }}
                style={styles.chart}
              />
            </View>
          ) : (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Rating Distribution</Text>
              <View style={styles.noDataContainer}>
                <Ionicons name="bar-chart-outline" size={48} color="#DDD" />
                <Text style={styles.noDataText}>No ratings yet</Text>
                <Text style={styles.noDataSubtext}>
                  Rate your cider experiences to see distribution
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      <Text style={styles.footer}>Pull down to refresh</Text>
    </ScrollView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    gap: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  statTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  statTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 36,
    marginTop: 4,
  },
  valueHighlight: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#32D74B',
  },
  venueHighlight: {
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF3B30',
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  valueText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  valuePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#32D74B',
  },
  venueText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  venueCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 4,
    textAlign: 'center',
  },
  footer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});
