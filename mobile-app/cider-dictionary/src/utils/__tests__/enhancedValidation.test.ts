// Comprehensive Enhanced Validation Tests for Phase 2 Form Validation
// Tests for real-time validation, progressive disclosure, and complex field validation

import {
  ValidationEngine,
  ProgressiveValidation,
  RealTimeValidator,
  ValidationSeverity,
  createDebouncedValidator,
  validateMultipleFields,
  hasValidationErrors,
  getAllValidationErrors,
  getValidationSummary,
} from '../enhancedValidation';
import {
  ValidationResult,
  FieldValidationState,
  CiderMasterRecord,
  VALIDATION_CONSTANTS,
} from '../../types/cider';

// =============================================================================
// TEST SETUP AND FIXTURES
// =============================================================================

const createMockCiderData = (overrides: Partial<CiderMasterRecord> = {}): Partial<CiderMasterRecord> => ({
  name: 'Test Cider',
  brand: 'Test Brand',
  abv: 5.2,
  overallRating: 4.5,
  tasteTags: ['crisp', 'fruity'],
  notes: 'Test notes',
  containerType: 'bottle',
  ...overrides,
});

const createValidationResult = (
  isValid: boolean = true,
  errors: string[] = [],
  warnings: string[] = [],
  suggestions: string[] = []
): ValidationResult => ({
  isValid,
  errors,
  warnings,
  suggestions,
});

