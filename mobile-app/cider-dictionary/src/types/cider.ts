// Phase 2 Enhanced Data Model - Comprehensive cider tracking
// Maintains backward compatibility with Phase 1 BasicCiderRecord

// =============================================================================
// CORE TYPE DEFINITIONS
// =============================================================================

// Strongly typed rating system
export type Rating = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

// Traditional cider styles for classification
export type TraditionalStyle =
  | 'traditional_english'
  | 'modern_craft'
  | 'heritage'
  | 'international'
  | 'fruit_cider'
  | 'perry'
  | 'ice_cider'
  | 'other';

// Apple classification categories based on Long Ashton system
export type AppleCategory =
  | 'bittersweet'
  | 'bittersharp'
  | 'sweet'
  | 'sharp'
  | 'culinary'
  | 'unknown';

// Container types for packaging classification
export type ContainerType =
  | 'bottle'
  | 'can'
  | 'bag_in_box'
  | 'draught'
  | 'other';

// Venue types for UK market categorization
export type VenueType =
  | 'pub'
  | 'restaurant'
  | 'retail'
  | 'festival'
  | 'brewery'
  | 'cidery'
  | 'home'
  | 'other';

// Progressive disclosure levels
export type DisclosureLevel = 'casual' | 'enthusiast' | 'expert';

// =============================================================================
// ENHANCED CIDER RECORD
// =============================================================================

export interface CiderMasterRecord {
  // Core identification
  id: string;
  userId: string;

  // Basic required fields (casual level - 30-second target)
  name: string;
  brand: string;
  abv: number;
  overallRating: Rating;

  // Basic optional fields (casual level)
  photo?: string;
  notes?: string; // Encrypted field

  // Enthusiast level fields
  traditionalStyle?: TraditionalStyle;
  basicCharacteristics?: {
    sweetness: 'bone_dry' | 'dry' | 'off_dry' | 'medium' | 'sweet';
    carbonation: 'still' | 'light_sparkling' | 'sparkling' | 'highly_carbonated';
    clarity: 'crystal_clear' | 'clear' | 'hazy' | 'cloudy' | 'opaque';
  };
  tasteTags?: string[];
  containerType?: ContainerType;

  // Expert level fields
  appleClassification?: {
    categories: AppleCategory[];
    varieties?: string[];
    longAshtonClassification?: string;
  };

  productionMethods?: {
    fermentation?: 'wild' | 'cultured_yeast' | 'mixed' | 'unknown';
    specialProcesses?: ('keeved' | 'pet_nat' | 'barrel_aged' | 'ice_cider' | 'other')[];
  };

  detailedRatings?: {
    appearance: Rating;
    aroma: Rating;
    taste: Rating;
    mouthfeel: Rating;
  };

  // Venue information
  venue?: {
    id: string;
    name: string;
    type: VenueType;
    location?: {
      latitude: number;
      longitude: number;
    };
  };

  // System fields
  createdAt: Date;
  updatedAt: Date;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
  version: number;
}

// Backward compatibility alias
export type BasicCiderRecord = Pick<CiderMasterRecord,
  'id' | 'name' | 'brand' | 'abv' | 'overallRating' | 'createdAt'>;

// =============================================================================
// PROGRESSIVE DISCLOSURE CONFIGURATION
// =============================================================================

export interface DisclosureConfig {
  fields: (keyof CiderMasterRecord)[];
  targetTime: number; // seconds
  optional: (keyof CiderMasterRecord)[];
}

export const DISCLOSURE_CONFIGS: Record<DisclosureLevel, DisclosureConfig> = {
  casual: {
    fields: ['name', 'brand', 'abv', 'overallRating'],
    targetTime: 30,
    optional: ['photo']
  },
  enthusiast: {
    fields: ['name', 'brand', 'abv', 'overallRating', 'tasteTags', 'containerType'],
    targetTime: 120,
    optional: ['photo', 'notes', 'traditionalStyle', 'basicCharacteristics']
  },
  expert: {
    fields: ['name', 'brand', 'abv', 'overallRating', 'tasteTags', 'containerType',
             'appleClassification', 'productionMethods', 'detailedRatings'],
    targetTime: 300,
    optional: ['venue', 'photo', 'notes']
  }
};

// =============================================================================
// FORM INTERFACES
// =============================================================================

export interface QuickEntryForm {
  // Progressive disclosure - only populate fields based on current level
  name: string;
  brand: string;
  abv: number;
  overallRating: Rating;

  // Optional fields that may be populated based on disclosure level
  photo?: string;
  notes?: string;
  traditionalStyle?: TraditionalStyle;
  basicCharacteristics?: CiderMasterRecord['basicCharacteristics'];
  tasteTags?: string[];
  containerType?: ContainerType;
  appleClassification?: CiderMasterRecord['appleClassification'];
  productionMethods?: CiderMasterRecord['productionMethods'];
  detailedRatings?: CiderMasterRecord['detailedRatings'];
  venue?: CiderMasterRecord['venue'];
}

