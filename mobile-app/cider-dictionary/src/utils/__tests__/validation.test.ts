import { validateRating, validateAbv, validateQuickEntryForm, sanitizeFormData } from '../validation';
import { Rating, VALIDATION_CONSTANTS } from '../../types/cider';

describe('Validation Utils', () => {
  describe('validateRating', () => {
    it('should return valid rating for values within range', () => {
      expect(validateRating(1)).toBe(1);
      expect(validateRating(5)).toBe(5);
      expect(validateRating(10)).toBe(10);
    });

    it('should return default rating for values outside range', () => {
      expect(validateRating(0)).toBe(5);
      expect(validateRating(11)).toBe(5);
      expect(validateRating(-1)).toBe(5);
    });

    it('should round decimal values', () => {
      expect(validateRating(7.4)).toBe(7);
      expect(validateRating(7.6)).toBe(8);
    });
  });

  describe('validateAbv', () => {
    it('should return true for valid ABV values', () => {
      expect(validateAbv(0.1)).toBe(true);
      expect(validateAbv(5.0)).toBe(true);
      expect(validateAbv(20)).toBe(true);
    });

    it('should return false for invalid ABV values', () => {
      expect(validateAbv(0)).toBe(false);
      expect(validateAbv(-1)).toBe(false);
      expect(validateAbv(21)).toBe(false);
    });
  });

  describe('validateQuickEntryForm', () => {
    const validForm = {
      name: 'Test Cider',
      brand: 'Test Brand',
      abv: 5.0,
      overallRating: 7 as Rating,
    };

    it('should pass validation for valid form', () => {
      const result = validateQuickEntryForm(validForm);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should fail validation for empty name', () => {
      const form = { ...validForm, name: '' };
      const result = validateQuickEntryForm(form);
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('Cider name is required');
    });

    it('should fail validation for empty brand', () => {
      const form = { ...validForm, brand: '' };
      const result = validateQuickEntryForm(form);
      expect(result.isValid).toBe(false);
      expect(result.errors.brand).toBe('Brand is required');
    });

    it('should fail validation for invalid ABV', () => {
      const form = { ...validForm, abv: 0 };
      const result = validateQuickEntryForm(form);
      expect(result.isValid).toBe(false);
      expect(result.errors.abv).toContain('ABV must be between');
    });

    it('should fail validation for name too long', () => {
      const form = { ...validForm, name: 'a'.repeat(VALIDATION_CONSTANTS.NAME_MAX_LENGTH + 1) };
      const result = validateQuickEntryForm(form);
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toContain('must be less than');
    });

    it('should fail validation for brand too long', () => {
      const form = { ...validForm, brand: 'a'.repeat(VALIDATION_CONSTANTS.BRAND_MAX_LENGTH + 1) };
      const result = validateQuickEntryForm(form);
      expect(result.isValid).toBe(false);
      expect(result.errors.brand).toContain('must be less than');
    });

    it('should validate multiple fields at once', () => {
      const form = {
        name: '',
        brand: '',
        abv: -1,
        overallRating: 15 as Rating, // Invalid but will be handled by type system
      };
      const result = validateQuickEntryForm(form);
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(1);
    });
  });

  describe('sanitizeFormData', () => {
    it('should trim whitespace from strings', () => {
      const form = {
        name: '  Test Cider  ',
        brand: '  Test Brand  ',
        abv: 5.0,
        overallRating: 7 as Rating,
      };
      const result = sanitizeFormData(form);
      expect(result.name).toBe('Test Cider');
      expect(result.brand).toBe('Test Brand');
    });

    it('should round ABV to 1 decimal place', () => {
      const form = {
        name: 'Test',
        brand: 'Test',
        abv: 5.123456,
        overallRating: 7 as Rating,
      };
      const result = sanitizeFormData(form);
      expect(result.abv).toBe(5.1);
    });

    it('should validate and fix rating', () => {
      const form = {
        name: 'Test',
        brand: 'Test',
        abv: 5.0,
        overallRating: 15 as Rating, // Invalid rating
      };
      const result = sanitizeFormData(form);
      expect(result.overallRating).toBe(5); // Default value
    });
  });
});