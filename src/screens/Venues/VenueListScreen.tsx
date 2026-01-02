// Venue List Screen
// Displays all venues with search and filtering capabilities

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';

import { useVenueStore } from '../../store/venueStore';
import { Venue } from '../../types/venue';
import { VenueType } from '../../types/cider';

const VENUE_TYPES: { value: VenueType; label: string; icon: string }[] = [
  { value: 'pub', label: 'Pub', icon: 'beer-outline' },
  { value: 'restaurant', label: 'Restaurant', icon: 'restaurant-outline' },
  { value: 'retail', label: 'Shop', icon: 'storefront-outline' },
  { value: 'festival', label: 'Festival', icon: 'musical-notes-outline' },
  { value: 'cidery', label: 'Cidery', icon: 'business-outline' },
  { value: 'home', label: 'Home', icon: 'home-outline' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' }
];

const VenueListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    venues,
    recentVenues,
    isLoading,
    loadVenues,
    loadRecentVenues,
    loadMostVisitedVenues
  } = useVenueStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<VenueType | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Load venues on focus
  useFocusEffect(
    useCallback(() => {
      loadVenues();
      loadRecentVenues(5);
      loadMostVisitedVenues(5);
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadVenues();
    await loadRecentVenues(5);
    await loadMostVisitedVenues(5);
    setRefreshing(false);
  };

  const handleVenuePress = (venue: Venue) => {
    navigation.navigate('VenueDetail', { venueId: venue.id });
  };

  const filteredVenues = venues.filter(venue => {
    const matchesSearch = !searchQuery ||
      venue.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || venue.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getVenueTypeIcon = (type: VenueType): string => {
    return VENUE_TYPES.find(t => t.value === type)?.icon || 'location-outline';
  };

  const getVenueTypeLabel = (type: VenueType): string => {
    return VENUE_TYPES.find(t => t.value === type)?.label || type;
  };

  const formatDate = (date?: Date): string => {
    if (!date) return 'Never';
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const renderVenueItem = ({ item }: { item: Venue }) => (
    <TouchableOpacity
      style={styles.venueItem}
      onPress={() => handleVenuePress(item)}
    >
      <View style={styles.venueIcon}>
        <Ionicons
          name={getVenueTypeIcon(item.type) as any}
          size={24}
          color="#007AFF"
        />
      </View>

      <View style={styles.venueInfo}>
        <Text style={styles.venueName}>{item.name}</Text>
        <View style={styles.venueMetaRow}>
          <Text style={styles.venueType}>{getVenueTypeLabel(item.type)}</Text>
          {item.visitCount > 0 && (
            <Text style={styles.visitCount}>
              {item.visitCount} visit{item.visitCount !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
        {item.lastVisited && (
          <Text style={styles.lastVisited}>
            Last visited: {formatDate(item.lastVisited)}
          </Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search venues..."
          autoCapitalize="words"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Type Filter */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ value: 'all', label: 'All', icon: 'list-outline' }, ...VENUE_TYPES]}
        keyExtractor={item => item.value}
        contentContainerStyle={styles.typeFilterContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.typeFilterButton,
              selectedType === item.value && styles.typeFilterButtonActive
            ]}
            onPress={() => setSelectedType(item.value as VenueType | 'all')}
          >
            <Ionicons
              name={item.icon as any}
              size={16}
              color={selectedType === item.value ? '#fff' : '#666'}
            />
            <Text
              style={[
                styles.typeFilterText,
                selectedType === item.value && styles.typeFilterTextActive
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Recent Venues Section */}
      {recentVenues.length > 0 && !searchQuery && selectedType === 'all' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Venues</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={recentVenues}
            keyExtractor={item => `recent-${item.id}`}
            contentContainerStyle={styles.recentVenuesContainer}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.recentVenueCard}
                onPress={() => handleVenuePress(item)}
              >
                <View style={styles.recentVenueIcon}>
                  <Ionicons
                    name={getVenueTypeIcon(item.type) as any}
                    size={20}
                    color="#007AFF"
                  />
                </View>
                <Text style={styles.recentVenueName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.recentVenueVisits}>
                  {item.visitCount} visit{item.visitCount !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <View style={styles.listHeader}>
        <Text style={styles.listHeaderText}>
          {filteredVenues.length} venue{filteredVenues.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="location-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No venues found' : 'No venues yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? 'Try a different search term or filter'
          : 'Venues will appear here as you log experiences'
        }
      </Text>
    </View>
  );

  if (isLoading && venues.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading venues...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredVenues}
        renderItem={renderVenueItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        contentContainerStyle={filteredVenues.length === 0 ? styles.emptyList : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    marginRight: 8,
  },
  typeFilterContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  typeFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 8,
  },
  typeFilterButtonActive: {
    backgroundColor: '#007AFF',
  },
  typeFilterText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  typeFilterTextActive: {
    color: '#fff',
  },
  section: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  recentVenuesContainer: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  recentVenueCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    width: 120,
    alignItems: 'center',
  },
  recentVenueIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentVenueName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  recentVenueVisits: {
    fontSize: 12,
    color: '#666',
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  listHeaderText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  venueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  venueIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  venueMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  venueType: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  visitCount: {
    fontSize: 14,
    color: '#007AFF',
  },
  lastVisited: {
    fontSize: 12,
    color: '#999',
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default VenueListScreen;
