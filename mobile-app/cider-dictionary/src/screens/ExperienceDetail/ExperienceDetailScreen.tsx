// Experience Detail Screen
// Shows comprehensive details of a single experience including notes, exact location, photos, etc.

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { ExperienceLog } from '../../types/experience';
import { CiderMasterRecord } from '../../types/cider';
import { RootStackParamList } from '../../types/navigation';

import SafeAreaContainer from '../../components/common/SafeAreaContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';

import { sqliteService } from '../../services/database/sqlite';
import MapView, { Marker } from 'react-native-maps';

type ExperienceDetailRouteProp = RouteProp<RootStackParamList, 'ExperienceDetail'>;
type ExperienceDetailNavigationProp = StackNavigationProp<RootStackParamList, 'ExperienceDetail'>;

export default function ExperienceDetailScreen() {
  const route = useRoute<ExperienceDetailRouteProp>();
  const navigation = useNavigation<ExperienceDetailNavigationProp>();
  const { experienceId } = route.params;

  const [experience, setExperience] = useState<ExperienceLog | null>(null);
  const [cider, setCider] = useState<CiderMasterRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadExperienceDetails = async () => {
      try {
        setIsLoading(true);

        // Get all experiences and find the one we need
        const allExperiences = await sqliteService.getAllExperiences();
        const foundExperience = allExperiences.find(exp => exp.id === experienceId);

        if (!foundExperience) {
          Alert.alert('Error', 'Experience not found');
          navigation.goBack();
          return;
        }

        setExperience(foundExperience);

        // Load the cider details
        const ciderData = await sqliteService.getCiderById(foundExperience.ciderId);
        setCider(ciderData);
      } catch (error) {
        console.error('Failed to load experience details:', error);
        Alert.alert('Error', 'Failed to load experience details');
      } finally {
        setIsLoading(false);
      }
    };

    loadExperienceDetails();
  }, [experienceId, navigation]);

  const getVenueTypeLabel = (type: string): string => {
    const venueTypeLabels: Record<string, string> = {
      'pub': 'Pub',
      'restaurant': 'Restaurant',
      'retail': 'Shop',
      'festival': 'Festival',
      'cidery': 'Cidery',
      'home': 'Home',
      'other': 'Other'
    };
    return venueTypeLabels[type] || type;
  };

  const getContainerTypeLabel = (type: string, customType?: string): string => {
    const containerTypeLabels: Record<string, string> = {
      'bottle': 'Bottle',
      'can': 'Can',
      'draught': 'Draught',
      'keg': 'Keg',
      'bag_in_box': 'Bag in Box',
      'other': 'Other'
    };

    // If type is 'other' and customType is provided, return the custom type
    if (type === 'other' && customType) {
      return customType;
    }

    return containerTypeLabels[type] || type;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewCider = () => {
    if (cider) {
      navigation.navigate('CiderDetail', { ciderId: cider.id });
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Experience',
      'Are you sure you want to delete this experience? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await sqliteService.deleteExperience(experienceId);
              Alert.alert('Success', 'Experience deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack()
                }
              ]);
            } catch (error) {
              console.error('Failed to delete experience:', error);
              Alert.alert('Error', 'Failed to delete experience. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Set up header button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleDelete} style={{ marginRight: 16 }}>
          <Ionicons name="trash-outline" size={24} color="#FF3B30" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, experienceId]);

  if (isLoading) {
    return (
      <SafeAreaContainer>
        <LoadingSpinner message="Loading experience details..." />
      </SafeAreaContainer>
    );
  }

  if (!experience) {
    return (
      <SafeAreaContainer>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
          <Text style={styles.errorTitle}>Experience Not Found</Text>
          <Text style={styles.errorText}>This experience could not be loaded.</Text>
        </View>
      </SafeAreaContainer>
    );
  }

  return (
    <SafeAreaContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Cider Reference */}
        <TouchableOpacity style={styles.ciderCard} onPress={handleViewCider}>
          <View style={styles.ciderHeader}>
            <View style={styles.ciderInfo}>
              <Text style={styles.ciderName}>{cider?.name || 'Unknown Cider'}</Text>
              <Text style={styles.ciderBrand}>by {cider?.brand || 'Unknown Brand'}</Text>
              {cider && (
                <Text style={styles.ciderDetails}>
                  {cider.abv}% ABV • Overall Rating: {cider.overallRating}/10
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={24} color="#007AFF" />
          </View>
        </TouchableOpacity>

        {/* Experience Rating */}
        {experience.rating && (
          <View style={styles.ratingCard}>
            <View style={styles.ratingHeader}>
              <Ionicons name="star" size={24} color="#FFD700" />
              <Text style={styles.ratingTitle}>Your Rating</Text>
            </View>
            <Text style={styles.ratingValue}>{experience.rating}/10</Text>
          </View>
        )}

        {/* Date & Time */}
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <Ionicons name="calendar" size={20} color="#32D74B" />
            <Text style={styles.detailTitle}>When</Text>
          </View>
          <Text style={styles.detailValue}>{formatDate(experience.date)}</Text>
        </View>

        {/* Venue Details */}
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <Ionicons name="location" size={20} color="#FF9500" />
            <Text style={styles.detailTitle}>Where</Text>
          </View>
          <Text style={styles.venueMain}>{experience.venue.name}</Text>
          <Text style={styles.venueType}>{getVenueTypeLabel(experience.venue.type)}</Text>
          {experience.venue.address && (
            <Text style={styles.venueAddress}>{experience.venue.address}</Text>
          )}

          {/* Interactive Map */}
          {experience.venue.location && (
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: experience.venue.location.latitude,
                  longitude: experience.venue.location.longitude,
                  latitudeDelta: 0.001, // Zoom level - smaller = more zoomed in
                  longitudeDelta: 0.001,
                }}
                showsUserLocation={false}
                showsMyLocationButton={false}
                scrollEnabled={true}
                zoomEnabled={true}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: experience.venue.location.latitude,
                    longitude: experience.venue.location.longitude,
                  }}
                  title={experience.venue.name}
                  description={`${getVenueTypeLabel(experience.venue.type)}${experience.venue.address ? ` • ${experience.venue.address}` : ''}`}
                >
                  <View style={styles.customMarker}>
                    <Ionicons name="location" size={24} color="#FF6B6B" />
                  </View>
                </Marker>
              </MapView>
              <Text style={styles.mapCaption}>
                Tap and drag to explore • {experience.venue.location.latitude.toFixed(6)}, {experience.venue.location.longitude.toFixed(6)}
              </Text>
            </View>
          )}
        </View>

        {/* Price Analysis */}
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <Ionicons name="cash" size={20} color="#007AFF" />
            <Text style={styles.detailTitle}>Price</Text>
          </View>
          <View style={styles.priceGrid}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Total Paid</Text>
              <Text style={styles.priceValue}>£{experience.price.toFixed(2)}</Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Container</Text>
              <Text style={styles.priceValue}>
                {experience.containerSize}ml {getContainerTypeLabel(experience.containerType, experience.containerTypeCustom)}
              </Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Price per Pint</Text>
              <Text style={styles.priceValue}>£{experience.pricePerPint.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Experience Context */}
        {(experience.weatherConditions || experience.companionType) && (
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Ionicons name="information-circle" size={20} color="#5856D6" />
              <Text style={styles.detailTitle}>Context</Text>
            </View>
            {experience.weatherConditions && (
              <View style={styles.contextRow}>
                <Text style={styles.contextLabel}>Weather:</Text>
                <Text style={styles.contextValue}>
                  {experience.weatherConditions.charAt(0).toUpperCase() + experience.weatherConditions.slice(1)}
                </Text>
              </View>
            )}
            {experience.companionType && (
              <View style={styles.contextRow}>
                <Text style={styles.contextLabel}>Company:</Text>
                <Text style={styles.contextValue}>
                  {experience.companionType.charAt(0).toUpperCase() + experience.companionType.slice(1)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Notes */}
        {experience.notes && (
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Ionicons name="document-text" size={20} color="#FF6B6B" />
              <Text style={styles.detailTitle}>Notes</Text>
            </View>
            <Text style={styles.notesText}>{experience.notes}</Text>
          </View>
        )}

        {/* System Info */}
        <View style={styles.systemCard}>
          <Text style={styles.systemTitle}>System Information</Text>
          <Text style={styles.systemText}>
            Created: {experience.createdAt.toLocaleDateString()} at {experience.createdAt.toLocaleTimeString()}
          </Text>
          <Text style={styles.systemText}>
            Last Updated: {experience.updatedAt.toLocaleDateString()} at {experience.updatedAt.toLocaleTimeString()}
          </Text>
          <Text style={styles.systemText}>
            Sync Status: {experience.syncStatus}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  ciderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ciderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ciderInfo: {
    flex: 1,
  },
  ciderName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  ciderBrand: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  ciderDetails: {
    fontSize: 14,
    color: '#888',
  },
  ratingCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  ratingValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F57C00',
    textAlign: 'center',
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  detailValue: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  venueMain: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  venueType: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 8,
  },
  venueAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  venueCoords: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  priceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  priceItem: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  contextRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  contextLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    width: 80,
  },
  contextValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  notesText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  systemCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  systemTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  systemText: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  mapContainer: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    height: 200,
    width: '100%',
  },
  customMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  mapCaption: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});