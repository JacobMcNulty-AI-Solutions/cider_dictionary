// UK Venue Consolidation System
// Intelligent venue recognition and consolidation for UK retail chains and pub groups

import { VenueType, ConsolidatedVenue } from '../types/cider';
import { StringSimilarity } from './duplicateDetection';

// =============================================================================
// VENUE CONSOLIDATION DATA
// =============================================================================

export interface VenueConsolidationRule {
  canonicalName: string;
  variants: string[];
  type: VenueType;
  aliases?: string[];
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number; // meters
}

// UK Chain Store Consolidation Rules
export const UK_CHAIN_CONSOLIDATION_RULES: VenueConsolidationRule[] = [
  // Major Supermarkets
  {
    canonicalName: 'Tesco',
    variants: [
      'tesco', 'tesco extra', 'tesco superstore', 'tesco express',
      'tesco metro', 'tesco petrol', 'tesco garage', 'tesco convenience'
    ],
    type: 'retail'
  },
  {
    canonicalName: 'Sainsbury\'s',
    variants: [
      'sainsburys', 'sainsbury\'s', 'sainsburys local', 'sainsbury\'s local',
      'sainsbury\'s superstore', 'sainsburys superstore'
    ],
    type: 'retail'
  },
  {
    canonicalName: 'ASDA',
    variants: [
      'asda', 'asda superstore', 'asda supermarket', 'asda living',
      'asda petrol', 'asda garage'
    ],
    type: 'retail'
  },
  {
    canonicalName: 'Morrisons',
    variants: [
      'morrisons', 'morrisons supermarket', 'morrisons daily',
      'morrisons petrol', 'morrisons garage'
    ],
    type: 'retail'
  },
  {
    canonicalName: 'Waitrose',
    variants: [
      'waitrose', 'waitrose & partners', 'little waitrose', 'waitrose local',
      'waitrose partners', 'waitrose john lewis'
    ],
    type: 'retail'
  },
  {
    canonicalName: 'Co-op',
    variants: [
      'coop', 'co-op', 'cooperative', 'co-operative', 'the co-op',
      'coop food', 'co-op food'
    ],
    type: 'retail'
  },
  {
    canonicalName: 'Marks & Spencer',
    variants: [
      'm&s', 'marks and spencer', 'marks & spencer', 'ms food',
      'marks spencer', 'simply food'
    ],
    type: 'retail'
  },

  // Pub Chains
  {
    canonicalName: 'Wetherspoons',
    variants: [
      'wetherspoons', 'weatherspoons', 'spoons', 'jd wetherspoon',
      'j d wetherspoon', 'the moon under water', 'the cross keys',
      'lloyds bar', 'the knights templar'
    ],
    aliases: ['spoons'],
    type: 'pub'
  },
  {
    canonicalName: 'Greene King',
    variants: [
      'greene king', 'hungry horse', 'flame grill', 'farmhouse inns',
      'old english inns', 'loch fyne', 'belhaven'
    ],
    type: 'pub'
  },
  {
    canonicalName: 'Mitchells & Butlers',
    variants: [
      'all bar one', 'browns', 'harvester', 'toby carvery',
      'vintage inns', 'stonehouse pizza', 'innkeepers lodge',
      'premium country pubs', 'sizzling pubs'
    ],
    type: 'pub'
  },
  {
    canonicalName: 'Marston\'s',
    variants: [
      'marstons', 'marston\'s', 'two for one', '2 for 1',
      'ember inns', 'tavern table', 'revere pubs'
    ],
    type: 'pub'
  },

  // Retail Chains
  {
    canonicalName: 'Majestic Wine',
    variants: [
      'majestic wine', 'majestic', 'majestic wine warehouse',
      'naked wines', 'majestic retail'
    ],
    type: 'retail'
  },
  {
    canonicalName: 'Bargain Booze',
    variants: [
      'bargain booze', 'bargainbooze', 'thorougoods', 'select convenience'
    ],
    type: 'retail'
  }
];

// Common venue type indicators
const VENUE_TYPE_INDICATORS: Record<VenueType, string[]> = {
  pub: [
    'pub', 'inn', 'tavern', 'bar', 'arms', 'head', 'crown', 'red lion',
    'white hart', 'george', 'railway', 'station', 'royal oak', 'swan'
  ],
  restaurant: [
    'restaurant', 'cafe', 'bistro', 'brasserie', 'grill', 'kitchen',
    'dining', 'eatery', 'steakhouse', 'pizza', 'curry'
  ],
  retail: [
    'supermarket', 'store', 'shop', 'mart', 'market', 'off licence',
    'offlicence', 'wine shop', 'bottle shop', 'convenience'
  ],
  festival: [
    'festival', 'fest', 'fair', 'show', 'event', 'market', 'farmers market'
  ],
  brewery: [
    'brewery', 'brewing', 'brew house', 'brewhouse', 'taproom', 'tap room'
  ],
  cidery: [
    'cidery', 'cider house', 'ciderhouse', 'cider mill', 'orchard'
  ],
  home: ['home', 'house'],
  other: []
};

