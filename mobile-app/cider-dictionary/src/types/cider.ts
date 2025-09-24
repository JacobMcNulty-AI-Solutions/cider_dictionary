// Phase 1 Simplified Data Model - Basic fields only
export interface BasicCiderRecord {
  id: string;
  name: string;
  brand: string;
  abv: number;
  overallRating: Rating; // 1-10 scale
  createdAt: Date;
}

// Strongly typed rating system
export type Rating = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

// Validation constants
export const VALIDATION_CONSTANTS = {
  ABV_MIN: 0.1,
  ABV_MAX: 20,
  RATING_MIN: 1,
  RATING_MAX: 10,
  NAME_MAX_LENGTH: 100,
  BRAND_MAX_LENGTH: 50,
} as const;

// Form data structure for the QuickEntry screen
export interface QuickEntryForm {
  name: string;
  brand: string;
  abv: number;
  overallRating: Rating;
}

// Form validation error types
export interface FormValidationErrors {
  name?: string;
  brand?: string;
  abv?: string;
  overallRating?: string;
}

// Database operation result types
export type DatabaseOperationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

// Database operations interface
export interface CiderDatabase {
  initializeDatabase(): Promise<void>;
  createCider(cider: Omit<BasicCiderRecord, 'id' | 'createdAt'>): Promise<BasicCiderRecord>;
  getAllCiders(): Promise<BasicCiderRecord[]>;
  getCiderById(id: string): Promise<BasicCiderRecord | null>;
  updateCider(id: string, updates: Partial<Omit<BasicCiderRecord, 'id' | 'createdAt'>>): Promise<void>;
  deleteCider(id: string): Promise<void>;
}

// Basic analytics data
export interface BasicAnalytics {
  totalCiders: number;
  averageRating: number;
  averageAbv: number;
  highestRated: BasicCiderRecord | null;
  lowestRated: BasicCiderRecord | null;
}