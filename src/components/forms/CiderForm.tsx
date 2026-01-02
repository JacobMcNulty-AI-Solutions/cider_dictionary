// CiderForm - Reusable form component for adding and editing ciders
// Used by both EnhancedQuickEntryScreen (add) and CiderEditScreen (edit)

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  Alert
} from 'react-native';
import { CiderMasterRecord, Rating } from '../../types/cider';
import { useCiderStore } from '../../store/ciderStore';
import ValidatedInput from './ValidatedInput';
import RatingInput from '../common/RatingInput';
import SelectInput from './SelectInput';
import TagSelector from './TagSelector';
import { ImagePicker } from './ImagePicker';
import Button from '../common/Button';

// =============================================================================
// TYPES
// =============================================================================

export interface CiderFormProps {
  initialData?: Partial<CiderMasterRecord>;
  onSubmit: (data: Partial<CiderMasterRecord>) => Promise<void>;
  onCancel: () => void;
  submitButtonText: string;
  isEdit?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
}

export interface FormValidationErrors {
  name?: string;
  brand?: string;
  abv?: string;
  overallRating?: string;
  [key: string]: string | undefined;
}

// =============================================================================
// FORM SECTION DEFINITIONS
// =============================================================================

const FORM_SECTIONS = [
  {
    id: 'core',
    title: 'Essential Details',
    description: 'Required information',
    fields: [
      { key: 'name', label: 'Cider Name', type: 'text', required: true, placeholder: 'Enter cider name' },
      { key: 'brand', label: 'Brand', type: 'text', required: true, placeholder: 'Enter brand name' },
      { key: 'abv', label: 'ABV (%)', type: 'number', required: true, placeholder: 'Enter ABV (e.g., 5.2)' },
      { key: 'overallRating', label: 'Overall Rating', type: 'rating', required: true, placeholder: 'Rate from 1-10' },
    ],
    collapsible: false,
    defaultExpanded: true,
  },
  {
    id: 'basic_characteristics',
    title: 'Cider Characteristics',
    description: 'Core characteristics and tasting notes',
    fields: [
      { key: 'traditionalStyle', label: 'Traditional Style', type: 'select', required: false, placeholder: 'Select style (optional)', options: [
        { label: 'West Country Traditional', value: 'west_country_traditional' },
        { label: 'Eastern England Traditional', value: 'eastern_england_traditional' },
        { label: 'French Normandy/Brittany', value: 'french_normandy_brittany' },
        { label: 'Spanish Sidra', value: 'spanish_sidra' },
        { label: 'German Apfelwein', value: 'german_apfelwein' },
        { label: 'Modern/New World', value: 'modern_new_world' },
        { label: 'American Traditional', value: 'american_traditional' },
        { label: 'Other Regional', value: 'other_regional' }
      ]},
      { key: 'sweetness', label: 'Sweetness Level', type: 'select', required: false, placeholder: 'Select sweetness (optional)', options: [
        { label: 'Bone Dry', value: 'bone_dry' },
        { label: 'Dry', value: 'dry' },
        { label: 'Off Dry', value: 'off_dry' },
        { label: 'Medium', value: 'medium' },
        { label: 'Sweet', value: 'sweet' }
      ]},
      { key: 'carbonation', label: 'Carbonation', type: 'select', required: false, placeholder: 'Select carbonation (optional)', options: [
        { label: 'Still', value: 'still' },
        { label: 'Lightly Sparkling', value: 'lightly_sparkling' },
        { label: 'Sparkling', value: 'sparkling' },
        { label: 'Highly Carbonated', value: 'highly_carbonated' }
      ]},
      { key: 'clarity', label: 'Clarity', type: 'select', required: false, placeholder: 'Select clarity (optional)', options: [
        { label: 'Crystal Clear', value: 'crystal_clear' },
        { label: 'Clear', value: 'clear' },
        { label: 'Hazy', value: 'hazy' },
        { label: 'Cloudy', value: 'cloudy' },
        { label: 'Opaque', value: 'opaque' }
      ]},
      { key: 'color', label: 'Color', type: 'select', required: false, placeholder: 'Select color (optional)', options: [
        { label: 'Pale Straw', value: 'pale_straw' },
        { label: 'Golden', value: 'golden' },
        { label: 'Amber', value: 'amber' },
        { label: 'Copper', value: 'copper' },
        { label: 'Ruby', value: 'ruby' },
        { label: 'Pink/Rose', value: 'pink_rose' },
        { label: 'Dark Amber', value: 'dark_amber' }
      ]},
      { key: 'tasteTags', label: 'Taste Profile', type: 'tags', required: false, placeholder: 'Add taste descriptors (optional)', options: [
        'Dry', 'Sweet', 'Tart', 'Sharp', 'Crisp', 'Smooth', 'Refreshing',
        'Fresh Apple', 'Cooked Apple', 'Green Apple', 'Red Apple', 'Apple Pie', 'Orchard Fresh',
        'Fruity', 'Citrus', 'Tropical', 'Berry', 'Stone Fruit', 'Floral', 'Honey', 'Vanilla', 'Oak', 'Spicy', 'Herbal', 'Earthy', 'Funky', 'Yeasty',
        'Light-bodied', 'Medium-bodied', 'Full-bodied', 'Fizzy', 'Still', 'Creamy', 'Astringent', 'Tannic', 'Balanced', 'Complex'
      ] },
      { key: 'notes', label: 'Tasting Notes', type: 'text', required: false, placeholder: 'Personal notes about this cider (optional)', multiline: true },
      { key: 'photo', label: 'Photo', type: 'image', required: false, placeholder: 'Add a photo (optional)' },
    ],
    collapsible: true,
    defaultExpanded: false,
  },
  {
    id: 'apple_classification',
    title: 'Apple Classification',
    description: 'Apple varieties and classification details',
    fields: [
      { key: 'appleCategories', label: 'Apple Categories (Long Ashton)', type: 'multiselect', required: false, placeholder: 'Select categories (optional)', options: [
        { label: 'Bittersweet (high tannin, low acid)', value: 'bittersweet' },
        { label: 'Bittersharp (high tannin, high acid)', value: 'bittersharp' },
        { label: 'Sweet (low tannin, low acid)', value: 'sweet' },
        { label: 'Sharp (low tannin, high acid)', value: 'sharp' },
        { label: 'Culinary/Dessert Apples', value: 'culinary_dessert' },
        { label: 'Unknown/Blend', value: 'unknown_blend' }
      ]},
      { key: 'appleVarieties', label: 'Apple Varieties', type: 'tags', required: false, placeholder: 'Add specific apple varieties (optional)', options: [
        'Kingston Black', 'Dabinett', 'Yarlington Mill', 'Harry Masters Jersey', 'Tremlett\'s Bitter', 'Court Royal', 'Foxwhelp', 'Somerset Redstreak',
        'Bramley\'s Seedling', 'Cox\'s Orange Pippin', 'Braeburn', 'Pink Lady', 'Gala', 'Discovery'
      ] },
    ],
    collapsible: true,
    defaultExpanded: false,
  },
  {
    id: 'production_methods',
    title: 'Production Methods',
    description: 'Fermentation and special production processes',
    fields: [
      { key: 'fermentation', label: 'Fermentation Type', type: 'select', required: false, placeholder: 'Select fermentation (optional)', options: [
        { label: 'Wild/Spontaneous', value: 'wild_spontaneous' },
        { label: 'Cultured Yeast', value: 'cultured_yeast' },
        { label: 'Mixed Fermentation', value: 'mixed_fermentation' },
        { label: 'Unknown', value: 'unknown' }
      ]},
      { key: 'specialProcesses', label: 'Special Processes', type: 'multiselect', required: false, placeholder: 'Select processes (optional)', options: [
        { label: 'Keeved', value: 'keeved' },
        { label: 'Pet-nat (Methode Ancestrale)', value: 'pet_nat_methode_ancestrale' },
        { label: 'Barrel-aged', value: 'barrel_aged' },
        { label: 'Ice Cider', value: 'ice_cider' },
        { label: 'Pasteurized', value: 'pasteurized' },
        { label: 'Sterile Filtered', value: 'sterile_filtered' },
        { label: 'Bottle Conditioned', value: 'bottle_conditioned' },
        { label: 'Sour/Brett Fermented', value: 'sour_brett_fermented' },
        { label: 'Fortified', value: 'fortified' },
        { label: 'Solera Aged', value: 'solera_aged' }
      ]},
    ],
    collapsible: true,
    defaultExpanded: false,
  },
  {
    id: 'additives_ingredients',
    title: 'Additives & Ingredients',
    description: 'Fruit additions, hops, spices, and wood aging',
    fields: [
      { key: 'fruitAdditions', label: 'Fruit Additions', type: 'multiselect', required: false, placeholder: 'Select fruit additions (optional)', options: [
        { label: 'Pure Apple Cider', value: 'pure_apple' },
        { label: 'Traditional Perry Pears', value: 'traditional_perry_pears' },
        { label: 'Dessert Pears', value: 'dessert_pears' },
        { label: 'Blackberry', value: 'blackberry' },
        { label: 'Raspberry', value: 'raspberry' },
        { label: 'Blueberry', value: 'blueberry' },
        { label: 'Elderberry', value: 'elderberry' },
        { label: 'Blackcurrant', value: 'blackcurrant' },
        { label: 'Strawberry', value: 'strawberry' },
        { label: 'Cherry', value: 'cherry' },
        { label: 'Peach', value: 'peach' },
        { label: 'Plum', value: 'plum' },
        { label: 'Apricot', value: 'apricot' },
        { label: 'Pineapple', value: 'pineapple' },
        { label: 'Mango', value: 'mango' },
        { label: 'Passion Fruit', value: 'passion_fruit' },
        { label: 'Coconut', value: 'coconut' },
        { label: 'Other', value: 'other' }
      ]},
      { key: 'hopVarieties', label: 'Hop Varieties', type: 'multiselect', required: false, placeholder: 'Select hop varieties (optional)', options: [
        { label: 'No Hops', value: 'no_hops' },
        { label: 'Citra', value: 'citra' },
        { label: 'Mosaic', value: 'mosaic' },
        { label: 'Cascade', value: 'cascade' },
        { label: 'Amarillo', value: 'amarillo' },
        { label: 'Simcoe', value: 'simcoe' },
        { label: 'Target', value: 'target' },
        { label: 'Fuggle', value: 'fuggle' },
        { label: 'Goldings', value: 'goldings' },
        { label: 'Other', value: 'other' }
      ]},
      { key: 'hopCharacter', label: 'Hop Character', type: 'multiselect', required: false, placeholder: 'Select hop character (optional)', options: [
        { label: 'Citrus', value: 'citrus' },
        { label: 'Floral', value: 'floral' },
        { label: 'Pine/Resin', value: 'pine_resin' },
        { label: 'Earthy/Spicy', value: 'earthy_spicy' }
      ]},
      { key: 'spicesBotanicals', label: 'Spices & Botanicals', type: 'multiselect', required: false, placeholder: 'Select spices/botanicals (optional)', options: [
        { label: 'No Spices/Botanicals', value: 'no_spices_botanicals' },
        { label: 'Cinnamon', value: 'cinnamon' },
        { label: 'Nutmeg', value: 'nutmeg' },
        { label: 'Cloves', value: 'cloves' },
        { label: 'Ginger', value: 'ginger' },
        { label: 'Allspice', value: 'allspice' },
        { label: 'Elderflower', value: 'elderflower' },
        { label: 'Chamomile', value: 'chamomile' },
        { label: 'Lavender', value: 'lavender' },
        { label: 'Hibiscus', value: 'hibiscus' },
        { label: 'Juniper', value: 'juniper' },
        { label: 'Lemongrass', value: 'lemongrass' },
        { label: 'Rosehips', value: 'rosehips' },
        { label: 'Pumpkin Spice', value: 'pumpkin_spice' },
        { label: 'Mulling Spices', value: 'mulling_spices' },
        { label: 'Chai Spices', value: 'chai_spices' },
        { label: 'Other', value: 'other' }
      ]},
      { key: 'woodType', label: 'Wood Type', type: 'multiselect', required: false, placeholder: 'Select wood types (optional)', options: [
        { label: 'No Wood Aging', value: 'no_wood_aging' },
        { label: 'American Oak', value: 'american_oak' },
        { label: 'French Oak', value: 'french_oak' },
        { label: 'English Oak', value: 'english_oak' },
        { label: 'Cherry Wood', value: 'cherry' },
        { label: 'Apple Wood', value: 'apple' },
        { label: 'Chestnut Wood', value: 'chestnut' },
        { label: 'Acacia Wood', value: 'acacia' },
        { label: 'Other Wood', value: 'other' }
      ]},
      { key: 'barrelHistory', label: 'Barrel History', type: 'multiselect', required: false, placeholder: 'Select barrel history (optional)', options: [
        { label: 'Virgin Oak', value: 'virgin_oak' },
        { label: 'Bourbon Barrel', value: 'bourbon_barrel' },
        { label: 'Wine Barrel', value: 'wine_barrel' },
        { label: 'Sherry Barrel', value: 'sherry_barrel' },
        { label: 'Rum Barrel', value: 'rum_barrel' },
        { label: 'Gin Barrel', value: 'gin_barrel' }
      ]},
    ],
    collapsible: true,
    defaultExpanded: false,
  },
  {
    id: 'detailed_ratings',
    title: 'Detailed Ratings',
    description: 'Rate individual aspects of the cider',
    fields: [
      { key: 'appearanceRating', label: 'Appearance Rating', type: 'rating', required: false, placeholder: 'Rate appearance (1-10)' },
      { key: 'aromaRating', label: 'Aroma Rating', type: 'rating', required: false, placeholder: 'Rate aroma (1-10)' },
      { key: 'tasteRating', label: 'Taste Rating', type: 'rating', required: false, placeholder: 'Rate taste (1-10)' },
      { key: 'mouthfeelRating', label: 'Mouthfeel Rating', type: 'rating', required: false, placeholder: 'Rate mouthfeel (1-10)' },
    ],
    collapsible: true,
    defaultExpanded: false,
  }
];

