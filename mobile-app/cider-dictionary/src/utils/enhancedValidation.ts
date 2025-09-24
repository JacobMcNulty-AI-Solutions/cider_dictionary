// Enhanced Real-Time Validation System for Phase 2
// Provides detailed validation feedback, warnings, and suggestions

import {
  ValidationResult,
  FieldValidationState,
  CiderMasterRecord,
  Rating,
  VALIDATION_CONSTANTS,
  TraditionalStyle,
  ContainerType,
  AppleCategory
} from '../types/cider';
import { FormFieldConfig, ValidationRule } from './formDisclosure';

// =============================================================================
// VALIDATION ENGINE
// =============================================================================

export class ValidationEngine {
  /**
   * Validate a field value with comprehensive feedback
   */
  static validateField(
    fieldKey: keyof CiderMasterRecord,
    value: any,
    fieldConfig?: FormFieldConfig,
    allFormData?: Partial<CiderMasterRecord>
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Skip validation for undefined/null optional fields
    if ((value === undefined || value === null || value === '') && !fieldConfig?.required) {
      result.isValid = true;
      return result;
    }

    // Field-specific validation
    switch (fieldKey) {
      case 'name':
        return this.validateCiderName(value);
      case 'brand':
        return this.validateBrandName(value);
      case 'abv':
        return this.validateABV(value);
      case 'overallRating':
        return this.validateRating(value);
      case 'notes':
        return this.validateNotes(value);
      case 'traditionalStyle':
        return this.validateTraditionalStyle(value);
      case 'tasteTags':
        return this.validateTasteTags(value);
      case 'containerType':
        return this.validateContainerType(value);
      case 'basicCharacteristics':
        return this.validateBasicCharacteristics(value);
      case 'appleClassification':
        return this.validateAppleClassification(value);
      case 'productionMethods':
        return this.validateProductionMethods(value);
      case 'detailedRatings':
        return this.validateDetailedRatings(value);
      case 'venue':
        return this.validateVenue(value);
      default:
        result.isValid = true;
        return result;
    }
  }

  /**
   * Validate cider name with detailed feedback
   */
  static validateCiderName(name: string): ValidationResult {
    const result: ValidationResult = { isValid: false, errors: [], warnings: [], suggestions: [] };

    if (!name || typeof name !== 'string') {
      result.errors.push('Cider name is required');
      return result;
    }

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      result.errors.push('Cider name cannot be empty');
      return result;
    }

    if (trimmedName.length < VALIDATION_CONSTANTS.NAME_MIN_LENGTH) {
      result.errors.push(`Cider name must be at least ${VALIDATION_CONSTANTS.NAME_MIN_LENGTH} characters`);
      return result;
    }

    if (trimmedName.length > VALIDATION_CONSTANTS.NAME_MAX_LENGTH) {
      result.errors.push(`Cider name must be less than ${VALIDATION_CONSTANTS.NAME_MAX_LENGTH} characters`);
      return result;
    }

    // Warnings and suggestions
    if (name !== trimmedName) {
      result.warnings.push('Extra spaces will be removed');
    }

    if (trimmedName.toUpperCase() === trimmedName && trimmedName.length > 3) {
      result.suggestions.push('Consider using normal capitalization');
    }

    if (trimmedName.toLowerCase() === trimmedName && trimmedName.length > 3) {
      result.suggestions.push('Consider capitalizing the first letter');
    }

    // Check for common patterns
    if (/\d+%/.test(trimmedName)) {
      result.suggestions.push('ABV is recorded separately - consider removing percentage from name');
    }

