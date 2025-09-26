// Progressive Disclosure Form Management System
// Handles form field visibility, validation, and completion tracking

import {
  DisclosureLevel,
  CiderMasterRecord,
  DISCLOSURE_CONFIGS,
  QuickEntryFormState,
  FormCompleteness,
  ValidationResult,
  FieldValidationState
} from '../types/cider';

// =============================================================================
// FORM FIELD CONFIGURATION
// =============================================================================

export interface FormFieldConfig {
  key: keyof CiderMasterRecord;
  label: string;
  type: 'text' | 'number' | 'rating' | 'select' | 'multiselect' | 'tags' | 'image';
  required: boolean;
  placeholder: string;
  section: 'core' | 'optional' | 'enthusiast' | 'expert';
  validationRules?: ValidationRule[];
  options?: Array<{ label: string; value: any }>;
  subFields?: Record<string, FormFieldConfig>;
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'range' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => ValidationResult;
}

// Field configuration for progressive disclosure
export const FORM_FIELD_CONFIGS: Record<keyof CiderMasterRecord, FormFieldConfig> = {
  id: { key: 'id', label: 'ID', type: 'text', required: false, placeholder: '', section: 'core' },
  userId: { key: 'userId', label: 'User ID', type: 'text', required: false, placeholder: '', section: 'core' },

  // Core fields - always visible
  name: {
    key: 'name',
    label: 'Cider Name',
    type: 'text',
    required: true,
    placeholder: 'Enter cider name',
    section: 'core',
    validationRules: [
      { type: 'required', message: 'Cider name is required' },
      { type: 'minLength', value: 2, message: 'Name must be at least 2 characters' },
      { type: 'maxLength', value: 100, message: 'Name must be less than 100 characters' }
    ]
  },

  brand: {
    key: 'brand',
    label: 'Brand',
    type: 'text',
    required: true,
    placeholder: 'Enter brand name',
    section: 'core',
    validationRules: [
      { type: 'required', message: 'Brand is required' },
      { type: 'minLength', value: 2, message: 'Brand must be at least 2 characters' },
      { type: 'maxLength', value: 50, message: 'Brand must be less than 50 characters' }
    ]
  },

  abv: {
    key: 'abv',
    label: 'ABV (%)',
    type: 'number',
    required: true,
    placeholder: 'Enter ABV (e.g., 5.2)',
    section: 'core',
    validationRules: [
      { type: 'required', message: 'ABV is required' },
      { type: 'range', value: [0.1, 20], message: 'ABV must be between 0.1% and 20%' }
    ]
  },

  overallRating: {
    key: 'overallRating',
    label: 'Overall Rating',
    type: 'rating',
    required: true,
    placeholder: 'Rate from 1-10',
    section: 'core',
    validationRules: [
      { type: 'required', message: 'Rating is required' },
      { type: 'range', value: [1, 10], message: 'Rating must be between 1 and 10' }
    ]
  },

  // Optional core fields
  photo: {
    key: 'photo',
    label: 'Photo',
    type: 'image',
    required: false,
    placeholder: 'Take a photo',
    section: 'optional'
  },

  notes: {
    key: 'notes',
    label: 'Notes',
    type: 'text',
    required: false,
    placeholder: 'Your thoughts on this cider...',
    section: 'optional',
    validationRules: [
      { type: 'maxLength', value: 1000, message: 'Notes must be less than 1000 characters' }
    ]
  },

  // Enthusiast fields
  traditionalStyle: {
    key: 'traditionalStyle',
    label: 'Traditional Style',
    type: 'select',
    required: false,
    placeholder: 'Select style',
    section: 'enthusiast',
    options: [
      { label: 'Traditional English', value: 'traditional_english' },
      { label: 'Modern Craft', value: 'modern_craft' },
      { label: 'Heritage', value: 'heritage' },
      { label: 'International', value: 'international' },
      { label: 'Fruit Cider', value: 'fruit_cider' },
      { label: 'Perry', value: 'perry' },
      { label: 'Ice Cider', value: 'ice_cider' },
      { label: 'Other', value: 'other' }
    ]
  },

  // Individual characteristic fields (following data model specification)
  sweetness: {
    key: 'sweetness',
    label: 'Sweetness Level',
    type: 'select',
    required: false,
    placeholder: 'Select sweetness level',
    section: 'enthusiast',
    options: [
      { label: 'Bone Dry', value: 'bone_dry' },
      { label: 'Dry', value: 'dry' },
      { label: 'Off-Dry', value: 'off_dry' },
      { label: 'Medium', value: 'medium' },
      { label: 'Sweet', value: 'sweet' }
    ]
  },

  carbonation: {
    key: 'carbonation',
    label: 'Carbonation',
    type: 'select',
    required: false,
    placeholder: 'Select carbonation level',
    section: 'enthusiast',
    options: [
      { label: 'Still', value: 'still' },
      { label: 'Lightly Sparkling (Pétillant)', value: 'lightly_sparkling' },
      { label: 'Sparkling', value: 'sparkling' },
      { label: 'Highly Carbonated', value: 'highly_carbonated' }
    ]
  },

  clarity: {
    key: 'clarity',
    label: 'Clarity',
    type: 'select',
    required: false,
    placeholder: 'Select clarity',
    section: 'enthusiast',
    options: [
      { label: 'Crystal Clear', value: 'crystal_clear' },
      { label: 'Clear', value: 'clear' },
      { label: 'Hazy', value: 'hazy' },
      { label: 'Cloudy', value: 'cloudy' },
      { label: 'Opaque', value: 'opaque' }
    ]
  },

  color: {
    key: 'color',
    label: 'Color',
    type: 'select',
    required: false,
    placeholder: 'Select color',
    section: 'enthusiast',
    options: [
      { label: 'Pale Straw', value: 'pale_straw' },
      { label: 'Golden', value: 'golden' },
      { label: 'Amber', value: 'amber' },
      { label: 'Copper', value: 'copper' },
      { label: 'Ruby', value: 'ruby' },
      { label: 'Pink/Rosé', value: 'pink_rose' },
      { label: 'Dark Amber', value: 'dark_amber' }
    ]
  },

  tasteTags: {
    key: 'tasteTags',
    label: 'Taste Tags',
    type: 'tags',
    required: false,
    placeholder: 'Add taste descriptors',
    section: 'enthusiast',
    validationRules: [
      { type: 'maxLength', value: 10, message: 'Maximum 10 taste tags allowed' }
    ]
  },

  containerType: {
    key: 'containerType',
    label: 'Container Type',
    type: 'select',
    required: false,
    placeholder: 'Select container',
    section: 'enthusiast',
    options: [
      { label: 'Bottle', value: 'bottle' },
      { label: 'Can', value: 'can' },
      { label: 'Bag-in-Box', value: 'bag_in_box' },
      { label: 'Draught', value: 'draught' },
      { label: 'Other', value: 'other' }
    ]
  },

  // Expert fields (simplified for implementation)
  appleClassification: {
    key: 'appleClassification',
    label: 'Apple Classification',
    type: 'multiselect',
    required: false,
    placeholder: 'Select apple categories',
    section: 'expert'
  },

  productionMethods: {
    key: 'productionMethods',
    label: 'Production Methods',
    type: 'multiselect',
    required: false,
    placeholder: 'Select production methods',
    section: 'expert'
  },

  detailedRatings: {
    key: 'detailedRatings',
    label: 'Detailed Ratings',
    type: 'characteristics',
    required: false,
    placeholder: 'Rate individual aspects',
    section: 'expert'
  },

  venue: {
    key: 'venue',
    label: 'Venue',
    type: 'text',
    required: false,
    placeholder: 'Where did you try this?',
    section: 'expert'
  },

  // System fields
  createdAt: { key: 'createdAt', label: 'Created', type: 'text', required: false, placeholder: '', section: 'core' },
  updatedAt: { key: 'updatedAt', label: 'Updated', type: 'text', required: false, placeholder: '', section: 'core' },
  syncStatus: { key: 'syncStatus', label: 'Sync Status', type: 'text', required: false, placeholder: '', section: 'core' },
  version: { key: 'version', label: 'Version', type: 'number', required: false, placeholder: '', section: 'core' }
};

