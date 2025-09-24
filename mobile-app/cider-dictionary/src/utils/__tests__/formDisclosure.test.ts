import {
  FormDisclosureManager,
  FORM_FIELD_CONFIGS
} from '../formDisclosure';
import { DisclosureLevel } from '../../types/cider';

describe('Form Disclosure Manager', () => {
  describe('Field Visibility', () => {
    it('should return correct visible fields for casual level', () => {
      const visibleFields = FormDisclosureManager.getVisibleFields('casual');

      expect(visibleFields.length).toBeGreaterThan(0);

      // Check that core fields are included
      const fieldKeys = visibleFields.map(field => field.key);
      expect(fieldKeys).toContain('name');
      expect(fieldKeys).toContain('brand');
      expect(fieldKeys).toContain('abv');
      expect(fieldKeys).toContain('overallRating');
    });

    it('should return more fields for enthusiast level', () => {
      const casualFields = FormDisclosureManager.getVisibleFields('casual');
      const enthusiastFields = FormDisclosureManager.getVisibleFields('enthusiast');

      expect(enthusiastFields.length).toBeGreaterThanOrEqual(casualFields.length);
    });

    it('should return most fields for expert level', () => {
      const enthusiastFields = FormDisclosureManager.getVisibleFields('enthusiast');
      const expertFields = FormDisclosureManager.getVisibleFields('expert');

      expect(expertFields.length).toBeGreaterThanOrEqual(enthusiastFields.length);
    });
  });

  describe('Field Requirements', () => {
    it('should identify required fields correctly', () => {
      const requiredFields = FormDisclosureManager.getRequiredFields('casual');

      expect(requiredFields.length).toBeGreaterThan(0);

      const fieldKeys = requiredFields.map(field => field.key);
      expect(fieldKeys).toContain('name');
      expect(fieldKeys).toContain('brand');
      expect(fieldKeys).toContain('abv');
      expect(fieldKeys).toContain('overallRating');
    });

    it('should check field requirement status', () => {
      expect(FormDisclosureManager.isFieldRequired('name', 'casual')).toBe(true);
      expect(FormDisclosureManager.isFieldRequired('photo', 'casual')).toBe(false);
    });

    it('should check field visibility', () => {
      expect(FormDisclosureManager.isFieldVisible('name', 'casual')).toBe(true);
      expect(FormDisclosureManager.isFieldVisible('name', 'enthusiast')).toBe(true);
      expect(FormDisclosureManager.isFieldVisible('name', 'expert')).toBe(true);
    });
  });

  describe('Form Completeness', () => {
    it('should calculate form completeness correctly', () => {
      const formData = {
        name: 'Test Cider',
        brand: 'Test Brand',
        abv: 5.0,
        overallRating: 8 as any
      };

      const validationState = {
        name: { isValid: true, errors: [], warnings: [], suggestions: [], showFeedback: true },
        brand: { isValid: true, errors: [], warnings: [], suggestions: [], showFeedback: true },
        abv: { isValid: true, errors: [], warnings: [], suggestions: [], showFeedback: true },
        overallRating: { isValid: true, errors: [], warnings: [], suggestions: [], showFeedback: true }
      };

      const completeness = FormDisclosureManager.calculateFormCompleteness(
        formData,
        'casual',
        validationState
      );

      expect(completeness.percentage).toBe(100);
      expect(completeness.canSubmit).toBe(true);
      expect(completeness.missingFields).toEqual([]);
    });

    it('should identify missing required fields', () => {
      const formData = {
        name: 'Test Cider'
        // Missing other required fields
      };

      const validationState = {
        name: { isValid: true, errors: [], warnings: [], suggestions: [], showFeedback: true }
      };

      const completeness = FormDisclosureManager.calculateFormCompleteness(
        formData,
        'casual',
        validationState
      );

      expect(completeness.percentage).toBeLessThan(100);
      expect(completeness.canSubmit).toBe(false);
      expect(completeness.missingFields.length).toBeGreaterThan(0);
    });
  });

  describe('Level Progression', () => {
    it('should return next disclosure level', () => {
      expect(FormDisclosureManager.getNextLevel('casual')).toBe('enthusiast');
      expect(FormDisclosureManager.getNextLevel('enthusiast')).toBe('expert');
      expect(FormDisclosureManager.getNextLevel('expert')).toBeNull();
    });

    it('should return target times', () => {
      expect(FormDisclosureManager.getTargetTime('casual')).toBe(30);
      expect(FormDisclosureManager.getTargetTime('enthusiast')).toBe(120);
      expect(FormDisclosureManager.getTargetTime('expert')).toBe(300);
    });
  });

  describe('Form State Creation', () => {
    it('should create initial form state', () => {
      const formState = FormDisclosureManager.createInitialFormState('casual', 'user1');

      expect(formState.disclosureLevel).toBe('casual');
      expect(formState.formData.userId).toBe('user1');
      expect(formState.formData.overallRating).toBe(5);
      expect(formState.isSubmitting).toBe(false);
      expect(formState.startTime).toBeGreaterThan(0);
    });
  });
});