// Unified Venue Type System
// Consolidates VenueInfo, ConsolidatedVenue, and new Venue entity

import { VenueType } from './cider';

// =============================================================================
// LOCATION TYPE (shared with experience.ts)
// =============================================================================

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  timestamp?: number;
}

// =============================================================================
// BASE VENUE TYPE
// =============================================================================

/**
 * Base venue information - used for embedded venue data in experiences
 * This is the minimal venue representation for historical/offline storage
 */
export interface VenueInfo {
  id: string;
  name: string;
  type: VenueType;
  location?: Location;
  address?: string;
  priceCategory?: 'budget' | 'mid_range' | 'premium' | 'luxury';
}

// =============================================================================
// FULL VENUE ENTITY
// =============================================================================

/**
 * Full venue entity with persistence fields
 * Stored in SQLite venues table and Firebase venues collection
 * Extends VenueInfo for compatibility
 */
export interface Venue extends VenueInfo {
  userId: string;

  // Analytics
  visitCount: number;
  lastVisited?: Date;

  // System fields
  createdAt: Date;
  updatedAt: Date;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
  version: number;
}

// =============================================================================
// FORM DATA
// =============================================================================

/**
 * Form data for creating/editing venues
 * Used by VenueSelector and VenueDetailScreen
 */
export interface VenueFormData {
  name: string;
  type: VenueType;
  location?: Location;
  address?: string;
}

// =============================================================================
// VENUE SUGGESTION
// =============================================================================

/**
 * Venue with search/suggestion metadata
 * Used by VenueSelector for displaying suggestions
 */
export interface VenueSuggestion extends VenueInfo {
  distance?: number;      // meters from current location
  confidence?: number;    // 0-1 match confidence
  isExisting: boolean;    // true if already in venues table
}

// =============================================================================
// VENUE CREATION DATA
// =============================================================================

/**
 * Data required to create a new venue
 * Used by VenueService.createVenue
 */
export interface VenueCreationData {
  name: string;
  type: VenueType;
  location: Location;
  address?: string;
}

// =============================================================================
// DATABASE ROW TYPE
// =============================================================================

/**
 * Raw venue row from SQLite database
 * Used for mapping database rows to Venue objects
 */
export interface VenueRow {
  id: string;
  userId: string;
  name: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  visitCount: number;
  lastVisited: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: string;
  version: number;
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

// Re-export VenueType for convenience
export { VenueType } from './cider';

// =============================================================================
// TYPE COMPATIBILITY NOTES
// =============================================================================

/**
 * Type Compatibility Matrix:
 *
 * | Use Case                    | Type to Use      |
 * |-----------------------------|------------------|
 * | Storing in SQLite/Firebase  | Venue            |
 * | Embedding in ExperienceLog  | VenueInfo        |
 * | VenueSelector suggestions   | VenueSuggestion  |
 * | Form input/output           | VenueFormData    |
 * | Analytics (VenueRanking)    | Keep existing    |
 * | Database row mapping        | VenueRow         |
 *
 * Migration from ConsolidatedVenue:
 * - ConsolidatedVenue is deprecated (see cider.ts)
 * - Use Venue for persisted venues
 * - Use VenueSuggestion for venue selector results
 * - The 'isExisting' field maps to checking if venue exists in venues table
 */
