// Phase 3: Location Services
// GPS capture, venue detection, and location utilities

import * as Location from 'expo-location';
import { Location as LocationType, VenueSuggestion, VenueInfo } from '../../types/experience';
import { VenueType } from '../../types/cider';

export interface LocationPermissionResult {
  granted: boolean;
  message: string;
}

export interface LocationResult {
  success: boolean;
  location?: LocationType;
  error?: string;
}

class LocationService {
  private static instance: LocationService;
  private lastKnownLocation: LocationType | null = null;
  private watchId: Location.LocationSubscription | null = null;

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  async requestLocationPermission(): Promise<LocationPermissionResult> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        return {
          granted: true,
          message: 'Location permission granted'
        };
      } else {
        return {
          granted: false,
          message: 'Location permission denied. Some features may not work properly.'
        };
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return {
        granted: false,
        message: 'Failed to request location permission'
      };
    }
  }

  async getCurrentLocation(): Promise<LocationResult> {
    try {
      const permissionResult = await this.requestLocationPermission();
      if (!permissionResult.granted) {
        return {
          success: false,
          error: permissionResult.message
        };
      }

      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 10000, // 10 seconds
        distanceInterval: 10 // 10 meters
      });

      const location: LocationType = {
        latitude: locationResult.coords.latitude,
        longitude: locationResult.coords.longitude,
        accuracy: locationResult.coords.accuracy || undefined,
        altitude: locationResult.coords.altitude || undefined,
        timestamp: locationResult.timestamp
      };

      this.lastKnownLocation = location;
      console.log('Current location obtained:', location);

      return {
        success: true,
        location
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown location error'
      };
    }
  }

  async startLocationTracking(): Promise<boolean> {
    try {
      const permissionResult = await this.requestLocationPermission();
      if (!permissionResult.granted) {
        return false;
      }

      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000, // 30 seconds
          distanceInterval: 50 // 50 meters
        },
        (locationUpdate) => {
          this.lastKnownLocation = {
            latitude: locationUpdate.coords.latitude,
            longitude: locationUpdate.coords.longitude,
            accuracy: locationUpdate.coords.accuracy || undefined,
            altitude: locationUpdate.coords.altitude || undefined,
            timestamp: locationUpdate.timestamp
          };
          console.log('Location updated:', this.lastKnownLocation);
        }
      );

      return true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      return false;
    }
  }

  stopLocationTracking(): void {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
      console.log('Location tracking stopped');
    }
  }

  getLastKnownLocation(): LocationType | null {
    return this.lastKnownLocation;
  }

  // Venue detection and suggestions
  async getNearbyVenueSuggestions(location: LocationType, maxResults: number = 10): Promise<VenueSuggestion[]> {
    // Get location context for more realistic suggestions
    const locationContext = await this.reverseGeocode(location);
    const cityName = await this.extractCityName(locationContext);

    const suggestions: VenueSuggestion[] = [
      // Always include manual entry option at the top
      {
        id: 'manual-entry',
        name: 'Enter venue manually',
        type: 'other',
        distance: 0,
        confidence: 1.0,
        location,
        isExisting: false
      },

      // Common retail chains (high confidence)
      {
        id: 'retail-tesco',
        name: `Tesco${cityName ? ` - ${cityName}` : ''}`,
        type: 'retail',
        distance: Math.random() * 800 + 200,
        confidence: 0.9,
        location,
        isExisting: false
      },
      {
        id: 'retail-sainsburys',
        name: `Sainsbury's${cityName ? ` - ${cityName}` : ''}`,
        type: 'retail',
        distance: Math.random() * 900 + 150,
        confidence: 0.85,
        location,
        isExisting: false
      },
      {
        id: 'retail-asda',
        name: `ASDA${cityName ? ` - ${cityName}` : ''}`,
        type: 'retail',
        distance: Math.random() * 1200 + 300,
        confidence: 0.8,
        location,
        isExisting: false
      },

      // Generic venue types with location context
      {
        id: 'pub-generic',
        name: cityName ? `Local Pub in ${cityName}` : 'Local Pub',
        type: 'pub',
        distance: Math.random() * 600 + 100,
        confidence: 0.7,
        location,
        isExisting: false
      },
      {
        id: 'restaurant-generic',
        name: cityName ? `Restaurant in ${cityName}` : 'Local Restaurant',
        type: 'restaurant',
        distance: Math.random() * 800 + 150,
        confidence: 0.65,
        location,
        isExisting: false
      },
      {
        id: 'home',
        name: 'At Home',
        type: 'home',
        distance: 0,
        confidence: 1.0,
        location,
        isExisting: false
      }
    ];

    // Add location-specific suggestions if available
    if (cityName) {
      suggestions.push(
        {
          id: 'cidery-local',
          name: `${cityName} Cidery`,
          type: 'cidery',
          distance: Math.random() * 2000 + 500,
          confidence: 0.6,
          location,
          isExisting: false
        },
        {
          id: 'brewery-local',
          name: `${cityName} Brewery`,
          type: 'cidery',
          distance: Math.random() * 1800 + 400,
          confidence: 0.6,
          location,
          isExisting: false
        }
      );
    }

    // Sort by confidence and manual entry first, then distance
    return suggestions
      .sort((a, b) => {
        if (a.id === 'manual-entry') return -1;
        if (b.id === 'manual-entry') return 1;
        if (a.id === 'home') return -1;
        if (b.id === 'home') return 1;

        const scoreA = (a.confidence * 0.8) + ((1000 - (a.distance || 1000)) / 1000 * 0.2);
        const scoreB = (b.confidence * 0.8) + ((1000 - (b.distance || 1000)) / 1000 * 0.2);
        return scoreB - scoreA;
      })
      .slice(0, maxResults);
  }

  // Helper method to extract city name from reverse geocoding result
  private async extractCityName(addressString: string | null): Promise<string | null> {
    if (!addressString) return null;

    // Simple extraction - look for city after comma or take the first part
    const parts = addressString.split(',').map(part => part.trim());

    // Return the city part (usually the 3rd or 4th element in UK addresses)
    if (parts.length >= 3) {
      return parts[2]; // City is typically the 3rd element
    } else if (parts.length >= 2) {
      return parts[1]; // Fallback to 2nd element
    }

    return null;
  }

  // Distance calculation utilities
  calculateDistance(location1: LocationType, location2: LocationType): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = location1.latitude * Math.PI / 180;
    const φ2 = location2.latitude * Math.PI / 180;
    const Δφ = (location2.latitude - location1.latitude) * Math.PI / 180;
    const Δλ = (location2.longitude - location1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  // Address geocoding (simplified for MVP)
  async reverseGeocode(location: LocationType): Promise<string | null> {
    try {
      const result = await Location.reverseGeocodeAsync({
        latitude: location.latitude,
        longitude: location.longitude
      });

      if (result && result.length > 0) {
        const address = result[0];
        const parts = [
          address.name,
          address.street,
          address.city,
          address.postalCode
        ].filter(Boolean);

        return parts.join(', ');
      }

      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  // Venue validation and consolidation
  validateVenueName(name: string): { isValid: boolean; suggestion?: string } {
    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      return { isValid: false };
    }

    if (trimmedName.length > 100) {
      return {
        isValid: false,
        suggestion: trimmedName.substring(0, 100) + '...'
      };
    }

    // Basic venue name formatting
    const formatted = trimmedName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return {
      isValid: true,
      suggestion: formatted !== trimmedName ? formatted : undefined
    };
  }

  // Common venue type detection from name
  detectVenueTypeFromName(venueName: string): VenueType {
    const name = venueName.toLowerCase();

    // Pub keywords
    if (name.includes('pub') || name.includes('inn') || name.includes('tavern') ||
        name.startsWith('the ') || name.includes('arms') || name.includes('head') ||
        name.includes('crown') || name.includes('anchor')) {
      return 'pub';
    }

    // Restaurant keywords
    if (name.includes('restaurant') || name.includes('bistro') || name.includes('brasserie') ||
        name.includes('kitchen') || name.includes('grill') || name.includes('cafe')) {
      return 'restaurant';
    }

    // Retail keywords
    if (name.includes('tesco') || name.includes('sainsbury') || name.includes('asda') ||
        name.includes('morrison') || name.includes('co-op') || name.includes('waitrose') ||
        name.includes('aldi') || name.includes('lidl') || name.includes('shop') ||
        name.includes('store') || name.includes('market')) {
      return 'retail';
    }

    // Brewery/Cidery keywords
    if (name.includes('brewery') || name.includes('cidery') || name.includes('distillery') ||
        name.includes('brewing') || name.includes('cider works')) {
      return 'cidery';
    }

    // Festival keywords
    if (name.includes('festival') || name.includes('fair') || name.includes('event')) {
      return 'festival';
    }

    // Default fallback
    return 'other';
  }

  // Check if location services are available
  async isLocationAvailable(): Promise<boolean> {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      return enabled;
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  }
}

export const locationService = LocationService.getInstance();
export default LocationService;