// =============================================================================
// VENUE CONSOLIDATION SERVICE
// =============================================================================

export class VenueConsolidationService {
  /**
   * Consolidate venue name using UK market rules
   */
  static async consolidateVenueName(
    rawVenueName: string,
    location?: LocationData
  ): Promise<ConsolidatedVenue> {
    // Step 1: Normalize venue name
    const normalizedName = this.normalizeVenueName(rawVenueName);

    // Step 2: Check for chain consolidation
    const chainMatch = this.findChainMatch(normalizedName);
    if (chainMatch) {
      return {
        id: this.generateVenueId(chainMatch.canonicalName, location),
        name: chainMatch.canonicalName,
        type: chainMatch.type,
        location,
        isExisting: true,
        consolidatedFrom: rawVenueName
      };
    }

    // Step 3: Detect venue type from name patterns
    const venueType = this.detectVenueType(normalizedName);

    // Step 4: Check for existing similar venues (would query database in real app)
    const existingVenues = await this.findSimilarVenues(normalizedName, location);

    if (existingVenues.length > 0) {
      const bestMatch = this.findBestVenueMatch(normalizedName, location, existingVenues);

      if (bestMatch.confidence > 0.8) {
        return {
          id: bestMatch.venue.id,
          name: bestMatch.venue.name,
          type: bestMatch.venue.type,
          location: location || bestMatch.venue.location,
          isExisting: true,
          consolidatedFrom: rawVenueName
        };
      }
    }

    // Step 5: Create new venue (preserve original name for independent venues)
    const finalName = rawVenueName?.trim() || 'Unknown Venue';
    return {
      id: this.generateVenueId(finalName, location),
      name: finalName,
      type: venueType,
      location,
      isExisting: false,
      originalName: rawVenueName
    };
  }

  /**
   * Normalize venue name for consistent storage
   */
  private static normalizeVenueName(rawName: string): string {
    if (!rawName) return 'Unknown Venue';
    let normalized = rawName.toLowerCase().trim();

    // Remove common prefixes only for chains, preserve for independents
    // This will be handled by individual chain rules

    // Remove location suffixes
    normalized = normalized.replace(/\s+(ltd|limited|plc|&\s*co|and\s*co)$/i, '');

    // Don't remove common suffixes as they might be part of the actual name

    // Capitalize properly
    return this.capitalizeWords(normalized);
  }

  /**
   * Find matching chain from consolidation rules
   */
  private static findChainMatch(venueName: string): VenueConsolidationRule | null {
    const lowerName = venueName.toLowerCase();

    for (const rule of UK_CHAIN_CONSOLIDATION_RULES) {
      // Check exact matches first
      if (rule.variants.some(variant => lowerName === variant.toLowerCase())) {
        return rule;
      }

      // Check if venue name contains any variant
      if (rule.variants.some(variant => lowerName.includes(variant.toLowerCase()))) {
        return rule;
      }

      // Check aliases
      if (rule.aliases?.some(alias => lowerName.includes(alias.toLowerCase()))) {
        return rule;
      }
    }

    return null;
  }

  /**
   * Detect venue type from name patterns
   */
  private static detectVenueType(venueName: string): VenueType {
    const lowerName = venueName.toLowerCase();

    // Check each type's indicators, but exclude 'restaurant' for non-English names
    for (const [type, indicators] of Object.entries(VENUE_TYPE_INDICATORS)) {
      if (type === 'restaurant' && /[\u00C0-\u017F]/.test(lowerName)) {
        // Skip restaurant detection for names with accented characters (likely non-UK)
        continue;
      }
      if (indicators.some(indicator => lowerName.includes(indicator))) {
        return type as VenueType;
      }
    }

    // UK-specific pub name patterns
    const pubPatterns = [
      /\b(the\s+)?(red|white|black|green|blue|golden)\s+(lion|hart|horse|swan|bull|bear)\b/,
      /\b(the\s+)?(kings?|queens?|prince|duke|earl)\s+(head|arms)\b/,
      /\b(the\s+)?(railway|station|commercial|anchor|ship)\b/,
      /\b(the\s+)?(crown|rose|bell|star|sun)\b/
    ];

    if (pubPatterns.some(pattern => pattern.test(lowerName))) {
      return 'pub';
    }

    // Default to other for unrecognized venues
    return 'other';
  }

  /**
   * Find similar venues (would query database in real implementation)
   */
  private static async findSimilarVenues(
    venueName: string,
    location?: LocationData
  ): Promise<ConsolidatedVenue[]> {
    // This would query the database for similar venues
    // For now, returning empty array as placeholder
    return [];
  }

