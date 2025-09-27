// Experience Types Tests
// Tests for Phase 3 experience logging types and validation

import {
  ExperienceLog,
  ExperienceFormState,
  VenueSuggestion,
  CONTAINER_SIZES,
  EXPERIENCE_VALIDATION,
  ExperienceAnalytics
} from '../experience';
import { VenueType } from '../cider';

describe('Experience Types', () => {
  describe('CONTAINER_SIZES', () => {
    it('should have correct container sizes in ml', () => {
      expect(CONTAINER_SIZES.HALF_PINT).toBe(284);
      expect(CONTAINER_SIZES.PINT).toBe(568);
      expect(CONTAINER_SIZES.BOTTLE_330).toBe(330);
      expect(CONTAINER_SIZES.BOTTLE_500).toBe(500);
      expect(CONTAINER_SIZES.CAN_440).toBe(440);
      expect(CONTAINER_SIZES.CAN_500).toBe(500);
      expect(CONTAINER_SIZES.LARGE_BOTTLE).toBe(750);
    });

    it('should have all sizes as numbers', () => {
      Object.values(CONTAINER_SIZES).forEach(size => {
        expect(typeof size).toBe('number');
        expect(size).toBeGreaterThan(0);
      });
    });
  });

  describe('EXPERIENCE_VALIDATION', () => {
    it('should have reasonable validation limits', () => {
      expect(EXPERIENCE_VALIDATION.MIN_PRICE).toBe(0.01);
      expect(EXPERIENCE_VALIDATION.MAX_PRICE).toBe(100);
      expect(EXPERIENCE_VALIDATION.MIN_CONTAINER_SIZE).toBe(100);
      expect(EXPERIENCE_VALIDATION.MAX_CONTAINER_SIZE).toBe(2000);
      expect(EXPERIENCE_VALIDATION.VENUE_NAME_MAX_LENGTH).toBe(100);
      expect(EXPERIENCE_VALIDATION.NOTES_MAX_LENGTH).toBe(500);
    });

    it('should have all validation values as positive numbers', () => {
      Object.values(EXPERIENCE_VALIDATION).forEach(value => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThan(0);
      });
    });
  });

  describe('ExperienceLog Interface', () => {
    const mockExperience: ExperienceLog = {
      id: 'exp_1',
      userId: 'user_1',
      ciderId: 'cider_1',
      date: new Date('2023-10-15'),
      venue: {
        id: 'venue_1',
        name: 'The Crown Inn',
        type: 'pub' as VenueType,
        location: {
          latitude: 51.5074,
          longitude: -0.1278
        },
        address: '123 High Street, London'
      },
      price: 5.50,
      containerSize: 568,
      pricePerMl: 0.0097,
      notes: 'Great atmosphere, excellent service',
      rating: 8,
      weatherConditions: 'sunny',
      companionType: 'friends',
      createdAt: new Date('2023-10-15T18:30:00'),
      updatedAt: new Date('2023-10-15T18:30:00'),
      syncStatus: 'synced',
      version: 1
    };

    it('should have all required fields', () => {
      expect(mockExperience.id).toBeDefined();
      expect(mockExperience.userId).toBeDefined();
      expect(mockExperience.ciderId).toBeDefined();
      expect(mockExperience.date).toBeInstanceOf(Date);
      expect(mockExperience.venue).toBeDefined();
      expect(mockExperience.price).toBeGreaterThan(0);
      expect(mockExperience.containerSize).toBeGreaterThan(0);
      expect(mockExperience.pricePerMl).toBeGreaterThan(0);
      expect(mockExperience.createdAt).toBeInstanceOf(Date);
      expect(mockExperience.updatedAt).toBeInstanceOf(Date);
      expect(mockExperience.syncStatus).toBeDefined();
      expect(mockExperience.version).toBeGreaterThan(0);
    });

    it('should have valid venue information', () => {
      expect(mockExperience.venue.id).toBeDefined();
      expect(mockExperience.venue.name).toBeTruthy();
      expect(['pub', 'restaurant', 'brewery', 'festival', 'home', 'shop', 'other']).toContain(mockExperience.venue.type);
    });

    it('should calculate price per ml correctly', () => {
      const expectedPricePerMl = mockExperience.price / mockExperience.containerSize;
      expect(mockExperience.pricePerMl).toBeCloseTo(expectedPricePerMl, 4);
    });

    it('should have valid optional fields when present', () => {
      if (mockExperience.rating) {
        expect(mockExperience.rating).toBeGreaterThanOrEqual(1);
        expect(mockExperience.rating).toBeLessThanOrEqual(10);
      }

      if (mockExperience.weatherConditions) {
        expect(['sunny', 'cloudy', 'rainy', 'stormy', 'unknown']).toContain(mockExperience.weatherConditions);
      }

      if (mockExperience.companionType) {
        expect(['alone', 'friends', 'family', 'colleagues', 'date']).toContain(mockExperience.companionType);
      }
    });
  });

  describe('ExperienceFormState Interface', () => {
    const mockFormState: ExperienceFormState = {
      ciderId: 'cider_1',
      venue: {
        name: 'The Local Pub',
        type: 'pub' as VenueType,
        location: {
          latitude: 51.5074,
          longitude: -0.1278
        },
        address: '456 Main Street'
      },
      price: 4.80,
      containerSize: 500,
      notes: 'Good value for money',
      date: new Date(),
      rating: 7
    };

    it('should have all required form fields', () => {
      expect(mockFormState.ciderId).toBeDefined();
      expect(mockFormState.venue.name).toBeTruthy();
      expect(mockFormState.venue.type).toBeDefined();
      expect(mockFormState.price).toBeGreaterThan(0);
      expect(mockFormState.containerSize).toBeGreaterThan(0);
      expect(mockFormState.date).toBeInstanceOf(Date);
    });

    it('should allow null location', () => {
      const formStateWithoutLocation: ExperienceFormState = {
        ...mockFormState,
        venue: {
          ...mockFormState.venue,
          location: null
        }
      };
      expect(formStateWithoutLocation.venue.location).toBeNull();
    });
  });

  describe('VenueSuggestion Interface', () => {
    const mockSuggestion: VenueSuggestion = {
      id: 'suggestion_1',
      name: 'Suggested Pub',
      type: 'pub' as VenueType,
      distance: 250,
      confidence: 0.85,
      location: {
        latitude: 51.5074,
        longitude: -0.1278
      },
      address: '789 Side Street',
      isExisting: true
    };

    it('should have valid confidence score', () => {
      expect(mockSuggestion.confidence).toBeGreaterThanOrEqual(0);
      expect(mockSuggestion.confidence).toBeLessThanOrEqual(1);
    });

    it('should have reasonable distance when provided', () => {
      if (mockSuggestion.distance) {
        expect(mockSuggestion.distance).toBeGreaterThan(0);
        expect(mockSuggestion.distance).toBeLessThan(50000); // 50km max reasonable
      }
    });

    it('should have boolean isExisting flag', () => {
      expect(typeof mockSuggestion.isExisting).toBe('boolean');
    });
  });

  describe('ExperienceAnalytics Interface', () => {
    const mockAnalytics: ExperienceAnalytics = {
      totalExperiences: 25,
      uniqueVenues: 8,
      averagePricePerMl: 0.0095,
      bestValueCider: {
        ciderId: 'cider_best',
        pricePerMl: 0.0065,
        venue: 'Budget Pub'
      },
      worstValueCider: {
        ciderId: 'cider_worst',
        pricePerMl: 0.015,
        venue: 'Expensive Restaurant'
      },
      monthlySpending: 85.50,
      favoriteVenue: {
        id: 'venue_fav',
        name: 'The Regular',
        type: 'pub' as VenueType
      },
      priceRangeDistribution: {
        budget: 8,
        midRange: 12,
        premium: 4,
        luxury: 1
      }
    };

    it('should have valid counts', () => {
      expect(mockAnalytics.totalExperiences).toBeGreaterThanOrEqual(0);
      expect(mockAnalytics.uniqueVenues).toBeGreaterThanOrEqual(0);
      expect(mockAnalytics.uniqueVenues).toBeLessThanOrEqual(mockAnalytics.totalExperiences);
    });

    it('should have valid price data', () => {
      expect(mockAnalytics.averagePricePerMl).toBeGreaterThan(0);
      expect(mockAnalytics.monthlySpending).toBeGreaterThanOrEqual(0);

      if (mockAnalytics.bestValueCider && mockAnalytics.worstValueCider) {
        expect(mockAnalytics.bestValueCider.pricePerMl).toBeLessThan(mockAnalytics.worstValueCider.pricePerMl);
      }
    });

    it('should have valid price distribution', () => {
      const { priceRangeDistribution } = mockAnalytics;
      const total = priceRangeDistribution.budget + priceRangeDistribution.midRange +
                   priceRangeDistribution.premium + priceRangeDistribution.luxury;

      expect(total).toBe(mockAnalytics.totalExperiences);
      Object.values(priceRangeDistribution).forEach(count => {
        expect(count).toBeGreaterThanOrEqual(0);
      });
    });
  });
});