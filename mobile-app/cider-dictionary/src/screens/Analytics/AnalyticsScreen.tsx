import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootTabScreenProps } from '../../types/navigation';
import { BasicAnalytics } from '../../types/cider';
import SafeAreaContainer from '../../components/common/SafeAreaContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { sqliteService } from '../../services/database/sqlite';

type Props = RootTabScreenProps<'Analytics'>;

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  color: string;
}

function StatCard({ icon, title, value, color }: StatCardProps) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

export default function AnalyticsScreen({ navigation }: Props) {
  const [analytics, setAnalytics] = useState<BasicAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAnalytics = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }

      // Initialize database if needed
      await sqliteService.initializeDatabase();

      // Load analytics data
      const analyticsData = await sqliteService.getBasicAnalytics();
      setAnalytics(analyticsData);

      console.log('Analytics loaded:', analyticsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Load analytics when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadAnalytics();
    }, [])
  );

  // Initial load
  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAnalytics(false);
  };

  if (isLoading) {
    return (
      <SafeAreaContainer>
        <LoadingSpinner message="Calculating your cider statistics..." />
      </SafeAreaContainer>
    );
  }

  if (!analytics || analytics.totalCiders === 0) {
    return (
      <SafeAreaContainer>
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
            <Text style={styles.emptyTitle}>No Statistics Yet</Text>
            <Text style={styles.emptySubtitle}>
              Add some ciders to your collection to see your personalized analytics.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaContainer>
    );
  }

  return (
    <SafeAreaContainer>
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Collection Overview</Text>

          <StatCard
            icon="library-outline"
            title="Total Ciders"
            value={analytics.totalCiders.toString()}
            color="#007AFF"
          />

          <StatCard
            icon="star"
            title="Average Rating"
            value={`${analytics.averageRating}/10`}
            color="#FFD700"
          />

          <StatCard
            icon="wine-outline"
            title="Average ABV"
            value={`${analytics.averageAbv}%`}
            color="#FF6B6B"
          />
        </View>

        {analytics.highestRated && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Performer</Text>

            <View style={styles.ciderHighlight}>
              <View style={styles.highlightHeader}>
                <Ionicons name="trophy" size={24} color="#FFD700" />
                <Text style={styles.highlightTitle}>Highest Rated</Text>
              </View>

              <Text style={styles.highlightCiderName}>
                {analytics.highestRated.name}
              </Text>
              <Text style={styles.highlightCiderBrand}>
                by {analytics.highestRated.brand}
              </Text>

              <View style={styles.highlightStats}>
                <View style={styles.highlightStat}>
                  <Text style={styles.highlightStatValue}>
                    {analytics.highestRated.overallRating}/10
                  </Text>
                  <Text style={styles.highlightStatLabel}>Rating</Text>
                </View>

                <View style={styles.highlightStat}>
                  <Text style={styles.highlightStatValue}>
                    {analytics.highestRated.abv}%
                  </Text>
                  <Text style={styles.highlightStatLabel}>ABV</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {analytics.lowestRated && analytics.lowestRated.id !== analytics.highestRated?.id && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Room for Improvement</Text>

            <View style={styles.ciderHighlight}>
              <View style={styles.highlightHeader}>
                <Ionicons name="trending-down" size={24} color="#FF6B6B" />
                <Text style={styles.highlightTitle}>Lowest Rated</Text>
              </View>

              <Text style={styles.highlightCiderName}>
                {analytics.lowestRated.name}
              </Text>
              <Text style={styles.highlightCiderBrand}>
                by {analytics.lowestRated.brand}
              </Text>

              <View style={styles.highlightStats}>
                <View style={styles.highlightStat}>
                  <Text style={styles.highlightStatValue}>
                    {analytics.lowestRated.overallRating}/10
                  </Text>
                  <Text style={styles.highlightStatLabel}>Rating</Text>
                </View>

                <View style={styles.highlightStat}>
                  <Text style={styles.highlightStatValue}>
                    {analytics.lowestRated.abv}%
                  </Text>
                  <Text style={styles.highlightStatLabel}>ABV</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.footer}>
          Pull down to refresh • Enhanced Phase 2 analytics!
        </Text>
      </ScrollView>
    </SafeAreaContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 32,
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
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginLeft: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 36,
  },
  ciderHighlight: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  highlightCiderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  highlightCiderBrand: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  highlightStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  highlightStat: {
    alignItems: 'center',
  },
  highlightStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  highlightStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  footer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});