  /**
   * Find best matching venue from candidates
   */
  private static findBestVenueMatch(
    venueName: string,
    location: LocationData | undefined,
    candidates: ConsolidatedVenue[]
  ): { venue: ConsolidatedVenue; confidence: number } {
    let bestMatch = { venue: candidates[0], confidence: 0 };

    for (const candidate of candidates) {
      let confidence = 0;

      // Name similarity (70% weight)
      const nameSimilarity = StringSimilarity.combinedSimilarity(venueName, candidate.name);
      confidence += nameSimilarity * 0.7;

      // Location proximity (30% weight)
      if (location && candidate.location) {
        const distance = this.calculateDistance(location, candidate.location);
        const locationScore = distance < 100 ? 1 : Math.max(0, 1 - distance / 1000); // Within 1km
        confidence += locationScore * 0.3;
      }

      if (confidence > bestMatch.confidence) {
        bestMatch = { venue: candidate, confidence };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate distance between two locations (Haversine formula)
   */
  private static calculateDistance(loc1: LocationData, loc2: LocationData): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = loc1.latitude * Math.PI / 180;
    const φ2 = loc2.latitude * Math.PI / 180;
    const Δφ = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const Δλ = (loc2.longitude - loc1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Generate consistent venue ID
   */
  private static generateVenueId(venueName: string, location?: LocationData): string {
    const nameHash = (venueName || 'unknown').replace(/\s+/g, '').toLowerCase();
    const locationHash = location
      ? `${Math.round(location.latitude * 1000)}_${Math.round(location.longitude * 1000)}`
      : 'unknown';

    return `venue_${nameHash}_${locationHash}_${Date.now()}`;
  }

  /**
   * Capitalize words properly
   */
  private static capitalizeWords(str: string): string {
    return str.replace(/(\b\w)/g, (match) => match.toUpperCase());
  }

  /**
   * Get venue suggestions based on partial input
   */
  static getVenueSuggestions(partialName: string, existingVenues: ConsolidatedVenue[] = []): string[] {
    if (partialName.length < 2) return [];

    const suggestions = new Set<string>();

    // Add chain suggestions
    for (const rule of UK_CHAIN_CONSOLIDATION_RULES) {
      if (rule.canonicalName.toLowerCase().includes(partialName.toLowerCase()) ||
          rule.variants.some(variant => variant.includes(partialName.toLowerCase()))) {
        suggestions.add(rule.canonicalName);
      }
    }

    // Add existing venue suggestions
    for (const venue of existingVenues) {
      if (venue.name.toLowerCase().includes(partialName.toLowerCase())) {
        suggestions.add(venue.name);
      }
    }

    return Array.from(suggestions).slice(0, 5);
  }

  /**
   * Validate venue data
   */
  static validateVenueData(venue: Partial<ConsolidatedVenue>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!venue.name || venue.name.trim().length === 0) {
      errors.push('Venue name is required');
    } else if (venue.name.length > 100) {
      errors.push('Venue name must be less than 100 characters');
    }

    if (venue.type && !Object.values(VENUE_TYPE_INDICATORS).flat().length) {
      warnings.push('Venue type may not be recognized');
    }

    if (venue.location) {
      if (Math.abs(venue.location.latitude) > 90) {
        errors.push('Invalid latitude');
      }
      if (Math.abs(venue.location.longitude) > 180) {
        errors.push('Invalid longitude');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// =============================================================================
// VENUE SEARCH AND FILTERING
// =============================================================================

export class VenueSearchService {
  /**
   * Search venues with fuzzy matching
   */
  static searchVenues(query: string, venues: ConsolidatedVenue[]): ConsolidatedVenue[] {
    if (!query.trim()) return venues;

    const results: Array<{ venue: ConsolidatedVenue; score: number }> = [];

    for (const venue of venues) {
      const nameScore = StringSimilarity.combinedSimilarity(query, venue.name);

      if (nameScore > 0.3) {
        results.push({ venue, score: nameScore });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .map(result => result.venue);
  }

  /**
   * Filter venues by type
   */
  static filterByType(venues: ConsolidatedVenue[], types: VenueType[]): ConsolidatedVenue[] {
    return venues.filter(venue => types.includes(venue.type));
  }

  /**
   * Filter venues by location radius
   */
  static filterByLocation(
    venues: ConsolidatedVenue[],
    centerLocation: LocationData,
    radiusKm: number
  ): ConsolidatedVenue[] {
    return venues.filter(venue => {
      if (!venue.location) return false;

      const distance = VenueConsolidationService['calculateDistance'](centerLocation, venue.location);
      return distance <= radiusKm * 1000; // Convert km to meters
    });
  }
}