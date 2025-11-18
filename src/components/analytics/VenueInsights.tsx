/**
 * Venue Insights Component
 *
 * Displays comprehensive venue analytics insights including:
 * - Most visited venues with rankings
 * - Venue type distribution chart
 * - Average ratings by venue
 * - Geographic statistics
 *
 * @module VenueInsights
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { VenueInsights as VenueInsightsType } from '../../types/analytics';

// ============================================================================
// Type Definitions
// ============================================================================

export interface VenueInsightsProps {
  /** Venue insights data */
  insights: VenueInsightsType | null;
  /** Loading state indicator */
  isLoading?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const VENUE_TYPE_ICONS: Record<string, string> = {
  bar: '🍺',
  pub: '🍻',
  restaurant: '🍽️',
  home: '🏠',
  brewery: '🏭',
  festival: '🎪',
  taproom: '🚰',
  other: '📍',
};

const VENUE_TYPE_COLORS: Record<string, string> = {
  bar: '#FF6B35',
  pub: '#F7931E',
  restaurant: '#4ECDC4',
  home: '#95E1D3',
  brewery: '#C44569',
  festival: '#F38181',
  taproom: '#AA96DA',
  other: '#FCBAD3',
};

// ============================================================================
// Component
// ============================================================================

/**
 * VenueInsights Component
 * Renders venue analytics insights with charts and statistics
 */
export const VenueInsights: React.FC<VenueInsightsProps> = ({
  insights,
  isLoading = false,
}) => {
  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading venue insights...</Text>
        </View>
      </View>
    );
  }

  /**
   * Render empty state
   */
  if (!insights || insights.totalVisits === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>No Venue Data</Text>
          <Text style={styles.emptyMessage}>
            Start logging experiences at different venues to see insights
          </Text>
        </View>
      </View>
    );
  }

  /**
   * Get icon for venue type
   */
  const getVenueIcon = (type: string): string => {
    return VENUE_TYPE_ICONS[type] || VENUE_TYPE_ICONS.other;
  };

  /**
   * Get color for venue type
   */
  const getVenueColor = (type: string): string => {
    return VENUE_TYPE_COLORS[type] || VENUE_TYPE_COLORS.other;
  };

  /**
   * Render statistics cards
   */
  const renderStatsCards = () => {
    return (
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{insights.totalUniqueVenues}</Text>
          <Text style={styles.statLabel}>Unique Venues</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{insights.totalVisits}</Text>
          <Text style={styles.statLabel}>Total Visits</Text>
        </View>
        {insights.mostVisited.length > 0 && (
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {insights.mostVisited[0].visitCount}
            </Text>
            <Text style={styles.statLabel}>Most Visits</Text>
          </View>
        )}
      </View>
    );
  };

  /**
   * Render most visited venues
   */
  const renderMostVisited = () => {
    if (insights.mostVisited.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Most Visited Venues</Text>
        {insights.mostVisited.map((venue, index) => (
          <View key={`${venue.venueName}-${index}`} style={styles.venueItem}>
            <View style={styles.venueRank}>
              <Text style={styles.rankNumber}>{index + 1}</Text>
            </View>
            <View style={styles.venueInfo}>
              <View style={styles.venueHeader}>
                <Text style={styles.venueName} numberOfLines={1}>
                  {venue.venueName}
                </Text>
                <Text style={styles.venueType}>
                  {getVenueIcon(venue.venueType)}
                </Text>
              </View>
              <View style={styles.venueStats}>
                <Text style={styles.visitCount}>
                  {venue.visitCount} visit{venue.visitCount !== 1 ? 's' : ''}
                </Text>
                <Text style={styles.percentage}>
                  {venue.percentage.toFixed(1)}%
                </Text>
                {venue.averageRating && (
                  <Text style={styles.rating}>
                    ⭐ {venue.averageRating.toFixed(1)}
                  </Text>
                )}
              </View>
            </View>
            <View
              style={[
                styles.progressBar,
                { width: `${venue.percentage}%` },
              ]}
            />
          </View>
        ))}
      </View>
    );
  };

  /**
   * Render venue types distribution
   */
  const renderVenueTypes = () => {
    if (insights.venueTypes.size === 0) {
      return null;
    }

    // Convert Map to sorted array
    const typeArray = Array.from(insights.venueTypes.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / insights.totalVisits) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    const maxCount = Math.max(...typeArray.map(t => t.count));

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Venue Types</Text>
        <View style={styles.typesGrid}>
          {typeArray.map(({ type, count, percentage }) => (
            <View key={type} style={styles.typeCard}>
              <View
                style={[
                  styles.typeIcon,
                  { backgroundColor: getVenueColor(type) },
                ]}
              >
                <Text style={styles.typeEmoji}>{getVenueIcon(type)}</Text>
              </View>
              <View style={styles.typeInfo}>
                <Text style={styles.typeName}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
                <Text style={styles.typeCount}>{count} visits</Text>
                <View style={styles.typeBarContainer}>
                  <View
                    style={[
                      styles.typeBar,
                      {
                        width: `${(count / maxCount) * 100}%`,
                        backgroundColor: getVenueColor(type),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.typePercentage}>
                  {percentage.toFixed(1)}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  /**
   * Render top rated venues
   */
  const renderTopRated = () => {
    if (insights.averageRatings.size === 0) {
      return null;
    }

    // Convert Map to sorted array (top 5 by rating)
    const ratedVenues = Array.from(insights.averageRatings.entries())
      .map(([venueName, rating]) => ({
        venueName,
        rating,
      }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);

    if (ratedVenues.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Rated Venues</Text>
        {ratedVenues.map((venue, index) => (
          <View key={`${venue.venueName}-${index}`} style={styles.ratedVenueItem}>
            <Text style={styles.ratedVenueName} numberOfLines={1}>
              {venue.venueName}
            </Text>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingStars}>
                {'⭐'.repeat(Math.round(venue.rating))}
              </Text>
              <Text style={styles.ratingValue}>{venue.rating.toFixed(1)}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  /**
   * Main render
   */
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {renderStatsCards()}
      {renderMostVisited()}
      {renderVenueTypes()}
      {renderTopRated()}
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
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
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
    fontSize: 18,
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  venueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  venueRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  venueInfo: {
    flex: 1,
  },
  venueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  venueName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  venueType: {
    fontSize: 16,
  },
  venueStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  visitCount: {
    fontSize: 13,
    color: '#666',
  },
  percentage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B35',
  },
  rating: {
    fontSize: 13,
    color: '#666',
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 12,
  },
  typesGrid: {
    gap: 12,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  typeEmoji: {
    fontSize: 24,
  },
  typeInfo: {
    flex: 1,
  },
  typeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  typeCount: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  typeBarContainer: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 4,
  },
  typeBar: {
    height: '100%',
    borderRadius: 2,
  },
  typePercentage: {
    fontSize: 11,
    color: '#999',
  },
  ratedVenueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  ratedVenueName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginRight: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingStars: {
    fontSize: 12,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
});

export default VenueInsights;