    if (/ml|cl|l$/i.test(trimmedName)) {
      result.suggestions.push('Volume information can be added separately');
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate brand name with detailed feedback
   */
  static validateBrandName(brand: string): ValidationResult {
    const result: ValidationResult = { isValid: false, errors: [], warnings: [], suggestions: [] };

    if (!brand || typeof brand !== 'string') {
      result.errors.push('Brand name is required');
      return result;
    }

    const trimmedBrand = brand.trim();

    if (trimmedBrand.length === 0) {
      result.errors.push('Brand name cannot be empty');
      return result;
    }

    if (trimmedBrand.length < VALIDATION_CONSTANTS.BRAND_MIN_LENGTH) {
      result.errors.push(`Brand name must be at least ${VALIDATION_CONSTANTS.BRAND_MIN_LENGTH} characters`);
      return result;
    }

    if (trimmedBrand.length > VALIDATION_CONSTANTS.BRAND_MAX_LENGTH) {
      result.errors.push(`Brand name must be less than ${VALIDATION_CONSTANTS.BRAND_MAX_LENGTH} characters`);
      return result;
    }

    // Warnings and suggestions
    if (brand !== trimmedBrand) {
      result.warnings.push('Extra spaces will be removed');
    }

    // Common UK brand recognition
    const commonBrands = ['Angry Orchard', 'Strongbow', 'Magners', 'Bulmers', 'Aspall', 'Westons'];
    const lowerBrand = trimmedBrand.toLowerCase();
    const similarBrand = commonBrands.find(b => b.toLowerCase().includes(lowerBrand) || lowerBrand.includes(b.toLowerCase()));

    if (similarBrand && similarBrand.toLowerCase() !== lowerBrand) {
      result.suggestions.push(`Did you mean "${similarBrand}"?`);
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate ABV with contextual feedback
   */
  static validateABV(abv: any): ValidationResult {
    const result: ValidationResult = { isValid: false, errors: [], warnings: [], suggestions: [] };

    if (abv === undefined || abv === null || abv === '') {
      result.errors.push('ABV is required');
      return result;
    }

    const numericABV = parseFloat(abv);

    if (isNaN(numericABV)) {
      result.errors.push('ABV must be a number');
      return result;
    }

    if (numericABV < VALIDATION_CONSTANTS.ABV_MIN) {
      result.errors.push(`ABV cannot be less than ${VALIDATION_CONSTANTS.ABV_MIN}%`);
      return result;
    }

    if (numericABV > VALIDATION_CONSTANTS.ABV_MAX) {
      result.errors.push(`ABV cannot exceed ${VALIDATION_CONSTANTS.ABV_MAX}%`);
      return result;
    }

    // Contextual warnings
    if (numericABV < 3) {
      result.warnings.push('ABV is unusually low for cider (typically 3-12%)');
    } else if (numericABV > 12) {
      result.warnings.push('ABV is unusually high for cider (typically 3-12%)');
    }

    if (numericABV > 8 && numericABV <= 12) {
      result.suggestions.push('This might be a strong/premium cider');
    } else if (numericABV >= 12) {
      result.suggestions.push('This might be an ice cider or specialty high-alcohol cider');
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate rating with feedback
   */
  static validateRating(rating: any): ValidationResult {
    const result: ValidationResult = { isValid: false, errors: [], warnings: [], suggestions: [] };

    if (rating === undefined || rating === null) {
      result.errors.push('Rating is required');
      return result;
    }

    const numericRating = Number(rating);

    if (isNaN(numericRating)) {
      result.errors.push('Rating must be a number');
      return result;
    }

    if (numericRating < VALIDATION_CONSTANTS.RATING_MIN) {
      result.errors.push(`Rating must be at least ${VALIDATION_CONSTANTS.RATING_MIN}`);
      return result;
    }

    if (numericRating > VALIDATION_CONSTANTS.RATING_MAX) {
      result.errors.push(`Rating cannot exceed ${VALIDATION_CONSTANTS.RATING_MAX}`);
      return result;
    }

    // No additional warnings/suggestions for ratings - they're subjective
    result.isValid = true;
    return result;
  }

  /**
   * Validate notes field
   */
  static validateNotes(notes: string): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [], suggestions: [] };

    if (!notes || typeof notes !== 'string') {
      return result; // Notes are optional
    }

    if (notes.length > VALIDATION_CONSTANTS.NOTES_MAX_LENGTH) {
      result.errors.push(`Notes must be less than ${VALIDATION_CONSTANTS.NOTES_MAX_LENGTH} characters`);
      result.isValid = false;
      return result;
    }

    // Suggestions for better notes
    if (notes.length > 500) {
      result.warnings.push('Consider keeping notes concise for easier reading');
    }

    if (notes.trim().length < 10 && notes.trim().length > 0) {
      result.suggestions.push('Consider adding more detail to your notes');
    }

    return result;
  }

  /**
   * Validate traditional style selection
   */
  static validateTraditionalStyle(style: any): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [], suggestions: [] };

    if (!style) {
      return result; // Optional field
    }

    const validStyles: TraditionalStyle[] = [
      'traditional_english', 'modern_craft', 'heritage', 'international',
      'fruit_cider', 'perry', 'ice_cider', 'other'
    ];

    if (!validStyles.includes(style)) {
      result.errors.push('Please select a valid traditional style');
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validate taste tags array
   */
  static validateTasteTags(tags: any): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [], suggestions: [] };

    if (!tags) {
      return result; // Optional field
    }

    if (!Array.isArray(tags)) {
      result.errors.push('Taste tags must be a list');
      result.isValid = false;
      return result;
    }

    if (tags.length > VALIDATION_CONSTANTS.TASTE_TAGS_MAX) {
      result.errors.push(`Maximum ${VALIDATION_CONSTANTS.TASTE_TAGS_MAX} taste tags allowed`);
      result.isValid = false;
    }

    // Validate individual tags
    for (const tag of tags) {
      if (typeof tag !== 'string' || tag.length > VALIDATION_CONSTANTS.TASTE_TAG_MAX_LENGTH) {
        result.errors.push(`Each taste tag must be less than ${VALIDATION_CONSTANTS.TASTE_TAG_MAX_LENGTH} characters`);
        result.isValid = false;
        break;
      }
    }

    if (tags.length > 5) {
      result.warnings.push('Consider focusing on the most distinctive taste characteristics');
    }

    return result;
  }

  /**
   * Validate container type
   */
  static validateContainerType(container: any): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [], suggestions: [] };