// =============================================================================
// FORM STATE MANAGEMENT
// =============================================================================

export class FormDisclosureManager {
  /**
   * Get fields visible at the current disclosure level
   */
  static getVisibleFields(level: DisclosureLevel): FormFieldConfig[] {
    const config = DISCLOSURE_CONFIGS[level];
    const allFields = [...config.fields, ...config.optional];

    return allFields
      .map(fieldKey => FORM_FIELD_CONFIGS[fieldKey])
      .filter(field => field !== undefined);
  }

  /**
   * Get required fields for the current disclosure level
   */
  static getRequiredFields(level: DisclosureLevel): FormFieldConfig[] {
    const config = DISCLOSURE_CONFIGS[level];

    return config.fields
      .map(fieldKey => FORM_FIELD_CONFIGS[fieldKey])
      .filter(field => field !== undefined);
  }

  /**
   * Check if a field should be visible at the current level
   */
  static isFieldVisible(fieldKey: keyof CiderMasterRecord, level: DisclosureLevel): boolean {
    const config = DISCLOSURE_CONFIGS[level];
    return config.fields.includes(fieldKey) || config.optional.includes(fieldKey);
  }

  /**
   * Check if a field is required at the current level
   */
  static isFieldRequired(fieldKey: keyof CiderMasterRecord, level: DisclosureLevel): boolean {
    const config = DISCLOSURE_CONFIGS[level];
    return config.fields.includes(fieldKey) &&
           FORM_FIELD_CONFIGS[fieldKey]?.required === true;
  }

