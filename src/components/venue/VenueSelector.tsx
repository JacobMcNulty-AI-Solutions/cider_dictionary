// Venue Selector Component
// Allows users to select existing venues or create new ones with location data

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { VenueInfo, Location } from '../../types/experience';
import { VenueType } from '../../types/cider';
import { venueService, VenueSearchResult } from '../../services/venue/VenueService';
import LocationPicker from '../maps/LocationPicker';

interface VenueSelectorProps {
  selectedVenue?: VenueInfo | null;
  currentLocation?: Location | null;
  onVenueSelect: (venue: VenueInfo) => void;
  onLocationUpdate?: (location: Location) => void;
}

const { width } = Dimensions.get('window');

const VenueSelector: React.FC<VenueSelectorProps> = ({
  selectedVenue,
  currentLocation,
  onVenueSelect,
  onLocationUpdate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [venues, setVenues] = useState<VenueSearchResult[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // New venue creation state
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueType, setNewVenueType] = useState<VenueType>('pub');
  const [newVenueLocation, setNewVenueLocation] = useState<Location | null>(currentLocation);

  // Load venues on mount and when search query changes
  useEffect(() => {
    loadVenues();
  }, [currentLocation]);

  useEffect(() => {
    if (searchQuery.length >= 1) {
      searchVenues();
    } else {
      loadVenues();
    }
  }, [searchQuery]);

  const loadVenues = useCallback(async () => {
    try {
      setIsLoading(true);
      let venueResults: VenueSearchResult[];

      if (currentLocation) {
        // Get nearby venues first
        venueResults = await venueService.getVenuesNearLocation(currentLocation, 10);

        // If no nearby venues, get all venues
        if (venueResults.length === 0) {
          const allVenues = await venueService.getAllVenues();
          venueResults = allVenues.map(venue => ({
            ...venue,
            distance: currentLocation && venue.location
              ? calculateDistance(currentLocation, venue.location)
              : undefined
          }));
        }
      } else {
        const allVenues = await venueService.getAllVenues();
        venueResults = allVenues;
      }

      setVenues(venueResults);
    } catch (error) {
      console.error('Failed to load venues:', error);
      setVenues([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation]);

  const searchVenues = useCallback(async () => {
    try {
      setIsLoading(true);
      const results = await venueService.searchVenues(searchQuery, currentLocation, 20);
      setVenues(results);
    } catch (error) {
      console.error('Failed to search venues:', error);
      setVenues([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, currentLocation]);

  const handleVenuePress = (venue: VenueSearchResult) => {
    onVenueSelect(venue);
    setIsModalVisible(false);
  };

  const handleCreateNewVenue = () => {
    setIsCreatingNew(true);
    setNewVenueName(searchQuery);
    setNewVenueLocation(currentLocation);
  };

  const handleSaveNewVenue = async () => {
    if (!newVenueName.trim()) {
      Alert.alert('Error', 'Please enter a venue name');
      return;
    }

    if (!newVenueLocation) {
      Alert.alert('Error', 'Please set a location for the venue');
      return;
    }

    try {
      setIsLoading(true);
      const newVenue = await venueService.createVenue({
        name: newVenueName.trim(),
        type: newVenueType,
        location: newVenueLocation
      });

      onVenueSelect(newVenue);
      setIsModalVisible(false);
      setIsCreatingNew(false);
      setNewVenueName('');
      setSearchQuery('');

      // Reload venues to include the new one
      await loadVenues();
    } catch (error) {
      console.error('Failed to create venue:', error);
      Alert.alert('Error', 'Failed to create venue. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelCreate = () => {
    setIsCreatingNew(false);
    setNewVenueName('');
    setNewVenueLocation(currentLocation);
  };

  const formatDistance = (distanceInMeters: number): string => {
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)}m`;
    } else {
      return `${(distanceInMeters / 1000).toFixed(1)}km`;
    }
  };

  const calculateDistance = (loc1: Location, loc2: Location): number => {
    const R = 6371000; // Earth's radius in meters
    const φ1 = loc1.latitude * Math.PI / 180;
    const φ2 = loc2.latitude * Math.PI / 180;
    const Δφ = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const Δλ = (loc2.longitude - loc1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const venueTypes: { value: VenueType; label: string; icon: string }[] = [
    { value: 'pub', label: 'Pub', icon: 'beer-outline' },
    { value: 'restaurant', label: 'Restaurant', icon: 'restaurant-outline' },
    { value: 'retail', label: 'Shop', icon: 'storefront-outline' },
    { value: 'festival', label: 'Festival', icon: 'musical-notes-outline' },
    { value: 'cidery', label: 'Cidery', icon: 'business-outline' },
    { value: 'home', label: 'Home', icon: 'home-outline' },
    { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' }
  ];

  const renderVenueItem = ({ item }: { item: VenueSearchResult }) => (
    <TouchableOpacity
      style={styles.venueItem}
      onPress={() => handleVenuePress(item)}
    >
      <View style={styles.venueInfo}>
        <View style={styles.venueHeader}>
          <Text style={styles.venueName}>{item.name}</Text>
          <View style={styles.venueType}>
            <Ionicons
              name={venueTypes.find(t => t.value === item.type)?.icon as any || 'location-outline'}
              size={14}
              color="#666"
            />
            <Text style={styles.venueTypeText}>
              {venueTypes.find(t => t.value === item.type)?.label || item.type}
            </Text>
          </View>
        </View>

        {item.distance !== undefined && (
          <Text style={styles.venueDistance}>
            📍 {formatDistance(item.distance)} away
          </Text>
        )}

        {item.visitCount && (
          <Text style={styles.venueStats}>
            Visited {item.visitCount} time{item.visitCount > 1 ? 's' : ''}
          </Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setIsModalVisible(true)}
      >
        <View style={styles.selectedVenueInfo}>
          {selectedVenue ? (
            <>
              <Text style={styles.selectedVenueName}>{selectedVenue.name}</Text>
              <Text style={styles.selectedVenueType}>
                {venueTypes.find(t => t.value === selectedVenue.type)?.label || selectedVenue.type}
              </Text>
            </>
          ) : (
            <Text style={styles.placeholderText}>Select a venue</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#007AFF" />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setIsModalVisible(false);
                setIsCreatingNew(false);
                setSearchQuery('');
              }}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {isCreatingNew ? 'Create New Venue' : 'Select Venue'}
            </Text>
            <View style={styles.modalCloseButton} />
          </View>

          {isCreatingNew ? (
            <View style={styles.createVenueContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Venue Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newVenueName}
                  onChangeText={setNewVenueName}
                  placeholder="Enter venue name"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Venue Type *</Text>
                <View style={styles.venueTypeSelector}>
                  {venueTypes.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeButton,
                        newVenueType === type.value && styles.typeButtonActive
                      ]}
                      onPress={() => setNewVenueType(type.value)}
                    >
                      <Ionicons
                        name={type.icon as any}
                        size={18}
                        color={newVenueType === type.value ? '#fff' : '#666'}
                      />
                      <Text
                        style={[
                          styles.typeButtonText,
                          newVenueType === type.value && styles.typeButtonTextActive
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Location *</Text>
                <LocationPicker
                  currentLocation={currentLocation}
                  selectedLocation={newVenueLocation}
                  onLocationSelect={(location) => {
                    setNewVenueLocation(location);
                    if (onLocationUpdate) {
                      onLocationUpdate(location);
                    }
                  }}
                  height={200}
                  showConfirmButton={false}
                />
              </View>

              <View style={styles.createVenueActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelCreate}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!newVenueName.trim() || !newVenueLocation) && styles.saveButtonDisabled
                  ]}
                  onPress={handleSaveNewVenue}
                  disabled={!newVenueName.trim() || !newVenueLocation || isLoading}
                >
                  <Text style={[
                    styles.saveButtonText,
                    (!newVenueName.trim() || !newVenueLocation) && styles.saveButtonTextDisabled
                  ]}>
                    {isLoading ? 'Creating...' : 'Create Venue'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
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
              </View>

              {venues.length > 0 ? (
                <FlatList
                  data={venues}
                  renderItem={renderVenueItem}
                  keyExtractor={item => item.id}
                  style={styles.venuesList}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="location-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No venues found' : 'No venues yet'}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {searchQuery ? 'Try a different search term' : 'Create your first venue below'}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.createNewButton}
                onPress={handleCreateNewVenue}
              >
                <Ionicons name="add" size={20} color="#007AFF" />
                <Text style={styles.createNewText}>
                  {searchQuery ? `Create "${searchQuery}"` : 'Create New Venue'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    minHeight: 56,
  },
  selectedVenueInfo: {
    flex: 1,
  },
  selectedVenueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  selectedVenueType: {
    fontSize: 14,
    color: '#666',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalCloseButton: {
    minWidth: 60,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    marginRight: 8,
  },
  venuesList: {
    flex: 1,
  },
  venueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  venueInfo: {
    flex: 1,
  },
  venueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  venueType: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  venueTypeText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  venueDistance: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
  },
  venueStats: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  createNewText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  createVenueContainer: {
    flex: 1,
    padding: 16,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  venueTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  createVenueActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#999',
  },
});

export default VenueSelector;