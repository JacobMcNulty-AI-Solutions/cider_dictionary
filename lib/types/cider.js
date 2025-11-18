"use strict";
// Phase 2 Enhanced Data Model - Comprehensive cider tracking
// Maintains backward compatibility with Phase 1 BasicCiderRecord
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALIDATION_CONSTANTS = exports.DISCLOSURE_CONFIGS = void 0;
exports.DISCLOSURE_CONFIGS = {
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
// VALIDATION CONSTANTS
// =============================================================================
exports.VALIDATION_CONSTANTS = {
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
};
