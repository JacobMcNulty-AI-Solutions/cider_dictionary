/**
 * Venue Heat Map Component
 *
 * Displays a geographic heat map of venue locations using react-native-maps.
 * Features:
 * - Clustered venue markers with weight-based visualization
 * - Interactive callouts showing venue details
 * - Automatic zoom to fit all venues
 * - Loading and empty states
 * - Responsive layout
 *
 * @module VenueHeatMap
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { HeatMapData, ClusteredPoint } from '../../types/analytics';

// ============================================================================
// Type Definitions
// ============================================================================

export interface VenueHeatMapProps {
  /** Heat map data with clustered points */
  heatMapData: HeatMapData | null;
  /** Callback when a venue marker is selected */
  onVenueSelect?: (venueNames: string[]) => void;
  /** Loading state indicator */
  isLoading?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Marker colors based on intensity
const MARKER_COLORS = {
  LOW: '#4CAF50',      // Green - 1-2 experiences
  MEDIUM: '#FF9800',   // Orange - 3-5 experiences
  HIGH: '#F44336',     // Red - 6+ experiences
};

// ============================================================================
// Component
// ============================================================================

/**
 * VenueHeatMap Component
 * Renders an interactive map with clustered venue markers
 */
export const VenueHeatMap: React.FC<VenueHeatMapProps> = ({
  heatMapData,
  onVenueSelect,
  isLoading = false,
}) => {
  const mapRef = useRef<MapView>(null);

  /**
   * Fit map to show all markers when data changes
   */
  useEffect(() => {
    if (heatMapData && heatMapData.points.length > 0 && mapRef.current) {
      const coordinates = heatMapData.points.map(point => ({
        latitude: point.latitude,
        longitude: point.longitude,
      }));

      // Small delay to ensure map is rendered
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }, 100);
    }
  }, [heatMapData]);

  /**
   * Get marker color based on experience count
   */
  const getMarkerColor = (experiences: number): string => {
    if (experiences >= 6) return MARKER_COLORS.HIGH;
    if (experiences >= 3) return MARKER_COLORS.MEDIUM;
    return MARKER_COLORS.LOW;
  };

  /**
   * Get marker size based on weight
   */
  const getMarkerSize = (weight: number, maxWeight: number): number => {
    const minSize = 0.3;
    const maxSize = 1.0;
    const normalized = weight / maxWeight;
    return minSize + normalized * (maxSize - minSize);
  };

  /**
   * Handle marker press
   */
  const handleMarkerPress = (cluster: ClusteredPoint) => {
    if (onVenueSelect) {
      onVenueSelect(cluster.venueNames);
    }
  };

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading venue map...</Text>
        </View>
      </View>
    );
  }

  /**
   * Log heat map data for debugging
   */
  useEffect(() => {
    if (heatMapData) {
      console.log('[VenueHeatMap] Received data:', {
        points: heatMapData.points.length,
        bounds: heatMapData.bounds,
        metadata: heatMapData.metadata,
        firstPoint: heatMapData.points[0] || 'none'
      });
    } else {
      console.log('[VenueHeatMap] No heatMapData received');
    }
  }, [heatMapData]);

  /**
   * Render empty state
   */
  if (!heatMapData || heatMapData.points.length === 0) {
    console.log('[VenueHeatMap] Showing empty state');
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyTitle}>No Venue Locations</Text>
          <Text style={styles.emptyMessage}>
            Add location information to your experiences to see them on the map
          </Text>
        </View>
      </View>
    );
  }

  /**
   * Determine initial region
   */
  const initialRegion: Region = {
    latitude: heatMapData.bounds.centerLat,
    longitude: heatMapData.bounds.centerLng,
    latitudeDelta: Math.max(
      Math.abs(heatMapData.bounds.maxLat - heatMapData.bounds.minLat) * 1.5,
      LATITUDE_DELTA
    ),
    longitudeDelta: Math.max(
      Math.abs(heatMapData.bounds.maxLng - heatMapData.bounds.minLng) * 1.5,
      LONGITUDE_DELTA
    ),
  };

  const maxWeight = Math.max(...heatMapData.points.map(p => p.weight));

  /**
   * Render map with markers
   */
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        testID="venue-map-view"
      >
        {heatMapData.points.map((cluster, index) => {
          const markerColor = getMarkerColor(cluster.experiences);

          console.log(`[VenueHeatMap] Rendering marker ${index}:`, {
            lat: cluster.latitude,
            lng: cluster.longitude,
            color: markerColor,
            venues: cluster.venueNames
          });

          return (
            <Marker
              key={`cluster-${index}`}
              coordinate={{
                latitude: cluster.latitude,
                longitude: cluster.longitude,
              }}
              pinColor={markerColor}
              title={cluster.venueNames.length === 1
                ? cluster.venueNames[0]
                : `${cluster.venueNames.length} venues nearby`}
              description={`${cluster.experiences} experience${cluster.experiences !== 1 ? 's' : ''}`}
              onPress={() => handleMarkerPress(cluster)}
              testID={`venue-marker-${index}`}
            />
          );
        })}
      </MapView>

      {/* Map Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Experiences</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: MARKER_COLORS.LOW }]} />
            <Text style={styles.legendText}>1-2</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: MARKER_COLORS.MEDIUM }]} />
            <Text style={styles.legendText}>3-5</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: MARKER_COLORS.HIGH }]} />
            <Text style={styles.legendText}>6+</Text>
          </View>
        </View>
      </View>

      {/* Stats Badge */}
      <View style={styles.statsBadge}>
        <Text style={styles.statsText}>
          {heatMapData.metadata.totalVenues} venue{heatMapData.metadata.totalVenues !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.statsSubtext}>
          {heatMapData.metadata.totalExperiences} experience{heatMapData.metadata.totalExperiences !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 400,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  customMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  callout: {
    minWidth: 200,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  venueList: {
    marginBottom: 8,
  },
  venueName: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  moreVenues: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  experienceCount: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '600',
  },
  legend: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 3,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fff',
  },
  legendText: {
    fontSize: 11,
    color: '#666',
  },
  statsBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 3,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statsSubtext: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
});

export default VenueHeatMap;