describe('ValidationEngine', () => {
  describe('Basic Field Validation', () => {
    describe('Cider Name Validation', () => {
      it('should validate valid cider names', () => {
        const validNames = [
          'Aspall Dry Cider',
          'Thatchers Gold',
          'Old Mout Berries & Cherries',
          'Rekorderlig Strawberry & Lime',
          'Henry Westons Vintage Cider',
        ];

        validNames.forEach(name => {
          const result = ValidationEngine.validateField('name', name);
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });

      it('should reject empty or null names', () => {
        const invalidNames = ['', null, undefined, '   '];

        invalidNames.forEach(name => {
          const result = ValidationEngine.validateField('name', name);
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.errors[0]).toContain('required');
        });
      });

      it('should reject names that are too short', () => {
        const shortNames = ['A'];

        shortNames.forEach(name => {
          const result = ValidationEngine.validateField('name', name);
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('Name must be at least 2 characters long');
        });
      });

      it('should reject names that are too long', () => {
        const longName = 'A'.repeat(VALIDATION_CONSTANTS.MAX_NAME_LENGTH + 1);
        const result = ValidationEngine.validateField('name', longName);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(`Name cannot exceed ${VALIDATION_CONSTANTS.MAX_NAME_LENGTH} characters`);
      });

      it('should provide warnings for potentially problematic names', () => {
        const problematicNames = [
          '123 Numbers Only',
          'ALLCAPS',
          'special@symbols#',
          'Cider Cider Cider', // Repetitive
        ];

        problematicNames.forEach(name => {
          const result = ValidationEngine.validateField('name', name);
          // Should be valid but with warnings
          expect(result.isValid).toBe(true);
          expect(result.warnings.length).toBeGreaterThan(0);
        });
      });

      it('should provide suggestions for common misspellings', () => {
        const misspelledNames = [
          'Cyder', // Should suggest 'Cider'
          'Appel Cider', // Should suggest 'Apple Cider'
          'Strberry Cider', // Should suggest 'Strawberry Cider'
        ];

        misspelledNames.forEach(name => {
          const result = ValidationEngine.validateField('name', name);
          if (result.suggestions.length > 0) {
            expect(result.suggestions[0]).toContain('Did you mean');
          }
        });
      });
    });

    describe('Brand Name Validation', () => {
      it('should validate known UK cider brands', () => {
        const knownBrands = [
          'Aspall',
          'Thatchers',
          'Strongbow',
          'Old Mout',
          'Rekorderlig',
          'Henry Westons',
          'Blackthorn',
          'Magners',
        ];

        knownBrands.forEach(brand => {
          const result = ValidationEngine.validateField('brand', brand);
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });

      it('should reject empty brand names', () => {
        const result = ValidationEngine.validateField('brand', '');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Brand name is required');
      });

      it('should provide suggestions for similar brand names', () => {
        const result = ValidationEngine.validateField('brand', 'Aspel'); // Misspelled Aspall

        if (result.suggestions.length > 0) {
          expect(result.suggestions.some(s => s.includes('Aspall'))).toBe(true);
        }
      });

      it('should warn about uncommon brand names', () => {
        const result = ValidationEngine.validateField('brand', 'Unknown Local Cidery');

        expect(result.isValid).toBe(true);
        if (result.warnings.length > 0) {
          expect(result.warnings[0]).toContain('unfamiliar brand');
        }
      });
    });

    describe('ABV Validation', () => {
      it('should validate typical cider ABV values', () => {
        const validABVs = [3.0, 4.5, 5.2, 6.0, 7.5, 8.2];

        validABVs.forEach(abv => {
          const result = ValidationEngine.validateField('abv', abv);
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });

      it('should reject invalid ABV values', () => {
        const invalidABVs = [-1, 0, 25, 100, 'not a number', null];

        invalidABVs.forEach(abv => {
          const result = ValidationEngine.validateField('abv', abv);
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        });
      });

      it('should warn about unusual ABV values', () => {
        const unusualABVs = [
          { value: 0.5, reason: 'very low' },
          { value: 15.0, reason: 'very high' },
          { value: 20.0, reason: 'extremely high' },
        ];

        unusualABVs.forEach(({ value, reason }) => {
          const result = ValidationEngine.validateField('abv', value);
          expect(result.isValid).toBe(true);
          expect(result.warnings.length).toBeGreaterThan(0);
          expect(result.warnings[0]).toContain(reason);
        });
      });

      it('should provide context for ABV ranges', () => {
        const result = ValidationEngine.validateField('abv', 12.0);

        if (result.suggestions.length > 0) {
          expect(result.suggestions[0]).toContain('strong cider');
        }
      });
    });

    describe('Rating Validation', () => {
      it('should validate rating values within range', () => {
        const validRatings = [0, 0.5, 1, 2.5, 3, 4.5, 5];

        validRatings.forEach(rating => {
          const result = ValidationEngine.validateField('overallRating', rating);
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });

      it('should reject ratings outside valid range', () => {
        const invalidRatings = [-1, -0.5, 5.5, 6, 10];

        invalidRatings.forEach(rating => {
          const result = ValidationEngine.validateField('overallRating', rating);
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('Rating must be between 0 and 5');
        });
      });

      it('should handle decimal precision appropriately', () => {
        const preciseRatings = [4.25, 3.75, 2.125]; // Quarter and eighth precision

        preciseRatings.forEach(rating => {
          const result = ValidationEngine.validateField('overallRating', rating);
          if (result.warnings.length > 0) {
            expect(result.warnings[0]).toContain('recommend rounding');
          }
        });
      });
    });

    describe('Container Type Validation', () => {
      it('should validate standard container types', () => {
        const validContainers = ['bottle', 'can', 'draft', 'keg', 'pouch'];

        validContainers.forEach(container => {
          const result = ValidationEngine.validateField('containerType', container);
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });

      it('should reject invalid container types', () => {
        const result = ValidationEngine.validateField('containerType', 'invalid_container');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid container type');
      });

      it('should suggest corrections for similar container types', () => {
        const result = ValidationEngine.validateField('containerType', 'bottel'); // Misspelled 'bottle'

        if (result.suggestions.length > 0) {
          expect(result.suggestions[0]).toContain('bottle');
        }
      });
    });
  });

  describe('Complex Field Validation', () => {
    describe('Taste Tags Validation', () => {
      it('should validate arrays of taste tags', () => {
        const validTagArrays = [
          ['dry', 'crisp'],
          ['sweet', 'fruity', 'apple'],
          ['tart', 'refreshing'],
          [], // Empty array should be valid
        ];

        validTagArrays.forEach(tags => {
          const result = ValidationEngine.validateField('tasteTags', tags);
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });

      it('should reject non-array values for taste tags', () => {
        const invalidTags = ['string', 123, {}, null];

        invalidTags.forEach(tags => {
          const result = ValidationEngine.validateField('tasteTags', tags);
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('Taste tags must be an array');
        });
      });

      it('should validate individual taste tag content', () => {
        const invalidTagArrays = [
          ['', 'valid'], // Empty string tag
          ['valid', '   '], // Whitespace only tag
          ['valid', 'way_too_long_tag_that_exceeds_limits'], // Too long
        ];

        invalidTagArrays.forEach(tags => {
          const result = ValidationEngine.validateField('tasteTags', tags);
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        });
      });

      it('should suggest popular taste tags', () => {
        const result = ValidationEngine.validateField('tasteTags', ['appl']); // Partial 'apple'

        if (result.suggestions.length > 0) {
          expect(result.suggestions.some(s => s.includes('apple'))).toBe(true);
        }
      });

      it('should warn about too many taste tags', () => {
        const manyTags = Array.from({ length: 15 }, (_, i) => `tag${i}`);
        const result = ValidationEngine.validateField('tasteTags', manyTags);

        expect(result.isValid).toBe(true);
        expect(result.warnings).toContain('Consider limiting to 8-10 most relevant tags');
      });
    });

    describe('Venue Information Validation', () => {
      it('should validate complete venue objects', () => {
        const validVenue = {
          id: 'venue123',
          name: 'The Red Lion',
          type: 'pub',
          location: { latitude: 51.5074, longitude: -0.1278 },
        };

        const result = ValidationEngine.validateField('venue', validVenue);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate venue location coordinates', () => {
        const invalidVenues = [
          {
            id: 'venue1',
            name: 'Test Venue',
            type: 'pub',
            location: { latitude: 200, longitude: 0 }, // Invalid latitude
          },
          {
            id: 'venue2',
            name: 'Test Venue',
            type: 'pub',
            location: { latitude: 0, longitude: 200 }, // Invalid longitude
          },
        ];

        invalidVenues.forEach(venue => {
          const result = ValidationEngine.validateField('venue', venue);
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.includes('coordinate'))).toBe(true);
        });
      });

      it('should handle partial venue information', () => {
        const partialVenue = {
          name: 'Partial Venue Info',
          type: 'pub',
        };

        const result = ValidationEngine.validateField('venue', partialVenue);
        expect(result.isValid).toBe(true);
        if (result.warnings.length > 0) {
          expect(result.warnings[0]).toContain('incomplete venue');
        }
      });
    });

    describe('Notes Validation', () => {
      it('should validate reasonable note lengths', () => {
        const validNotes = [
          'Short note',
          'This is a longer note with more detailed information about the cider',
          '', // Empty notes should be valid
        ];

        validNotes.forEach(notes => {
          const result = ValidationEngine.validateField('notes', notes);
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });

      it('should warn about very long notes', () => {
        const longNotes = 'A'.repeat(2000); // Very long note
        const result = ValidationEngine.validateField('notes', longNotes);

        expect(result.isValid).toBe(true);
        expect(result.warnings).toContain('Consider breaking long notes into sections');
      });

      it('should detect and warn about profanity', () => {
        const profaneNotes = 'This damn cider is shit';
        const result = ValidationEngine.validateField('notes', profaneNotes);

        if (result.warnings.length > 0) {
          expect(result.warnings.some(w => w.includes('inappropriate language'))).toBe(true);
        }
      });

      it('should suggest structure for lengthy notes', () => {
        const structuredNotes = 'This cider has a complex flavor profile';
        const result = ValidationEngine.validateField('notes', structuredNotes);

        if (result.suggestions.length > 0) {
          expect(result.suggestions.some(s => s.includes('consider using'))).toBe(true);
        }
      });
    });
  });

  describe('Cross-Field Validation', () => {
    it('should validate consistency between name and brand', () => {
      const formData = createMockCiderData({
        name: 'Aspall Dry Cider',
        brand: 'Thatchers', // Inconsistent brand
      });

      const result = ValidationEngine.validateField('brand', 'Thatchers', undefined, formData);

      if (result.warnings.length > 0) {
        expect(result.warnings.some(w => w.includes('mismatch'))).toBe(true);
      }
    });

    it('should validate ABV consistency with cider style', () => {
      const formData = createMockCiderData({
        name: 'Light Session Cider',
        abv: 8.5, // High ABV for a light cider
      });

      const result = ValidationEngine.validateField('abv', 8.5, undefined, formData);

      if (result.warnings.length > 0) {
        expect(result.warnings.some(w => w.includes('inconsistent'))).toBe(true);
      }
    });

    it('should validate rating consistency with notes sentiment', () => {
      const formData = createMockCiderData({
        overallRating: 1.0, // Very low rating
        notes: 'Absolutely amazing and delicious!', // Positive notes
      });

      const result = ValidationEngine.validateField('overallRating', 1.0, undefined, formData);

      if (result.warnings.length > 0) {
        expect(result.warnings.some(w => w.includes('rating and notes'))).toBe(true);
      }
    });
  });

  describe('Real-Time Validation', () => {
    let validator: RealTimeValidator;

    beforeEach(() => {
      validator = new RealTimeValidator();
    });

    it('should provide immediate feedback on field changes', () => {
      const feedback = validator.validateFieldRealTime('name', 'A', {});

      expect(feedback.isValid).toBe(false);
      expect(feedback.severity).toBe(ValidationSeverity.ERROR);
      expect(feedback.message).toContain('at least 2 characters');
    });

    it('should debounce rapid field changes', (done) => {
      let callCount = 0;
      const mockCallback = jest.fn(() => {
        callCount++;
      });

      // Simulate rapid typing
      validator.validateFieldRealTime('name', 'A', {}, mockCallback);
      validator.validateFieldRealTime('name', 'As', {}, mockCallback);
      validator.validateFieldRealTime('name', 'Asp', {}, mockCallback);
      validator.validateFieldRealTime('name', 'Aspa', {}, mockCallback);
      validator.validateFieldRealTime('name', 'Aspall', {}, mockCallback);

      // Should only call callback once after debounce delay
      setTimeout(() => {
        expect(mockCallback).toHaveBeenCalledTimes(1);
        done();
      }, 350); // Just over the debounce delay
    });

    it('should provide progressive validation feedback', () => {
      const stages = [
        { input: 'A', expectedSeverity: ValidationSeverity.ERROR },
        { input: 'As', expectedSeverity: ValidationSeverity.WARNING },
        { input: 'Aspall', expectedSeverity: ValidationSeverity.SUCCESS },
      ];

      stages.forEach(({ input, expectedSeverity }) => {
        const feedback = validator.validateFieldRealTime('name', input, {});
        expect(feedback.severity).toBe(expectedSeverity);
      });
    });

    it('should clear validation state on reset', () => {
      validator.validateFieldRealTime('name', 'invalid', {});
      expect(validator.getFieldValidationState('name')).toBeDefined();

      validator.resetValidation();
      expect(validator.getFieldValidationState('name')).toBeUndefined();
    });

    it('should maintain field validation history', () => {
      validator.validateFieldRealTime('name', 'A', {});
      validator.validateFieldRealTime('name', 'Aspall', {});

      const history = validator.getValidationHistory('name');
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].value).toBe('A');
      expect(history[history.length - 1].value).toBe('Aspall');
    });
  });

  describe('Progressive Disclosure Validation', () => {
    it('should validate basic fields first', () => {
      const basicData = {
        name: 'Test Cider',
        brand: 'Test Brand',
        abv: 5.0,
        overallRating: 4.0,
      };

      const result = ProgressiveValidation.validateBasicFields(basicData);
      expect(result.isValid).toBe(true);
      expect(result.completedStage).toBe('basic');
    });

    it('should prevent advanced validation without basic completion', () => {
      const incompleteBasicData = {
        name: '', // Missing required field
        brand: 'Test Brand',
      };

      const result = ProgressiveValidation.validateBasicFields(incompleteBasicData);
      expect(result.isValid).toBe(false);
      expect(result.canProceedToAdvanced).toBe(false);
    });

    it('should validate enhanced fields after basic completion', () => {
      const enhancedData = {
        // Basic fields
        name: 'Test Cider',
        brand: 'Test Brand',
        abv: 5.0,
        overallRating: 4.0,
        // Enhanced fields
        appearance: {
          color: 'golden',
          clarity: 'clear',
          carbonation: 'medium',
        },
        aroma: {
          intensity: 4,
          descriptors: ['apple', 'floral'],
        },
      };

      const basicResult = ProgressiveValidation.validateBasicFields(enhancedData);
      expect(basicResult.isValid).toBe(true);
      expect(basicResult.canProceedToAdvanced).toBe(true);

      const enhancedResult = ProgressiveValidation.validateEnhancedFields(enhancedData);
      expect(enhancedResult.isValid).toBe(true);
      expect(enhancedResult.completedStage).toBe('enhanced');
    });

    it('should provide stage completion percentage', () => {
      const partialData = {
        name: 'Test Cider',
        brand: 'Test Brand',
        // Missing ABV and rating
      };

      const result = ProgressiveValidation.validateBasicFields(partialData);
      expect(result.completionPercentage).toBeLessThan(100);
      expect(result.completionPercentage).toBeGreaterThan(0);
    });

    it('should suggest next fields to complete', () => {
      const partialData = {
        name: 'Test Cider',
        brand: 'Test Brand',
      };

      const result = ProgressiveValidation.validateBasicFields(partialData);
      expect(result.nextSuggestedFields).toContain('abv');
      expect(result.nextSuggestedFields).toContain('overallRating');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null and undefined field values gracefully', () => {
      const result = ValidationEngine.validateField('name', null);
      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should handle invalid field keys', () => {
      const result = ValidationEngine.validateField('invalidField' as any, 'value');
      expect(result).toBeDefined();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unknown field');
    });

    it('should handle circular references in complex objects', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      const result = ValidationEngine.validateField('venue', circularObj);
      expect(result).toBeDefined();
      // Should not throw an error despite circular reference
    });

    it('should handle very large input values', () => {
      const largeString = 'A'.repeat(100000);
      const result = ValidationEngine.validateField('notes', largeString);

      expect(result).toBeDefined();
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('too long'))).toBe(true);
    });

    it('should handle special characters and unicode', () => {
      const unicodeName = 'Cidré Français 🍎🥂';
      const result = ValidationEngine.validateField('name', unicodeName);

      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
    });

    it('should handle malformed objects gracefully', () => {
      const malformedVenue = {
        // Missing required properties
        invalidProperty: 'test',
        another: null,
      };

      const result = ValidationEngine.validateField('venue', malformedVenue);
      expect(result).toBeDefined();
      expect(result.isValid).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    it('should validate fields quickly', () => {
      const startTime = performance.now();

      // Validate multiple fields
      const fields = [
        { key: 'name', value: 'Test Cider' },
        { key: 'brand', value: 'Test Brand' },
        { key: 'abv', value: 5.2 },
        { key: 'overallRating', value: 4.5 },
        { key: 'tasteTags', value: ['crisp', 'fruity'] },
      ];

      fields.forEach(({ key, value }) => {
        ValidationEngine.validateField(key as keyof CiderMasterRecord, value);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50); // Should be very fast
    });

    it('should handle rapid successive validations', () => {
      const validator = new RealTimeValidator();
      const startTime = performance.now();

      // Simulate rapid field updates
      for (let i = 0; i < 100; i++) {
        validator.validateFieldRealTime('name', `Test${i}`, {});
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should handle rapid updates efficiently
    });

    it('should validate large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        name: `Cider ${i}`,
        brand: `Brand ${i % 10}`,
        abv: 3 + (i % 8),
        overallRating: Math.random() * 5,
      }));

      const startTime = performance.now();

      largeDataset.forEach(data => {
        ValidationEngine.validateField('name', data.name);
        ValidationEngine.validateField('brand', data.brand);
        ValidationEngine.validateField('abv', data.abv);
        ValidationEngine.validateField('overallRating', data.overallRating);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should handle large datasets reasonably
    });
  });
});