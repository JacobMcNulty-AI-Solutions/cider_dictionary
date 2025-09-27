// Experience History Screen
// Shows all logged experiences with filtering, sorting, and details

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { ExperienceLog } from '../../types/experience';
import { CiderMasterRecord } from '../../types/cider';
import { RootStackParamList } from '../../types/navigation';

import SafeAreaContainer from '../../components/common/SafeAreaContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';

import { sqliteService } from '../../services/database/sqlite';

type ExperienceHistoryNavigationProp = StackNavigationProp<RootStackParamList, 'ExperienceHistory'>;

interface ExperienceWithCider extends ExperienceLog {
  cider?: CiderMasterRecord;
}

type SortOption = 'date' | 'price' | 'rating' | 'cider';
type FilterOption = 'all' | 'thisWeek' | 'thisMonth' | 'thisYear';

export default function ExperienceHistoryScreen() {
  const navigation = useNavigation<ExperienceHistoryNavigationProp>();

  // State
  const [experiences, setExperiences] = useState<ExperienceWithCider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

  // Load experiences
  const loadExperiences = useCallback(async () => {
    try {
      setIsLoading(true);

      // Get all experiences
      const allExperiences = await sqliteService.getAllExperiences();

      // Get cider details for each experience
      const experiencesWithCiders: ExperienceWithCider[] = await Promise.all(
        allExperiences.map(async (experience) => {
          try {
            const cider = await sqliteService.getCiderById(experience.ciderId);
            return { ...experience, cider: cider || undefined };
          } catch (error) {
            console.warn(`Failed to load cider for experience ${experience.id}:`, error);
            return experience;
          }
        })
      );

      setExperiences(experiencesWithCiders);
    } catch (error) {
      console.error('Failed to load experiences:', error);
      Alert.alert('Error', 'Failed to load experience history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadExperiences();
    setIsRefreshing(false);
  }, [loadExperiences]);

  // Load data when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadExperiences();
    }, [loadExperiences])
  );

  // Filter experiences based on date
  const filteredExperiences = useMemo(() => {
    const now = new Date();

    return experiences.filter(experience => {
      switch (filterBy) {
        case 'thisWeek':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return experience.date >= weekAgo;
        case 'thisMonth':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          return experience.date >= monthStart;
        case 'thisYear':
          const yearStart = new Date(now.getFullYear(), 0, 1);
          return experience.date >= yearStart;
        default:
          return true;
      }
    });
  }, [experiences, filterBy]);

  // Sort experiences
  const sortedExperiences = useMemo(() => {
    return [...filteredExperiences].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.date.getTime() - a.date.getTime();
        case 'price':
          return b.pricePerMl - a.pricePerMl;
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'cider':
          const aName = a.cider?.name || '';
          const bName = b.cider?.name || '';
          return aName.localeCompare(bName);
        default:
          return 0;
      }
    });
  }, [filteredExperiences, sortBy]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (filteredExperiences.length === 0) {
      return {
        totalExperiences: 0,
        totalSpent: 0,
        averagePrice: 0,
        averageRating: 0,
        uniqueCiders: 0
      };
    }

    const totalSpent = filteredExperiences.reduce((sum, exp) => sum + exp.price, 0);
    const ratedExperiences = filteredExperiences.filter(exp => exp.rating !== undefined);
    const averageRating = ratedExperiences.length > 0
      ? ratedExperiences.reduce((sum, exp) => sum + (exp.rating || 0), 0) / ratedExperiences.length
      : 0;
    const uniqueCiderIds = new Set(filteredExperiences.map(exp => exp.ciderId));

    return {
      totalExperiences: filteredExperiences.length,
      totalSpent,
      averagePrice: totalSpent / filteredExperiences.length,
      averageRating,
      uniqueCiders: uniqueCiderIds.size
    };
  }, [filteredExperiences]);

  // Render experience item
  const renderExperience = ({ item }: { item: ExperienceWithCider }) => (
    <TouchableOpacity
      style={styles.experienceCard}
      onPress={() => {
        if (item.cider) {
          navigation.navigate('CiderDetail', { ciderId: item.cider.id });
        }
      }}
    >
      <View style={styles.experienceHeader}>
        <View style={styles.experienceInfo}>
          <Text style={styles.ciderName}>{item.cider?.name || 'Unknown Cider'}</Text>
          <Text style={styles.ciderBrand}>{item.cider?.brand || 'Unknown Brand'}</Text>
        </View>
        <View style={styles.experienceRating}>
          {item.rating && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>{item.rating}/10</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.experienceDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.detailText}>
            {typeof item.venue === 'string' ? item.venue : item.venue.name}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.detailText}>
            {item.date.toLocaleDateString()} at {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={16} color="#666" />
          <Text style={styles.detailText}>
            £{item.price.toFixed(2)} ({item.containerSize}ml) • £{item.pricePerMl.toFixed(3)}/ml
          </Text>
        </View>

        {item.notes && (
          <View style={styles.detailRow}>
            <Ionicons name="document-text-outline" size={16} color="#666" />
            <Text style={styles.detailText} numberOfLines={2}>
              {item.notes}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaContainer>
        <LoadingSpinner message="Loading experience history..." />
      </SafeAreaContainer>
    );
  }

  return (
    <SafeAreaContainer>
      <View style={styles.container}>
        {/* Summary Stats */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summaryStats.totalExperiences}</Text>
              <Text style={styles.summaryLabel}>Experiences</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>£{summaryStats.totalSpent.toFixed(2)}</Text>
              <Text style={styles.summaryLabel}>Total Spent</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summaryStats.averageRating.toFixed(1)}</Text>
              <Text style={styles.summaryLabel}>Avg Rating</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summaryStats.uniqueCiders}</Text>
              <Text style={styles.summaryLabel}>Unique Ciders</Text>
            </View>
          </View>
        </View>

        {/* Filter and Sort Controls */}
        <View style={styles.controlsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
            <Text style={styles.controlLabel}>Filter:</Text>
            {(['all', 'thisWeek', 'thisMonth', 'thisYear'] as FilterOption[]).map(filter => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterButton, filterBy === filter && styles.activeFilterButton]}
                onPress={() => setFilterBy(filter)}
              >
                <Text style={[styles.filterText, filterBy === filter && styles.activeFilterText]}>
                  {filter === 'all' ? 'All' :
                   filter === 'thisWeek' ? 'This Week' :
                   filter === 'thisMonth' ? 'This Month' : 'This Year'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
            <Text style={styles.controlLabel}>Sort:</Text>
            {(['date', 'price', 'rating', 'cider'] as SortOption[]).map(sort => (
              <TouchableOpacity
                key={sort}
                style={[styles.filterButton, sortBy === sort && styles.activeFilterButton]}
                onPress={() => setSortBy(sort)}
              >
                <Text style={[styles.filterText, sortBy === sort && styles.activeFilterText]}>
                  {sort === 'date' ? 'Date' :
                   sort === 'price' ? 'Price/ml' :
                   sort === 'rating' ? 'Rating' : 'Cider'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Experience List */}
        {sortedExperiences.length > 0 ? (
          <FlatList
            data={sortedExperiences}
            renderItem={renderExperience}
            keyExtractor={item => item.id}
            style={styles.experiencesList}
            contentContainerStyle={styles.experiencesContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={['#FF9500']}
                tintColor="#FF9500"
              />
            }
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="wine-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Experiences Found</Text>
            <Text style={styles.emptyText}>
              {filterBy === 'all'
                ? 'Start logging your cider experiences to see them here!'
                : 'No experiences found for the selected time period.'}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9500',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  controlsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filtersRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 12,
    alignSelf: 'center',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: '#FF9500',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '500',
  },
  experiencesList: {
    flex: 1,
  },
  experiencesContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  experienceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  experienceInfo: {
    flex: 1,
  },
  ciderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  ciderBrand: {
    fontSize: 14,
    color: '#666',
  },
  experienceRating: {
    alignItems: 'flex-end',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F57C00',
    marginLeft: 4,
  },
  experienceDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
  },
});