// =============================================================================
// CIDER FORM COMPONENT
// =============================================================================

export default function CiderForm({
  initialData = {},
  onSubmit,
  onCancel,
  submitButtonText,
  isEdit = false,
  onDirtyChange
}: CiderFormProps) {
  // Transform initialData from nested CiderMasterRecord to flat form data
  const transformInitialData = useCallback((data: Partial<CiderMasterRecord>): Record<string, any> => {
    const flatData: Record<string, any> = { ...data };

    // Flatten apple classification
    if (data.appleClassification) {
      flatData.appleCategories = data.appleClassification.categories || [];
      flatData.appleVarieties = data.appleClassification.varieties || [];
    }

    // Flatten production methods
    if (data.productionMethods) {
      flatData.fermentation = data.productionMethods.fermentation || '';
      flatData.specialProcesses = data.productionMethods.specialProcesses || [];
    }

    // Flatten hops
    if (data.hops) {
      flatData.hopVarieties = data.hops.varieties || [];
      flatData.hopCharacter = data.hops.character || [];
    }

    // Flatten wood aging
    if (data.woodAging) {
      flatData.woodType = data.woodAging.woodType || [];
      flatData.barrelHistory = data.woodAging.barrelHistory || [];
    }

    // Flatten detailed ratings
    if (data.detailedRatings) {
      flatData.appearanceRating = data.detailedRatings.appearance;
      flatData.aromaRating = data.detailedRatings.aroma;
      flatData.tasteRating = data.detailedRatings.taste;
      flatData.mouthfeelRating = data.detailedRatings.mouthfeel;
    }

    return flatData;
  }, []);

  // Form state - set default values for required fields
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const transformed = transformInitialData(initialData);
    // Set default rating of 5 if not provided (so user can submit without changing it)
    if (transformed.overallRating === undefined) {
      transformed.overallRating = 5;
    }
    return transformed;
  });
  const [errors, setErrors] = useState<FormValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Duplicate detection (only for new ciders)
  const { ciders, getSimilarCiderNames, getSimilarBrandNames, findDuplicates } = useCiderStore();
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Track dirty state
  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(isDirty);
    }
  }, [isDirty, onDirtyChange]);

  // Calculate form completeness
  const formCompleteness = useMemo(() => {
    const hasName = formData.name && formData.name.trim().length > 0;
    const hasBrand = formData.brand && formData.brand.trim().length > 0;
    const hasAbv = formData.abv && formData.abv > 0;
    const hasRating = formData.overallRating && formData.overallRating > 0;

    const canSubmit = hasName && hasBrand && hasAbv && hasRating;

    const requiredFieldsCount = [hasName, hasBrand, hasAbv, hasRating].filter(Boolean).length;
    const optionalFieldsCount = [
      formData.traditionalStyle,
      formData.sweetness,
      formData.carbonation,
      formData.clarity,
      formData.color,
      formData.tasteTags && formData.tasteTags.length > 0,
      formData.notes,
      formData.photo,
      formData.appleCategories && formData.appleCategories.length > 0,
      formData.appleVarieties && formData.appleVarieties.length > 0,
      formData.fermentation,
      formData.specialProcesses && formData.specialProcesses.length > 0,
      formData.fruitAdditions && formData.fruitAdditions.length > 0,
      formData.hopVarieties && formData.hopVarieties.length > 0,
      formData.hopCharacter && formData.hopCharacter.length > 0,
      formData.spicesBotanicals && formData.spicesBotanicals.length > 0,
      formData.woodType && formData.woodType.length > 0,
      formData.barrelHistory && formData.barrelHistory.length > 0,
      formData.appearanceRating,
      formData.aromaRating,
      formData.tasteRating,
      formData.mouthfeelRating
    ].filter(Boolean).length;

    const totalFields = 25;
    const completedFields = requiredFieldsCount + optionalFieldsCount;
    const percentage = Math.round((completedFields / totalFields) * 100);

    return { percentage, canSubmit };
  }, [formData]);

  // Handle field changes
  const handleFieldChange = useCallback((fieldKey: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldKey]: value }));
    setIsDirty(true);

    // Clear error for this field
    if (errors[fieldKey]) {
      setErrors(prev => ({ ...prev, [fieldKey]: undefined }));
    }
  }, [errors]);

  // Check for duplicates (only for new ciders)
  useEffect(() => {
    if (isEdit || !formData.name || !formData.brand) {
      setDuplicateWarning(null);
      return;
    }

    const checkDuplicates = async () => {
      try {
        const nameLower = formData.name.toLowerCase().trim();
        const brandLower = formData.brand.toLowerCase().trim();

        const duplicate = ciders.find(c =>
          c.name.toLowerCase().trim() === nameLower &&
          c.brand.toLowerCase().trim() === brandLower
        );

        if (duplicate) {
          setDuplicateWarning('A cider with this name and brand already exists');
        } else {
          setDuplicateWarning(null);
        }
      } catch (error) {
        console.warn('Duplicate check failed:', error);
      }
    };

    checkDuplicates();
  }, [formData.name, formData.brand, ciders, isEdit]);

  // Validate form before submission
  const validateForm = useCallback((): boolean => {
    const newErrors: FormValidationErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be less than 100 characters';
    }

    if (!formData.brand?.trim()) {
      newErrors.brand = 'Brand is required';
    } else if (formData.brand.length < 2) {
      newErrors.brand = 'Brand must be at least 2 characters';
    } else if (formData.brand.length > 50) {
      newErrors.brand = 'Brand must be less than 50 characters';
    }

    if (formData.abv === undefined || formData.abv === null || formData.abv === 0) {
      newErrors.abv = 'ABV is required';
    } else if (formData.abv < 0.1 || formData.abv > 20) {
      newErrors.abv = 'ABV must be between 0.1% and 20%';
    }

    if (!formData.overallRating) {
      newErrors.overallRating = 'Rating is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Transform flat form data back to nested CiderMasterRecord structure
  const transformFormData = useCallback((): Partial<CiderMasterRecord> => {
    const result: Partial<CiderMasterRecord> = {
      name: formData.name,
      brand: formData.brand,
      abv: formData.abv,
      overallRating: formData.overallRating,
      photo: formData.photo || undefined,
      notes: formData.notes || undefined,
      traditionalStyle: formData.traditionalStyle || undefined,
      sweetness: formData.sweetness || undefined,
      carbonation: formData.carbonation || undefined,
      clarity: formData.clarity || undefined,
      color: formData.color || undefined,
      tasteTags: formData.tasteTags || undefined,
      fruitAdditions: formData.fruitAdditions || undefined,
      spicesBotanicals: formData.spicesBotanicals || undefined,
    };

    // Build apple classification object
    if (formData.appleCategories?.length || formData.appleVarieties?.length) {
      result.appleClassification = {
        categories: formData.appleCategories || [],
        varieties: formData.appleVarieties || [],
      };
    }

    // Build production methods object
    if (formData.fermentation || formData.specialProcesses?.length) {
      result.productionMethods = {
        fermentation: formData.fermentation || undefined,
        specialProcesses: formData.specialProcesses || []
      };
    }

    // Build hops object
    if (formData.hopVarieties?.length || formData.hopCharacter?.length) {
      result.hops = {
        varieties: formData.hopVarieties || [],
        character: formData.hopCharacter || []
      };
    }

    // Build wood aging object
    if (formData.woodType?.length || formData.barrelHistory?.length) {
      result.woodAging = {
        woodType: formData.woodType || [],
        barrelHistory: formData.barrelHistory || []
      };
    }

    // Build detailed ratings object
    if (formData.appearanceRating || formData.aromaRating || formData.tasteRating || formData.mouthfeelRating) {
      result.detailedRatings = {
        appearance: formData.appearanceRating || undefined,
        aroma: formData.aromaRating || undefined,
        taste: formData.tasteRating || undefined,
        mouthfeel: formData.mouthfeelRating || undefined
      };
    }

    // Remove undefined fields
    Object.keys(result).forEach(key => {
      const value = result[key as keyof typeof result];
      if (value === undefined || value === '' ||
          (Array.isArray(value) && value.length === 0)) {
        delete result[key as keyof typeof result];
      }
    });

    return result;
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    // Validate and get errors directly (don't rely on state which may be stale)
    const validationErrors: FormValidationErrors = {};

    if (!formData.name?.trim()) {
      validationErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      validationErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.brand?.trim()) {
      validationErrors.brand = 'Brand is required';
    } else if (formData.brand.length < 2) {
      validationErrors.brand = 'Brand must be at least 2 characters';
    }

    if (formData.abv === undefined || formData.abv === null || formData.abv === 0) {
      validationErrors.abv = 'ABV is required';
    } else if (formData.abv < 0.1 || formData.abv > 20) {
      validationErrors.abv = 'ABV must be between 0.1% and 20%';
    }

    if (!formData.overallRating) {
      validationErrors.overallRating = 'Rating is required';
    }

    // If there are errors, show them and update state
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const errorMessages = Object.values(validationErrors).join('\n');
      Alert.alert('Please fix the following:', errorMessages);
      return;
    }

    // Clear any previous errors
    setErrors({});

    // Check for duplicate warning - allow submission but log it
    if (duplicateWarning) {
      console.log('Submitting despite duplicate warning:', duplicateWarning);
    }

    setIsSubmitting(true);
    try {
      const transformedData = transformFormData();
      await onSubmit(transformedData);
    } catch (error) {
      console.error('Form submission failed:', error);
      Alert.alert('Error', 'Failed to save cider. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, transformFormData, onSubmit, duplicateWarning]);

  // Render individual form field
  const renderFormField = (field: any) => {
    const value = formData[field.key];
    const validation = errors[field.key] ? { isValid: false, errors: [errors[field.key]] } : undefined;

    switch (field.type) {
      case 'text':
        return (
          <ValidatedInput
            key={field.key}
            label={field.label}
            value={(value as string) || ''}
            onChangeText={(text) => handleFieldChange(field.key, text)}
            placeholder={field.placeholder}
            validation={validation}
            required={field.required}
            autoCapitalize={field.key === 'name' || field.key === 'brand' ? 'words' : 'sentences'}
            multiline={field.multiline || field.key === 'notes'}
            numberOfLines={field.key === 'notes' ? 3 : 1}
            maxLength={field.key === 'name' ? 100 : field.key === 'brand' ? 50 : field.key === 'notes' ? 1000 : undefined}
          />
        );

      case 'number':
        return (
          <ValidatedInput
            key={field.key}
            label={field.label}
            value={value?.toString() || ''}
            onChangeText={(text) => {
              const numValue = parseFloat(text) || 0;
              handleFieldChange(field.key, numValue);
            }}
            placeholder={field.placeholder}
            validation={validation}
            keyboardType="decimal-pad"
            required={field.required}
          />
        );

      case 'rating':
        return (
          <View key={field.key} style={styles.ratingContainer}>
            <RatingInput
              label={field.label}
              rating={value as number || 5}
              onRatingChange={(rating) => handleFieldChange(field.key, rating)}
              maxRating={10}
            />
          </View>
        );

      case 'select':
        return (
          <SelectInput
            key={field.key}
            label={field.label}
            value={value}
            options={field.options || []}
            onSelectionChange={(selectedValue) => handleFieldChange(field.key, selectedValue)}
            placeholder={field.placeholder}
            validation={validation}
            required={field.required}
            searchable={field.key === 'traditionalStyle'}
          />
        );

      case 'multiselect':
        return (
          <SelectInput
            key={field.key}
            label={field.label}
            value={value}
            options={field.options || []}
            onSelectionChange={(selectedValues) => handleFieldChange(field.key, selectedValues)}
            placeholder={field.placeholder}
            validation={validation}
            multiSelect={true}
            searchable={true}
            required={field.required}
          />
        );

      case 'tags':
        return (
          <TagSelector
            key={field.key}
            label={field.label}
            selectedTags={(value as string[]) || []}
            onTagsChange={(tags) => handleFieldChange(field.key, tags)}
            availableTags={field.options}
            validation={validation}
            required={field.required}
            maxTags={10}
          />
        );

      case 'image':
        return (
          <ImagePicker
            key={field.key}
            label={field.label}
            value={value as string}
            onImageSelect={(uri) => handleFieldChange(field.key, uri)}
            validation={validation}
            required={field.required}
          />
        );

      default:
        return null;
    }
  };

  // Render form section
  const renderFormSection = (section: typeof FORM_SECTIONS[0]) => {
    return (
      <View key={section.id} style={styles.section}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        {section.description && <Text style={styles.sectionDescription}>{section.description}</Text>}
        {section.fields.map(field => renderFormField(field))}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header with progress */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Cider' : 'Add New Cider'}</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${formCompleteness.percentage}%` }]}
            />
          </View>
          <Text style={styles.progressText}>
            {formCompleteness.percentage}% complete
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
      >
        {FORM_SECTIONS.map((section) => renderFormSection(section))}

        {/* Duplicate Warning */}
        {duplicateWarning && (
          <View style={styles.duplicateWarning}>
            <Text style={styles.duplicateWarningTitle}>Possible Duplicate</Text>
            <Text style={styles.duplicateWarningText}>{duplicateWarning}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Saving...' : submitButtonText}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    minWidth: 80,
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  ratingContainer: {
    marginBottom: 16,
  },
  duplicateWarning: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  duplicateWarningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  duplicateWarningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 40,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 2,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
