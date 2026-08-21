// Phase 3: Experience Logging Types
// Comprehensive experience tracking for cider tasting sessions

import { Rating, ContainerType, VenueType } from './cider';
import { VenueInfo, VenueSuggestion, Location } from './venue';

// Re-export venue types for backward compatibility
export { VenueInfo, VenueSuggestion, Location } from './venue';
export type { VenueType } from './cider';

export interface ExperienceLog {
  id: string;
  userId: string;
  ciderId: string;

  // Experience details
  date: Date;
  venueId?: string;    // Reference to venues table (for persistent venues) — "Bought At"
  venue?: VenueInfo;   // Embedded venue data (optional; where the cider was bought/acquired)
  enjoyedAtVenueId?: string;    // Optional — where the cider was actually drunk
  enjoyedAt?: VenueInfo;        // Optional embedded "Enjoyed At" venue

  // Price and value analysis
  price: number; // Total price paid (0 when gifted)
  gifted: boolean; // True when the user did not pay (gift, sample, someone else bought it)
  containerSize: number; // ml
  containerType: ContainerType; // Type of container (bottle, can, draught, keg, etc.)
  containerTypeCustom?: string; // Custom container type when 'other' is selected
  pricePerPint: number; // Calculated automatically (price for equivalent pint); 0 when gifted

  // Rating data (now stored on experiences, not ciders)
  rating: Rating; // Required - this experience's rating
  detailedRatings?: {
    appearance?: Rating;
    aroma?: Rating;
    taste?: Rating;
    mouthfeel?: Rating;
  };

  // Optional experience data
  notes?: string;

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
  } | null;
  enjoyedAt: {
    name: string;
    type: VenueType;
    location: Location | null;
    address?: string;
  } | null;
  price: number;
  gifted: boolean;
  containerSize: number;
  containerType: ContainerType;
  containerTypeCustom?: string;
  notes: string;
  date: Date;
  rating: Rating; // Required - ratings now on experiences
  detailedRatings?: {
    appearance?: Rating;
    aroma?: Rating;
    taste?: Rating;
    mouthfeel?: Rating;
  };
}

// VenueSuggestion is now imported from './venue'
// Kept for backward compatibility via re-export above

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
  BOTTLE_330: 330,
  CAN_440: 440,
  BOTTLE_CAN_500: 500,
  PINT: 568,
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