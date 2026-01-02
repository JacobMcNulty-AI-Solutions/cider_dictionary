// Venue Detail Screen
// Displays venue details, stats, and allows editing

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';

import { useVenueStore } from '../../store/venueStore';
import { venueService } from '../../services/venue/VenueService';
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

interface VenueStats {
  visitCount: number;
  lastVisited: Date | null;
  firstVisited: Date | null;
  totalSpent: number;
  averageRating: number;
}

const VenueDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const venueId = route.params?.venueId;

  const { getVenueById, updateVenue, deleteVenue } = useVenueStore();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [stats, setStats] = useState<VenueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingLocation, setIsSettingLocation] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<VenueType>('pub');
  const [editAddress, setEditAddress] = useState('');

  // Load venue data
  useFocusEffect(
    useCallback(() => {
      loadVenueData();
    }, [venueId])
  );

  const loadVenueData = async () => {
    if (!venueId) {
      navigation.goBack();
      return;
    }

    setIsLoading(true);
    try {
      // Get venue from store first, then from service for full data
      let venueData = getVenueById(venueId);
      if (!venueData) {
        venueData = await venueService.getVenueById(venueId);
      }

      if (!venueData) {
        Alert.alert('Error', 'Venue not found');
        navigation.goBack();
        return;
      }

      setVenue(venueData);
      setEditName(venueData.name);
      setEditType(venueData.type);
      setEditAddress(venueData.address || '');

      // Load stats
      const venueStats = await venueService.getVenueStats(venueId);
      setStats(venueStats);
    } catch (error) {
      console.error('Failed to load venue:', error);
      Alert.alert('Error', 'Failed to load venue details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Venue name is required');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateVenue(venueId, {
        name: editName.trim(),
        type: editType,
        address: editAddress.trim() || undefined
      });

      if (updated) {
        setVenue(updated);
        setIsEditing(false);
        Alert.alert('Success', 'Venue updated successfully');
      }
    } catch (error) {
      console.error('Failed to update venue:', error);
      Alert.alert('Error', 'Failed to update venue');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Venue',
      `Are you sure you want to delete "${venue?.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteVenue(venueId);
              navigation.goBack();
            } catch (error) {
              console.error('Failed to delete venue:', error);
              Alert.alert('Error', 'Failed to delete venue');
            }
          }
        }
      ]
    );
  };

  const handleSetCurrentLocation = async () => {
    setIsSettingLocation(true);
    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to set the venue location. Please enable it in your device settings.'
        );
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      // Update venue with location
      const updated = await updateVenue(venueId, {
        location: { latitude, longitude }
      });

      if (updated) {
        setVenue(updated);
        Alert.alert(
          'Location Set',
          `Venue location updated to:\n${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        );
      }
    } catch (error) {
      console.error('Failed to set location:', error);
      Alert.alert('Error', 'Failed to get current location. Please try again.');
    } finally {
      setIsSettingLocation(false);
    }
  };

  const formatDate = (date?: Date | null): string => {
    if (!date) return 'Never';
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const getVenueTypeIcon = (type: VenueType): string => {
    return VENUE_TYPES.find(t => t.value === type)?.icon || 'location-outline';
  };

  const getVenueTypeLabel = (type: VenueType): string => {
    return VENUE_TYPES.find(t => t.value === type)?.label || type;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading venue...</Text>
      </View>
    );
  }

  if (!venue) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ccc" />
        <Text style={styles.errorText}>Venue not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.venueIconLarge}>
          <Ionicons
            name={getVenueTypeIcon(venue.type) as any}
            size={40}
            color="#007AFF"
          />
        </View>

        {isEditing ? (
          <TextInput
            style={styles.editNameInput}
            value={editName}
            onChangeText={setEditName}
            placeholder="Venue name"
            autoFocus
          />
        ) : (
          <Text style={styles.venueName}>{venue.name}</Text>
        )}

        <Text style={styles.venueType}>
          {getVenueTypeLabel(venue.type)}
        </Text>

        {venue.address && !isEditing && (
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.addressText}>{venue.address}</Text>
          </View>
        )}
      </View>

      {/* Edit Type Selector (when editing) */}
      {isEditing && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Venue Type</Text>
          <View style={styles.typeSelector}>
            {VENUE_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeButton,
                  editType === type.value && styles.typeButtonActive
                ]}
                onPress={() => setEditType(type.value)}
              >
                <Ionicons
                  name={type.icon as any}
                  size={18}
                  color={editType === type.value ? '#fff' : '#666'}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    editType === type.value && styles.typeButtonTextActive
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Edit Address (when editing) */}
      {isEditing && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address (Optional)</Text>
          <TextInput
            style={styles.addressInput}
            value={editAddress}
            onChangeText={setEditAddress}
            placeholder="Enter address..."
            multiline
          />
        </View>
      )}

      {/* Stats Section (when not editing) */}
      {!isEditing && stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="footsteps-outline" size={24} color="#007AFF" />
              <Text style={styles.statValue}>{stats.visitCount}</Text>
              <Text style={styles.statLabel}>Visits</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="cash-outline" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>{formatCurrency(stats.totalSpent)}</Text>
              <Text style={styles.statLabel}>Total Spent</Text>
            </View>

            {stats.averageRating > 0 && (
              <View style={styles.statCard}>
                <Ionicons name="star" size={24} color="#FFC107" />
                <Text style={styles.statValue}>{stats.averageRating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Avg Rating</Text>
              </View>
            )}
          </View>

          <View style={styles.dateStats}>
            {stats.firstVisited && (
              <View style={styles.dateStat}>
                <Text style={styles.dateLabel}>First Visit</Text>
                <Text style={styles.dateValue}>{formatDate(stats.firstVisited)}</Text>
              </View>
            )}

            {stats.lastVisited && (
              <View style={styles.dateStat}>
                <Text style={styles.dateLabel}>Last Visit</Text>
                <Text style={styles.dateValue}>{formatDate(stats.lastVisited)}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Location Section (when not editing) */}
      {!isEditing && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          {venue.location ? (
            <View style={styles.locationCard}>
              <Ionicons name="navigate-outline" size={20} color="#007AFF" />
              <View style={styles.locationInfo}>
                <Text style={styles.coordinatesText}>
                  {venue.location.latitude.toFixed(6)}, {venue.location.longitude.toFixed(6)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.noLocationCard}>
              <Ionicons name="location-outline" size={24} color="#999" />
              <Text style={styles.noLocationText}>No location set</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.setLocationButton, isSettingLocation && styles.setLocationButtonDisabled]}
            onPress={handleSetCurrentLocation}
            disabled={isSettingLocation}
          >
            {isSettingLocation ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="locate-outline" size={18} color="#fff" />
            )}
            <Text style={styles.setLocationButtonText}>
              {isSettingLocation ? 'Getting Location...' : venue.location ? 'Update Location' : 'Set Current Location'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Actions Section */}
      <View style={styles.actionsSection}>
        {isEditing ? (
          <>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setIsEditing(false);
                setEditName(venue.name);
                setEditType(venue.type);
                setEditAddress(venue.address || '');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="pencil-outline" size={18} color="#007AFF" />
              <Text style={styles.editButtonText}>Edit Venue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={18} color="#FF3B30" />
              <Text style={styles.deleteButtonText}>Delete Venue</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Metadata */}
      {!isEditing && (
        <View style={styles.metadataSection}>
          <Text style={styles.metadataText}>
            Created: {formatDate(venue.createdAt)}
          </Text>
          <Text style={styles.metadataText}>
            Updated: {formatDate(venue.updatedAt)}
          </Text>
          <Text style={styles.metadataText}>
            Sync: {venue.syncStatus}
          </Text>
        </View>
      )}
    </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
  headerSection: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  venueIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e8f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  venueName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  editNameInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
    paddingBottom: 8,
    minWidth: 200,
  },
  venueType: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  typeSelector: {
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
  addressInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  dateStats: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
  },
  dateStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 14,
    color: '#666',
  },
  dateValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
  },
  locationInfo: {
    marginLeft: 12,
  },
  coordinatesText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
  noLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    justifyContent: 'center',
  },
  noLocationText: {
    fontSize: 14,
    color: '#999',
    marginLeft: 8,
  },
  setLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  setLocationButtonDisabled: {
    backgroundColor: '#aaa',
  },
  setLocationButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  actionsSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f4ff',
    paddingVertical: 14,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffe8e8',
    paddingVertical: 14,
    borderRadius: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  metadataSection: {
    padding: 16,
    marginBottom: 32,
  },
  metadataText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
});

export default VenueDetailScreen;
