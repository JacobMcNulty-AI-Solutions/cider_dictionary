// Phase 3: Experience Logging Types
// Comprehensive experience tracking for cider tasting sessions

import { VenueType, Rating, ContainerType } from './cider';

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  timestamp?: number;
}

export interface VenueInfo {
  id: string;
  name: string;
  type: VenueType;
  location?: Location;
  address?: string;
  priceCategory?: 'budget' | 'mid_range' | 'premium' | 'luxury';
}

export interface ExperienceLog {
  id: string;
  userId: string;
  ciderId: string;

  // Experience details
  date: Date;
  venue: VenueInfo;

  // Price and value analysis
  price: number; // Total price paid
  containerSize: number; // ml
  containerType: ContainerType; // Type of container (bottle, can, draught, etc.)
  pricePerPint: number; // Calculated automatically (price for equivalent pint)

  // Optional experience data
  notes?: string;
  rating?: Rating; // Can override cider rating for this specific experience
  weatherConditions?: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'unknown';
  companionType?: 'alone' | 'friends' | 'family' | 'colleagues' | 'date';

  // System fields
  createdAt: Date;
  updatedAt: Date;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
  version: number;
}

// Form state for experience logging
export interface ExperienceFormState {
  ciderId: string;
  venue: {
    name: string;
    type: VenueType;
    location: Location | null;
    address?: string;
  };
  price: number;
  containerSize: number;
  containerType: ContainerType;
  notes: string;
  date: Date;
  rating?: Rating;
}

// Venue suggestions and detection
export interface VenueSuggestion {
  id: string;
  name: string;
  type: VenueType;
  distance?: number; // meters
  confidence: number; // 0-1
  location?: Location;
  address?: string;
  isExisting: boolean;
}

// Experience analytics
export interface ExperienceAnalytics {
  totalExperiences: number;
  uniqueVenues: number;
  averagePricePerMl: number;
  bestValueCider: {
    ciderId: string;
    pricePerPint: number;
    venue: string;
  } | null;
  worstValueCider: {
    ciderId: string;
    pricePerPint: number;
    venue: string;
  } | null;
  monthlySpending: number;
  favoriteVenue: VenueInfo | null;
  priceRangeDistribution: {
    budget: number;
    midRange: number;
    premium: number;
    luxury: number;
  };
}

// Container size presets (ml)
export const CONTAINER_SIZES = {
  HALF_PINT: 284,
  PINT: 568,
  BOTTLE_330: 330,
  BOTTLE_500: 500,
  CAN_440: 440,
  CAN_500: 500,
  LARGE_BOTTLE: 750,
} as const;

export type ContainerSize = typeof CONTAINER_SIZES[keyof typeof CONTAINER_SIZES];

// Validation constants
export const EXPERIENCE_VALIDATION = {
  MIN_PRICE: 0.01,
  MAX_PRICE: 100,
  MIN_CONTAINER_SIZE: 100,
  MAX_CONTAINER_SIZE: 2000,
  VENUE_NAME_MAX_LENGTH: 100,
  NOTES_MAX_LENGTH: 500,
} as const;