// Enhanced validation interfaces for real-time feedback
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface FieldValidationState {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  showFeedback: boolean;
}

export interface FormCompleteness {
  percentage: number;
  canSubmit: boolean;
  missingFields: string[];
}

export interface QuickEntryFormState {
  disclosureLevel: DisclosureLevel;
  formData: Partial<CiderMasterRecord>;
  validationState: Record<string, FieldValidationState>;
  fieldStates: Record<string, 'default' | 'valid' | 'error' | 'warning'>;
  formCompleteness: FormCompleteness;
  duplicateWarning: {
    type: 'duplicate' | 'similar';
    message: string;
    confidence?: number;
    existingCider?: CiderMasterRecord;
  } | null;
  isSubmitting: boolean;
  startTime: number;
}

// Enhanced form validation errors
export interface FormValidationErrors {
  name?: string;
  brand?: string;
  abv?: string;
  overallRating?: string;
  traditionalStyle?: string;
  tasteTags?: string;
  containerType?: string;
  basicCharacteristics?: {
    sweetness?: string;
    carbonation?: string;
    clarity?: string;
  };
  appleClassification?: {
    categories?: string;
    varieties?: string;
  };
  productionMethods?: {
    fermentation?: string;
    specialProcesses?: string;
  };
  detailedRatings?: {
    appearance?: string;
    aroma?: string;
    taste?: string;
    mouthfeel?: string;
  };
  venue?: {
    name?: string;
    type?: string;
  };
}

// =============================================================================
// VENUE SYSTEM
// =============================================================================

export interface ConsolidatedVenue {
  id: string;
  name: string;
  type: VenueType;
  location?: {
    latitude: number;
    longitude: number;
  };
  isExisting: boolean;
  consolidatedFrom?: string;
  originalName?: string;
}

// =============================================================================
// DATABASE INTERFACES
// =============================================================================

// Enhanced database operations interface
export interface CiderDatabase {
  initializeDatabase(): Promise<void>;
  createCider(cider: Omit<CiderMasterRecord, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'syncStatus'>): Promise<CiderMasterRecord>;
  getAllCiders(): Promise<CiderMasterRecord[]>;
  getCiderById(id: string): Promise<CiderMasterRecord | null>;
  updateCider(id: string, updates: Partial<Omit<CiderMasterRecord, 'id' | 'createdAt'>>): Promise<void>;
  deleteCider(id: string): Promise<void>;

  // Phase 2 enhanced operations
  searchCiders(query: string): Promise<CiderMasterRecord[]>;
  getCidersByBrand(brand: string): Promise<CiderMasterRecord[]>;
  getCidersByVenue(venueId: string): Promise<CiderMasterRecord[]>;
  findSimilarCiders(name: string, brand: string): Promise<CiderMasterRecord[]>;
}

// Database operation result types
export type DatabaseOperationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

// =============================================================================
// VALIDATION CONSTANTS
// =============================================================================

export const VALIDATION_CONSTANTS = {
  ABV_MIN: 0.1,
  ABV_MAX: 20,
  RATING_MIN: 1,
  RATING_MAX: 10,
  NAME_MAX_LENGTH: 100,
  NAME_MIN_LENGTH: 2,
  BRAND_MAX_LENGTH: 50,
  BRAND_MIN_LENGTH: 2,
  NOTES_MAX_LENGTH: 1000,
  TASTE_TAGS_MAX: 10,
  TASTE_TAG_MAX_LENGTH: 30,
  VENUE_NAME_MAX_LENGTH: 100,
  APPLE_VARIETIES_MAX: 20,
} as const;

// =============================================================================
// ANALYTICS INTERFACES
// =============================================================================

export interface BasicAnalytics {
  totalCiders: number;
  averageRating: number;
  averageAbv: number;
  highestRated: CiderMasterRecord | null;
  lowestRated: CiderMasterRecord | null;
}

export interface EnhancedAnalytics extends BasicAnalytics {
  // Distribution analytics
  ratingDistribution: Record<Rating, number>;
  abvDistribution: { min: number; max: number; avg: number; median: number };
  styleDistribution: Record<TraditionalStyle, number>;

  // Venue analytics
  topVenues: Array<{ venue: ConsolidatedVenue; count: number }>;
  venueTypeDistribution: Record<VenueType, number>;

  // Temporal analytics
  cidersThisMonth: number;
  cidersThisYear: number;
  monthlyTrend: Array<{ month: string; count: number }>;

  // Collection insights
  uniqueBrands: number;
  avgCidersPerBrand: number;
  mostTried: CiderMasterRecord[];
}