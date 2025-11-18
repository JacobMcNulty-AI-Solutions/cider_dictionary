import { QuickEntryForm, FormValidationErrors, Rating, VALIDATION_CONSTANTS } from '../types/cider';

/**
 * Validates a rating value and returns it as a properly typed Rating
 */
export function validateRating(value: number): Rating {
  const roundedValue = Math.round(value);
  if (roundedValue < VALIDATION_CONSTANTS.RATING_MIN || roundedValue > VALIDATION_CONSTANTS.RATING_MAX) {
    return 5; // Default to middle rating if invalid
  }
  return roundedValue as Rating;
}

/**
 * Validates ABV value
 */
export function validateAbv(value: number): boolean {
  return value >= VALIDATION_CONSTANTS.ABV_MIN && value <= VALIDATION_CONSTANTS.ABV_MAX;
}

/**
 * Validates form fields and returns structured errors
 */
export function validateQuickEntryForm(formData: QuickEntryForm): {
  isValid: boolean;
  errors: FormValidationErrors;
} {
  const errors: FormValidationErrors = {};

  // Name validation
  if (!formData.name.trim()) {
    errors.name = 'Cider name is required';
  } else if (formData.name.trim().length > VALIDATION_CONSTANTS.MAX_NAME_LENGTH) {
    errors.name = `Name must be less than ${VALIDATION_CONSTANTS.MAX_NAME_LENGTH} characters`;
  }

  // Brand validation
  if (!formData.brand.trim()) {
    errors.brand = 'Brand is required';
  } else if (formData.brand.trim().length > VALIDATION_CONSTANTS.MAX_BRAND_LENGTH) {
    errors.brand = `Brand must be less than ${VALIDATION_CONSTANTS.MAX_BRAND_LENGTH} characters`;
  }

  // ABV validation
  if (!validateAbv(formData.abv)) {
    errors.abv = `ABV must be between ${VALIDATION_CONSTANTS.ABV_MIN}% and ${VALIDATION_CONSTANTS.ABV_MAX}%`;
  }

  // Rating validation (should always be valid due to Rating type, but check anyway)
  if (formData.overallRating < VALIDATION_CONSTANTS.RATING_MIN || formData.overallRating > VALIDATION_CONSTANTS.RATING_MAX) {
    errors.overallRating = `Rating must be between ${VALIDATION_CONSTANTS.RATING_MIN} and ${VALIDATION_CONSTANTS.RATING_MAX}`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Sanitizes form input to prevent common issues
 */
export function sanitizeFormData(formData: QuickEntryForm): QuickEntryForm {
  return {
    name: formData.name.trim(),
    brand: formData.brand.trim(),
    abv: Math.round(formData.abv * 10) / 10, // Round to 1 decimal place
    overallRating: validateRating(formData.overallRating),
  };
}