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
  | 'keg'
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
  traditionalStyle?: 'west_country_traditional' | 'eastern_england_traditional' | 'french_normandy_brittany' | 'spanish_sidra' | 'german_apfelwein' | 'modern_new_world' | 'american_traditional' | 'other_regional';

  // Individual characteristic fields (following data model specification)
  sweetness?: 'bone_dry' | 'dry' | 'off_dry' | 'medium' | 'sweet';
  carbonation?: 'still' | 'lightly_sparkling' | 'sparkling' | 'highly_carbonated';
  clarity?: 'crystal_clear' | 'clear' | 'hazy' | 'cloudy' | 'opaque';
  color?: 'pale_straw' | 'golden' | 'amber' | 'copper' | 'ruby' | 'pink_rose' | 'dark_amber';
  tasteTags?: string[];

  // Expert level fields
  appleClassification?: {
    categories?: ('bittersweet' | 'bittersharp' | 'sweet' | 'sharp' | 'culinary_dessert' | 'unknown_blend')[];
    varieties?: string[];
    longAshtonClassification?: string;
  };

  productionMethods?: {
    fermentation?: 'wild_spontaneous' | 'cultured_yeast' | 'mixed_fermentation' | 'unknown';
    specialProcesses?: ('keeved' | 'pet_nat_methode_ancestrale' | 'barrel_aged' | 'ice_cider' | 'pasteurized' | 'sterile_filtered' | 'bottle_conditioned' | 'sour_brett_fermented' | 'fortified' | 'solera_aged')[];
  };

  // Additives & Ingredients
  fruitAdditions?: ('pure_apple' | 'traditional_perry_pears' | 'dessert_pears' | 'blackberry' | 'raspberry' | 'blueberry' | 'elderberry' | 'blackcurrant' | 'strawberry' | 'cherry' | 'peach' | 'plum' | 'apricot' | 'pineapple' | 'mango' | 'passion_fruit' | 'coconut' | 'other')[];

  hops?: {
    varieties?: ('no_hops' | 'citra' | 'mosaic' | 'cascade' | 'amarillo' | 'simcoe' | 'target' | 'fuggle' | 'goldings' | 'other')[];
    character?: ('citrus' | 'floral' | 'pine_resin' | 'earthy_spicy')[];
  };

  spicesBotanicals?: ('no_spices_botanicals' | 'cinnamon' | 'nutmeg' | 'cloves' | 'ginger' | 'allspice' | 'elderflower' | 'chamomile' | 'lavender' | 'hibiscus' | 'juniper' | 'lemongrass' | 'rosehips' | 'pumpkin_spice' | 'mulling_spices' | 'chai_spices' | 'other')[];

  woodAging?: {
    oakTypes?: ('no_wood_aging' | 'american_oak' | 'french_oak' | 'english_oak')[];
    barrelHistory?: ('virgin_oak' | 'bourbon_barrel' | 'wine_barrel' | 'sherry_barrel' | 'rum_barrel' | 'gin_barrel')[];
    alternativeWoods?: ('cherry' | 'apple' | 'chestnut' | 'acacia' | 'other')[];
  };

  detailedRatings?: {
    appearance?: Rating;
    aroma?: Rating;
    taste?: Rating;
    mouthfeel?: Rating;
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
    fields: ['name', 'brand', 'abv', 'overallRating', 'tasteTags'],
    targetTime: 120,
    optional: ['photo', 'notes', 'traditionalStyle', 'sweetness', 'carbonation', 'clarity', 'color']
  },
  expert: {
    fields: ['name', 'brand', 'abv', 'overallRating', 'tasteTags',
             'appleClassification', 'productionMethods', 'detailedRatings'],
    targetTime: 300,
    optional: ['venue', 'photo', 'notes', 'traditionalStyle', 'sweetness', 'carbonation', 'clarity', 'color']
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
  sweetness?: CiderMasterRecord['sweetness'];
  carbonation?: CiderMasterRecord['carbonation'];
  clarity?: CiderMasterRecord['clarity'];
  color?: CiderMasterRecord['color'];
  tasteTags?: string[];
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
  sweetness?: string;
  carbonation?: string;
  clarity?: string;
  color?: string;
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
  MAX_NAME_LENGTH: 100,
  MIN_NAME_LENGTH: 2,
  MAX_BRAND_LENGTH: 50,
  MIN_BRAND_LENGTH: 2,
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