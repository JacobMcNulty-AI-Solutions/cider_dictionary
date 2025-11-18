// Interactive Map Location Picker Component
// Shows user's current location with draggable pin for venue selection

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

interface Location {
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  currentLocation?: Location | null;
  selectedLocation?: Location | null;
  onLocationSelect: (location: Location) => void;
  onLocationConfirm?: () => void;
  height?: number;
  showConfirmButton?: boolean;
}

const { width } = Dimensions.get('window');

const LocationPicker: React.FC<LocationPickerProps> = ({
  currentLocation,
  selectedLocation,
  onLocationSelect,
  onLocationConfirm,
  height = 300,
  showConfirmButton = true
}) => {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [markerLocation, setMarkerLocation] = useState<Location | null>(
    selectedLocation || currentLocation
  );

  // Initialize map region when current location is available
  useEffect(() => {
    if (currentLocation && !region) {
      const initialRegion: Region = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01, // Zoom level - smaller = more zoomed in
        longitudeDelta: 0.01,
      };
      setRegion(initialRegion);

      if (!selectedLocation) {
        setMarkerLocation(currentLocation);
        onLocationSelect(currentLocation);
      }
    }
  }, [currentLocation, region, selectedLocation, onLocationSelect]);

  // Update marker when selected location changes
  useEffect(() => {
    if (selectedLocation) {
      setMarkerLocation(selectedLocation);
    }
  }, [selectedLocation]);

  const handleMarkerDragEnd = (event: any) => {
    const newLocation: Location = {
      latitude: event.nativeEvent.coordinate.latitude,
      longitude: event.nativeEvent.coordinate.longitude,
    };
    setMarkerLocation(newLocation);
    onLocationSelect(newLocation);
  };

  const handleMapPress = (event: any) => {
    const newLocation: Location = {
      latitude: event.nativeEvent.coordinate.latitude,
      longitude: event.nativeEvent.coordinate.longitude,
    };
    setMarkerLocation(newLocation);
    onLocationSelect(newLocation);
  };

  const centerOnCurrentLocation = () => {
    if (currentLocation && mapRef.current) {
      const newRegion: Region = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current.animateToRegion(newRegion, 1000);
      setMarkerLocation(currentLocation);
      onLocationSelect(currentLocation);
    }
  };

  const handleConfirmLocation = () => {
    if (markerLocation && onLocationConfirm) {
      onLocationConfirm();
    }
  };

  if (!currentLocation || !region) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.loadingContainer}>
          <Ionicons name="location-outline" size={48} color="#ccc" />
          <Text style={styles.loadingText}>Loading map...</Text>
          <Text style={styles.loadingSubtext}>Getting your current location</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onPress={handleMapPress}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        mapType="standard"
      >
        {markerLocation && (
          <Marker
            coordinate={markerLocation}
            draggable={true}
            onDragEnd={handleMarkerDragEnd}
            title="Experience Location"
            description="Drag to adjust location"
          >
            <View style={styles.customMarker}>
              <Ionicons name="location" size={30} color="#FF6B6B" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Map Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={centerOnCurrentLocation}
        >
          <Ionicons name="locate" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Location Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          📍 Tap or drag the pin to set your experience location
        </Text>
        {markerLocation && (
          <Text style={styles.coordinatesText}>
            {markerLocation.latitude.toFixed(6)}, {markerLocation.longitude.toFixed(6)}
          </Text>
        )}
      </View>

      {/* Confirm Button */}
      {showConfirmButton && onLocationConfirm && (
        <TouchableOpacity
          style={[
            styles.confirmButton,
            !markerLocation && styles.confirmButtonDisabled
          ]}
          onPress={handleConfirmLocation}
          disabled={!markerLocation}
        >
          <Text style={[
            styles.confirmButtonText,
            !markerLocation && styles.confirmButtonTextDisabled
          ]}>
            Confirm Location
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f8f8f8',
    marginBottom: 16,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginTop: 12,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  controlsContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'column',
    gap: 8,
  },
  locationButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    margin: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonTextDisabled: {
    color: '#999',
  },
});

export default LocationPicker;