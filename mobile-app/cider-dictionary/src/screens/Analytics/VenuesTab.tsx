/**
 * Venues Tab Screen
 *
 * Displays comprehensive venue analytics including:
 * - Interactive heat map with clustered venue locations
 * - Most visited venues ranking
 * - Venue type distribution
 * - Average ratings by venue
 * - Geographic insights
 *
 * Features:
 * - Interactive map visualization
 * - Pull-to-refresh
 * - Loading states
 * - Empty states
 * - Error handling with retry
 *
 * @module VenuesTab
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VenueHeatMap } from '../../components/analytics/VenueHeatMap';
import { VenueInsights } from '../../components/analytics/VenueInsights';
import { VenueAnalyzer } from '../../services/analytics/VenueAnalyzer';
import { HeatMapData, VenueInsights as VenueInsightsType } from '../../types/analytics';
import { ExperienceLog } from '../../types/experience';

// ============================================================================
// Type Definitions
// ============================================================================

interface VenuesTabProps {
  /** Array of experience logs to analyze */
  experiences: ExperienceLog[];
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * VenuesTab Component
 * Displays venue analytics with heat map and insights
 */
export const VenuesTab: React.FC<VenuesTabProps> = ({ experiences }) => {
  const [heatMapData, setHeatMapData] = useState<HeatMapData | null>(null);
  const [insights, setInsights] = useState<VenueInsightsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVenues, setSelectedVenues] = useState<string[]>([]);

  /**
   * Load venue analytics data
   */
  const loadVenueAnalytics = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setIsLoading(true);
        }
        setError(null);

        const startTime = performance.now();

        // Get analyzer instance
        const analyzer = VenueAnalyzer.getInstance();

        // Generate heat map and insights in parallel
        const [heatMap, venueInsights] = await Promise.all([
          analyzer.generateVenueHeatMap(experiences),
          analyzer.calculateVenueInsights(experiences),
        ]);

        setHeatMapData(heatMap);
        setInsights(venueInsights);

        const duration = performance.now() - startTime;
        console.log(`[VenuesTab] Analytics loaded in ${duration.toFixed(2)}ms`);

        if (duration > 500) {
          console.warn('[VenuesTab] Performance target exceeded (>500ms)');
        }
      } catch (err) {
        console.error('[VenuesTab] Error loading venue analytics:', err);
        setError('Failed to load venue analytics. Please try again.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [experiences]
  );

  /**
   * Load data on mount and when experiences change
   */
  useEffect(() => {
    loadVenueAnalytics();
  }, [loadVenueAnalytics]);

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadVenueAnalytics(false);
  }, [loadVenueAnalytics]);

  /**
   * Handle venue selection from map
   */
  const handleVenueSelect = useCallback((venueNames: string[]) => {
    setSelectedVenues(venueNames);
    if (venueNames.length === 1) {
      Alert.alert('Venue Selected', venueNames[0]);
    } else {
      Alert.alert(
        'Venues Nearby',
        venueNames.join('\n'),
        [{ text: 'OK' }]
      );
    }
  }, []);

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    loadVenueAnalytics();
  }, [loadVenueAnalytics]);

  /**
   * Render error state
   */
  const renderError = () => {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF6B35" />
        <Text style={styles.errorTitle}>Unable to Load Venues</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  /**
   * Render empty state (no experiences)
   */
  const renderEmpty = () => {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📍</Text>
        <Text style={styles.emptyTitle}>No Venue Data</Text>
        <Text style={styles.emptyMessage}>
          Start logging experiences with venue locations to see your venue map and insights
        </Text>
      </View>
    );
  };

  /**
   * Render header with statistics
   */
  const renderHeader = () => {
    if (!insights) return null;

    return (
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="map" size={32} color="#FF6B35" />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Venue Analytics</Text>
            <Text style={styles.headerSubtitle}>
              {insights.totalUniqueVenues} unique venue{insights.totalUniqueVenues !== 1 ? 's' : ''} •{' '}
              {insights.totalVisits} visit{insights.totalVisits !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  /**
   * Render section header
   */
  const renderSectionHeader = (
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    subtitle?: string
  ) => {
    return (
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Ionicons name={icon} size={24} color="#FF6B35" />
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {subtitle && (
              <Text style={styles.sectionSubtitle}>{subtitle}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  /**
   * Main render
   */
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="map" size={64} color="#FF6B35" />
        <Text style={styles.loadingText}>Loading venue analytics...</Text>
      </View>
    );
  }

  if (error) {
    return renderError();
  }

  if (experiences.length === 0) {
    return renderEmpty();
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={['#FF6B35']}
          tintColor="#FF6B35"
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {renderHeader()}

      {/* Heat Map Section */}
      <View style={styles.section}>
        {renderSectionHeader(
          'map-outline',
          'Venue Heat Map',
          'Clustered venue locations'
        )}
        <View style={styles.mapContainer}>
          <VenueHeatMap
            heatMapData={heatMapData}
            onVenueSelect={handleVenueSelect}
            isLoading={false}
          />
        </View>
        {heatMapData && heatMapData.points.length > 0 && (
          <Text style={styles.mapNote}>
            Tap markers to see venue details. Nearby venues are clustered within{' '}
            {heatMapData.metadata.clusterRadius}m radius.
          </Text>
        )}
      </View>

      {/* Insights Section */}
      <View style={styles.section}>
        {renderSectionHeader(
          'analytics',
          'Venue Insights',
          'Visitation patterns and statistics'
        )}
        <VenueInsights insights={insights} isLoading={false} />
      </View>

      {/* Additional Info */}
      {insights && insights.totalUniqueVenues > 0 && (
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#FF6B35" />
          <Text style={styles.infoText}>
            You've visited {insights.totalUniqueVenues} different venue
            {insights.totalUniqueVenues !== 1 ? 's' : ''} across{' '}
            {insights.venueTypes.size} venue type
            {insights.venueTypes.size !== 1 ? 's' : ''}. Keep exploring!
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  mapContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default VenuesTab;