  /**
   * Calculate form completeness
   */
  static calculateFormCompleteness(
    formData: Partial<CiderMasterRecord>,
    level: DisclosureLevel,
    validationState: Record<string, FieldValidationState>
  ): FormCompleteness {
    const requiredFields = this.getRequiredFields(level);
    const completedFields = requiredFields.filter(field => {
      const value = formData[field.key];
      const validation = validationState[field.key];
      return value !== undefined && value !== '' && value !== null &&
             (validation?.isValid !== false);
    });

    const percentage = requiredFields.length > 0
      ? (completedFields.length / requiredFields.length) * 100
      : 100;

    const missingFields = requiredFields
      .filter(field => {
        const value = formData[field.key];
        const validation = validationState[field.key];
        return !value || value === '' || validation?.isValid === false;
      })
      .map(field => field.key as string);

    return {
      percentage,
      canSubmit: percentage === 100,
      missingFields
    };
  }

  /**
   * Get the next disclosure level
   */
  static getNextLevel(currentLevel: DisclosureLevel): DisclosureLevel | null {
    switch (currentLevel) {
      case 'casual':
        return 'enthusiast';
      case 'enthusiast':
        return 'expert';
      case 'expert':
        return null;
      default:
        return null;
    }
  }

  /**
   * Get target completion time for current level
   */
  static getTargetTime(level: DisclosureLevel): number {
    return DISCLOSURE_CONFIGS[level].targetTime;
  }

  /**
   * Create initial form state
   */
  static createInitialFormState(
    level: DisclosureLevel = 'casual',
    userId: string = 'default-user'
  ): QuickEntryFormState {
    return {
      disclosureLevel: level,
      formData: {
        userId,
        overallRating: 5 as any // Default rating
      },
      validationState: {},
      fieldStates: {},
      formCompleteness: {
        percentage: 0,
        canSubmit: false,
        missingFields: this.getRequiredFields(level).map(field => field.key as string)
      },
      duplicateWarning: null,
      isSubmitting: false,
      startTime: Date.now()
    };
  }

  /**
   * Update form state with new field value
   */
  static updateFormState(
    currentState: QuickEntryFormState,
    fieldKey: keyof CiderMasterRecord,
    value: any,
    validationResult?: ValidationResult
  ): Partial<QuickEntryFormState> {
    const newFormData = {
      ...currentState.formData,
      [fieldKey]: value
    };

    const newValidationState = validationResult ? {
      ...currentState.validationState,
      [fieldKey]: {
        isValid: validationResult.isValid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        suggestions: validationResult.suggestions,
        showFeedback: true
      }
    } : currentState.validationState;

    const newFieldStates = validationResult ? {
      ...currentState.fieldStates,
      [fieldKey]: validationResult.isValid ? 'valid' as const : 'error' as const
    } : currentState.fieldStates;

    const formCompleteness = this.calculateFormCompleteness(
      newFormData,
      currentState.disclosureLevel,
      newValidationState
    );

    return {
      formData: newFormData,
      validationState: newValidationState,
      fieldStates: newFieldStates,
      formCompleteness
    };
  }
}

// =============================================================================
// FORM SECTION CONFIGURATION
// =============================================================================

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormFieldConfig[];
  collapsible: boolean;
  defaultExpanded: boolean;
  requiredForLevel: DisclosureLevel[];
}

/**
 * Get form sections for the current disclosure level
 */
export function getFormSections(level: DisclosureLevel): FormSection[] {
  const visibleFields = FormDisclosureManager.getVisibleFields(level);

  const sections: FormSection[] = [
    {
      id: 'core',
      title: 'Essential Details',
      description: level === 'casual' ? 'Quick 30-second entry' : 'Basic cider information',
      fields: visibleFields.filter(field => field.section === 'core'),
      collapsible: false,
      defaultExpanded: true,
      requiredForLevel: ['casual', 'enthusiast', 'expert']
    }
  ];

  if (level !== 'casual') {
    sections.push({
      id: 'enthusiast',
      title: 'Additional Details',
      description: 'More comprehensive cider characteristics',
      fields: visibleFields.filter(field => field.section === 'enthusiast'),
      collapsible: true,
      defaultExpanded: level === 'enthusiast',
      requiredForLevel: ['enthusiast', 'expert']
    });
  }

  if (level === 'expert') {
    sections.push({
      id: 'expert',
      title: 'Expert Classification',
      description: 'Detailed technical information',
      fields: visibleFields.filter(field => field.section === 'expert'),
      collapsible: true,
      defaultExpanded: false,
      requiredForLevel: ['expert']
    });
  }

  // Optional section for all levels
  sections.push({
    id: 'optional',
    title: 'Optional',
    fields: visibleFields.filter(field => field.section === 'optional'),
    collapsible: true,
    defaultExpanded: false,
    requiredForLevel: []
  });

  return sections.filter(section => section.fields.length > 0);
}