    if (!container) {
      return result; // Optional field
    }

    const validContainers: ContainerType[] = ['bottle', 'can', 'bag_in_box', 'draught', 'other'];

    if (!validContainers.includes(container)) {
      result.errors.push('Please select a valid container type');
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validate basic characteristics object
   */
  static validateBasicCharacteristics(characteristics: any): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [], suggestions: [] };

    if (!characteristics) {
      return result; // Optional field
    }

    if (typeof characteristics !== 'object') {
      result.errors.push('Basic characteristics must be an object');
      result.isValid = false;
      return result;
    }

    const { sweetness, carbonation, clarity } = characteristics;

    // Validate sweetness
    if (sweetness) {
      const validSweetness = ['bone_dry', 'dry', 'off_dry', 'medium', 'sweet'];
      if (!validSweetness.includes(sweetness)) {
        result.errors.push('Invalid sweetness level');
        result.isValid = false;
      }
    }

    // Validate carbonation
    if (carbonation) {
      const validCarbonation = ['still', 'light_sparkling', 'sparkling', 'highly_carbonated'];
      if (!validCarbonation.includes(carbonation)) {
        result.errors.push('Invalid carbonation level');
        result.isValid = false;
      }
    }

    // Validate clarity
    if (clarity) {
      const validClarity = ['crystal_clear', 'clear', 'hazy', 'cloudy', 'opaque'];
      if (!validClarity.includes(clarity)) {
        result.errors.push('Invalid clarity level');
        result.isValid = false;
      }
    }

    return result;
  }

  // Simplified validation methods for expert fields
  static validateAppleClassification(classification: any): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [], suggestions: [] };
    // Implementation would validate apple categories and varieties
    return result;
  }

  static validateProductionMethods(methods: any): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [], suggestions: [] };
    // Implementation would validate fermentation and special processes
    return result;
  }

  static validateDetailedRatings(ratings: any): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [], suggestions: [] };

    if (!ratings) {
      return result; // Optional field
    }

    if (typeof ratings !== 'object') {
      result.errors.push('Detailed ratings must be an object');
      result.isValid = false;
      return result;
    }

    // Validate each rating component
    const components = ['appearance', 'aroma', 'taste', 'mouthfeel'];
    for (const component of components) {
      if (ratings[component] !== undefined) {
        const componentValidation = this.validateRating(ratings[component]);
        if (!componentValidation.isValid) {
          result.errors.push(`Invalid ${component} rating: ${componentValidation.errors.join(', ')}`);
          result.isValid = false;
        }
      }
    }

    return result;
  }

  static validateVenue(venue: any): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [], suggestions: [] };

    if (!venue) {
      return result; // Optional field
    }

    if (typeof venue === 'string') {
      // Simple venue name validation
      if (venue.length > VALIDATION_CONSTANTS.VENUE_NAME_MAX_LENGTH) {
        result.errors.push(`Venue name must be less than ${VALIDATION_CONSTANTS.VENUE_NAME_MAX_LENGTH} characters`);
        result.isValid = false;
      }
    } else if (typeof venue === 'object') {
      // Venue object validation
      if (!venue.name || venue.name.length > VALIDATION_CONSTANTS.VENUE_NAME_MAX_LENGTH) {
        result.errors.push('Valid venue name is required');
        result.isValid = false;
      }
    }

    return result;
  }
}

// =============================================================================
// REAL-TIME VALIDATION UTILITIES
// =============================================================================

/**
 * Debounced validation for real-time feedback
 */
export function createDebouncedValidator(
  validationFn: (...args: any[]) => ValidationResult,
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout;

  return (...args: any[]): Promise<ValidationResult> => {
    return new Promise((resolve) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        resolve(validationFn(...args));
      }, delay);
    });
  };
}

/**
 * Batch validate multiple fields
 */
export function validateMultipleFields(
  formData: Partial<CiderMasterRecord>,
  fieldKeys: (keyof CiderMasterRecord)[]
): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {};

  for (const fieldKey of fieldKeys) {
    results[fieldKey] = ValidationEngine.validateField(fieldKey, formData[fieldKey], undefined, formData);
  }

  return results;
}

/**
 * Check if form has any validation errors
 */
export function hasValidationErrors(validationState: Record<string, FieldValidationState>): boolean {
  return Object.values(validationState).some(state => !state.isValid);
}

/**
 * Get all validation error messages
 */
export function getAllValidationErrors(validationState: Record<string, FieldValidationState>): string[] {
  return Object.values(validationState)
    .filter(state => !state.isValid)
    .flatMap(state => state.errors);
}

/**
 * Get field-level validation summary
 */
export function getValidationSummary(validationState: Record<string, FieldValidationState>): {
  totalFields: number;
  validFields: number;
  invalidFields: number;
  warnings: number;
} {
  const states = Object.values(validationState);

  return {
    totalFields: states.length,
    validFields: states.filter(state => state.isValid).length,
    invalidFields: states.filter(state => !state.isValid).length,
    warnings: states.reduce((sum, state) => sum + state.warnings.length, 0)
  };
}