// Enhanced QuickEntry Screen with Progressive Disclosure
// Phase 2 implementation with 3-level progressive disclosure and real-time validation

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  Text
} from 'react-native';
import { RootTabScreenProps } from '../../types/navigation';
import {
  DisclosureLevel,
  CiderMasterRecord,
  QuickEntryFormState,
  ValidationResult,
  DISCLOSURE_CONFIGS
} from '../../types/cider';
import {
  FormDisclosureManager,
  getFormSections,
  FORM_FIELD_CONFIGS
} from '../../utils/formDisclosure';
import * as ValidationModule from '../../utils/enhancedValidation';
const { ValidationEngine, createDebouncedValidator } = ValidationModule;
import { useCiderStore } from '../../store/ciderStore';
import SafeAreaContainer from '../../components/common/SafeAreaContainer';
import Button from '../../components/common/Button';
import FormSection from '../../components/forms/FormSection';
import ProgressHeader from '../../components/forms/ProgressHeader';
import ValidatedInput from '../../components/forms/ValidatedInput';
import RatingInput from '../../components/common/RatingInput';
import SelectInput from '../../components/forms/SelectInput';
import TagSelector from '../../components/forms/TagSelector';
import { ImagePicker } from '../../components/forms/ImagePicker';

type Props = RootTabScreenProps<'QuickEntry'>;

export default function EnhancedQuickEntryScreen({ navigation }: Props) {
  const { addCider, findDuplicates, getSimilarCiderNames, getSimilarBrandNames } = useCiderStore();

  // Form state management - use default state to avoid initialization issues
  const createInitialState = useCallback(() => {
    try {
      return FormDisclosureManager.createInitialFormState('casual', 'default-user');
    } catch (error) {
      console.error('Error creating initial form state:', error);
      // Return a minimal default state if FormDisclosureManager fails
      return {
        disclosureLevel: 'casual' as DisclosureLevel,
        formData: { userId: 'default-user', overallRating: 5 },
        validationState: {},
        fieldStates: {},
        formCompleteness: { percentage: 0, canSubmit: false, missingFields: [] },
        duplicateWarning: null,
        isSubmitting: false,
        startTime: Date.now()
      } as QuickEntryFormState;
    }
  }, []);

  const [formState, setFormState] = useState<QuickEntryFormState>(createInitialState);

  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();
  // TEMPORARY: Disable validation to test if it's blocking rendering
  const debouncedValidate = useRef(createDebouncedValidator(
    (fieldKey: string, value: any, fieldConfig?: any, allFormData?: any) => {
      // Return mock validation success to bypass validation errors
      return { isValid: true, errors: [], warnings: [], suggestions: [] };
    },
    300
  ));

  // Timer for tracking entry time
  useEffect(() => {
    if (!formState?.startTime) {
      return;
    }

    timerRef.current = setInterval(() => {
      setElapsedTime((Date.now() - formState.startTime) / 1000);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [formState?.startTime]);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (formState?.formData?.name || formState?.formData?.brand) {
        Alert.alert(
          'Discard Changes?',
          'You have unsaved changes. Are you sure you want to go back?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
          ]
        );
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [formState?.formData, navigation]);

  // =============================================================================
  // FORM FIELD HANDLERS
  // =============================================================================

  const handleFieldChange = useCallback(async (
    fieldKey: keyof CiderMasterRecord,
    value: any
  ) => {
    // Update form data immediately for responsive UI
    setFormState(prev => {
      if (!prev) return prev; // Safety check

      const updatedFormData = { ...prev.formData, [fieldKey]: value };

      // Form completeness calculation - only required fields matter for submission
      const hasName = updatedFormData.name && updatedFormData.name.trim().length > 0;
      const hasBrand = updatedFormData.brand && updatedFormData.brand.trim().length > 0;
      const hasAbv = updatedFormData.abv && updatedFormData.abv > 0;
      const hasRating = updatedFormData.overallRating && updatedFormData.overallRating > 0;

      // Can submit if all required fields are filled
      const canSubmit = hasName && hasBrand && hasAbv && hasRating;

      // Progress includes both required and optional fields for better UX
      const requiredFieldsCount = [hasName, hasBrand, hasAbv, hasRating].filter(Boolean).length;
      const optionalFieldsCount = [
        // Basic characteristics
        updatedFormData.traditionalStyle,
        updatedFormData.sweetness,
        updatedFormData.carbonation,
        updatedFormData.clarity,
        updatedFormData.color,
        updatedFormData.tasteTags && updatedFormData.tasteTags.length > 0,
        updatedFormData.notes,
        updatedFormData.photo,
        // Apple classification
        updatedFormData.appleCategories && updatedFormData.appleCategories.length > 0,
        updatedFormData.appleVarieties && updatedFormData.appleVarieties.length > 0,
        updatedFormData.longAshtonClassification,
        // Production methods
        updatedFormData.fermentation,
        updatedFormData.specialProcesses && updatedFormData.specialProcesses.length > 0,
        // Additives & ingredients
        updatedFormData.fruitAdditions && updatedFormData.fruitAdditions.length > 0,
        updatedFormData.hopVarieties && updatedFormData.hopVarieties.length > 0,
        updatedFormData.hopCharacter && updatedFormData.hopCharacter.length > 0,
        updatedFormData.spicesBotanicals && updatedFormData.spicesBotanicals.length > 0,
        updatedFormData.oakTypes && updatedFormData.oakTypes.length > 0,
        updatedFormData.barrelHistory && updatedFormData.barrelHistory.length > 0,
        updatedFormData.alternativeWoods && updatedFormData.alternativeWoods.length > 0,
        // Detailed ratings
        updatedFormData.appearanceRating,
        updatedFormData.aromaRating,
        updatedFormData.tasteRating,
        updatedFormData.mouthfeelRating
      ].filter(Boolean).length;

      const totalFields = 27; // 4 required + 23 optional
      const completedFields = requiredFieldsCount + optionalFieldsCount;
      const percentage = Math.round((completedFields / totalFields) * 100);

      return {
        ...prev,
        formData: updatedFormData,
        formCompleteness: {
          percentage,
          canSubmit,
          missingFields: []
        }
      };
    });

    // Trigger duplicate detection for name/brand fields (simplified)
    if ((fieldKey === 'name' || fieldKey === 'brand') && value && value.length >= 2) {
      try {
        const currentFormData = formState?.formData || {};
        const name = fieldKey === 'name' ? value : currentFormData.name || '';
        const brand = fieldKey === 'brand' ? value : currentFormData.brand || '';

        if (name && brand) {
          const duplicateResult = await findDuplicates(name, brand);
          setFormState(prev => ({
            ...prev,
            duplicateWarning: duplicateResult.isDuplicate || duplicateResult.hasSimilar
              ? {
                  type: duplicateResult.isDuplicate ? 'duplicate' : 'similar',
                  message: duplicateResult.suggestion,
                  confidence: duplicateResult.confidence,
                  existingCider: duplicateResult.existingCider
                }
              : null
          }));
        }
      } catch (error) {
        console.warn('Duplicate detection error:', error);
      }
    }
  }, [formState?.formData, findDuplicates]);

  // =============================================================================
  // FORM SECTIONS (No Progressive Disclosure)
  // =============================================================================

  // =============================================================================
  // FORM SUBMISSION
  // =============================================================================

  const handleSubmit = useCallback(async () => {
    if (!formState.formCompleteness.canSubmit) {
      Alert.alert(
        'Form Incomplete',
        `Please complete the required fields: ${formState.formCompleteness.missingFields.join(', ')}`,
        [{ text: 'OK' }]
      );
      return;
    }

    setFormState(prev => ({ ...prev, isSubmitting: true }));

    try {
      const completionTime = (Date.now() - formState.startTime) / 1000;

      // Transform flat form data into proper nested structure for database
      const formData = formState.formData;

      // Build apple classification object if any fields are filled
      const appleClassification = (() => {
        const categories = formData.appleCategories;
        const varieties = formData.appleVarieties;
        const longAshton = formData.longAshtonClassification;

        if (categories?.length || varieties?.length || longAshton) {
          return {
            categories: categories || [],
            varieties: varieties || [],
            longAshtonClassification: longAshton || undefined
          };
        }
        return undefined;
      })();

      // Build production methods object if any fields are filled
      const productionMethods = (() => {
        const fermentation = formData.fermentation;
        const specialProcesses = formData.specialProcesses;

        if (fermentation || specialProcesses?.length) {
          return {
            fermentation: fermentation || undefined,
            specialProcesses: specialProcesses || []
          };
        }
        return undefined;
      })();

      // Build hops object if any fields are filled
      const hops = (() => {
        const hopVarieties = formData.hopVarieties;
        const hopCharacter = formData.hopCharacter;

        if (hopVarieties?.length || hopCharacter?.length) {
          return {
            varieties: hopVarieties || [],
            character: hopCharacter || []
          };
        }
        return undefined;
      })();

      // Build wood aging object if any fields are filled
      const woodAging = (() => {
        const oakTypes = formData.oakTypes;
        const barrelHistory = formData.barrelHistory;
        const alternativeWoods = formData.alternativeWoods;

        if (oakTypes?.length || barrelHistory?.length || alternativeWoods?.length) {
          return {
            oakTypes: oakTypes || [],
            barrelHistory: barrelHistory || [],
            alternativeWoods: alternativeWoods || []
          };
        }
        return undefined;
      })();

      // Build detailed ratings object if any fields are filled
      const detailedRatings = (() => {
        const appearance = formData.appearanceRating;
        const aroma = formData.aromaRating;
        const taste = formData.tasteRating;
        const mouthfeel = formData.mouthfeelRating;

        if (appearance || aroma || taste || mouthfeel) {
          return {
            appearance: appearance || undefined,
            aroma: aroma || undefined,
            taste: taste || undefined,
            mouthfeel: mouthfeel || undefined
          };
        }
        return undefined;
      })();

      // Create cider record with proper structure
      const ciderData = {
        // Required fields with defaults
        name: formData.name || 'Unknown Cider',
        brand: formData.brand || 'Unknown Brand',
        abv: formData.abv || 5.0,
        overallRating: formData.overallRating || 5,
        userId: 'default-user', // TODO: Replace with actual user ID when authentication is implemented

        // Optional basic fields
        photo: formData.photo || undefined,
        notes: formData.notes || undefined,

        // Enthusiast level fields
        traditionalStyle: formData.traditionalStyle || undefined,
        sweetness: formData.sweetness || undefined,
        carbonation: formData.carbonation || undefined,
        clarity: formData.clarity || undefined,
        color: formData.color || undefined,
        tasteTags: formData.tasteTags || undefined,

        // Expert level fields (properly nested)
        appleClassification,
        productionMethods,

        // Additives & Ingredients
        fruitAdditions: formData.fruitAdditions || undefined,
        hops,
        spicesBotanicals: formData.spicesBotanicals || undefined,
        woodAging,

        detailedRatings,
        venue: formData.venue || undefined,
      };

      // Remove undefined optional fields to prevent saving empty values
      Object.keys(ciderData).forEach(key => {
        if (ciderData[key as keyof typeof ciderData] === undefined ||
            ciderData[key as keyof typeof ciderData] === '' ||
            (Array.isArray(ciderData[key as keyof typeof ciderData]) &&
             (ciderData[key as keyof typeof ciderData] as any[]).length === 0)) {
          delete ciderData[key as keyof typeof ciderData];
        }
      });

      const ciderId = await addCider(ciderData);

      // Record performance metrics
      console.log(`Entry completed in ${completionTime.toFixed(1)}s for ${formState.disclosureLevel} level`);

      // Reset form
      setFormState(FormDisclosureManager.createInitialFormState('casual', 'default-user'));
      setElapsedTime(0);

      Alert.alert(
        'Success!',
        `"${ciderData.name}" has been added to your collection.`,
        [
          {
            text: 'Add Another',
            style: 'default',
          },
          {
            text: 'View Collection',
            onPress: () => navigation.navigate('Collection'),
            style: 'default',
          },
        ]
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save cider';
      Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
    } finally {
      setFormState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [formState, addCider, navigation]);

  // =============================================================================
  // SUGGESTIONS HANDLERS
  // =============================================================================

  const handleNameSuggestion = useCallback((suggestion: string) => {
    handleFieldChange('name', suggestion);
  }, [handleFieldChange]);

  const handleBrandSuggestion = useCallback((suggestion: string) => {
    handleFieldChange('brand', suggestion);
  }, [handleFieldChange]);

  // =============================================================================
  // RENDER FORM FIELDS
  // =============================================================================

  const renderFormField = (fieldKey: keyof CiderMasterRecord, fieldConfig?: any) => {
    // Safety check for formState
    if (!formState?.formData || !formState?.validationState) {
      return null;
    }

    // Use passed field config or fallback for basic fields
    const getFallbackConfig = (key: string) => {
      const configs: any = {
        name: { key: 'name', label: 'Cider Name', type: 'text', required: true, placeholder: 'Enter cider name', section: 'core' },
        brand: { key: 'brand', label: 'Brand', type: 'text', required: true, placeholder: 'Enter brand name', section: 'core' },
        abv: { key: 'abv', label: 'ABV (%)', type: 'number', required: true, placeholder: 'Enter ABV (e.g., 5.2)', section: 'core' },
        overallRating: { key: 'overallRating', label: 'Overall Rating', type: 'rating', required: true, placeholder: 'Rate from 1-10', section: 'core' },
      };
      return configs[key];
    };

    const config = fieldConfig || FORM_FIELD_CONFIGS?.[fieldKey] || getFallbackConfig(fieldKey);

    if (!config) {
      return null;
    }

    const value = formState.formData[fieldKey];
    const validation = formState.validationState[fieldKey];

    switch (config.type) {
      case 'text':
        let suggestions: string[] = [];
        let onSuggestionPress: ((suggestion: string) => void) | undefined;

        if (fieldKey === 'name') {
          suggestions = getSimilarCiderNames ? getSimilarCiderNames(value as string || '') : [];
          onSuggestionPress = handleNameSuggestion;
        } else if (fieldKey === 'brand') {
          suggestions = getSimilarBrandNames ? getSimilarBrandNames(value as string || '') : [];
          onSuggestionPress = handleBrandSuggestion;
        }

        return (
          <ValidatedInput
            key={fieldKey}
            label={config.label}
            value={(value as string) || ''}
            onChangeText={(text) => handleFieldChange(fieldKey, text)}
            placeholder={config.placeholder}
            validation={validation}
            suggestions={suggestions}
            onSuggestionPress={onSuggestionPress}
            required={config.required}
            autoCapitalize={fieldKey === 'name' || fieldKey === 'brand' ? 'words' : 'sentences'}
            multiline={fieldKey === 'notes'}
            numberOfLines={fieldKey === 'notes' ? 3 : 1}
            maxLength={fieldKey === 'name' ? 100 : fieldKey === 'brand' ? 50 : fieldKey === 'notes' ? 1000 : undefined}
          />
        );

      case 'number':
        return (
          <ValidatedInput
            key={fieldKey}
            label={config.label}
            value={value?.toString() || ''}
            onChangeText={(text) => {
              const numValue = parseFloat(text) || 0;
              handleFieldChange(fieldKey, numValue);
            }}
            placeholder={config.placeholder}
            validation={validation}
            keyboardType="decimal-pad"
            required={config.required}
          />
        );

      case 'rating':
        return (
          <View style={styles.ratingContainer}>
            <RatingInput
              label={config.label}
              rating={value as number || 5}
              onRatingChange={(rating) => handleFieldChange(fieldKey, rating)}
              maxRating={10}
            />
          </View>
        );

      case 'select':
        return (
          <SelectInput
            key={fieldKey}
            label={config.label}
            value={value}
            options={config.options || []}
            onSelectionChange={(selectedValue) => handleFieldChange(fieldKey, selectedValue)}
            placeholder={config.placeholder}
            validation={validation}
            required={config.required}
            searchable={fieldKey === 'traditionalStyle'}
          />
        );

      case 'multiselect':
        return (
          <SelectInput
            key={fieldKey}
            label={config.label}
            value={value}
            options={config.options || []}
            onSelectionChange={(selectedValues) => handleFieldChange(fieldKey, selectedValues)}
            placeholder={config.placeholder}
            validation={validation}
            multiSelect={true}
            searchable={true}
            required={config.required}
          />
        );

      case 'tags':
        return (
          <TagSelector
            key={fieldKey}
            label={config.label}
            selectedTags={(value as string[]) || []}
            onTagsChange={(tags) => handleFieldChange(fieldKey, tags)}
            validation={validation}
            required={config.required}
            maxTags={10}
          />
        );

      case 'image':
        return (
          <ImagePicker
            key={fieldKey}
            label={config.label}
            value={value as string}
            onImageSelect={(uri) => handleFieldChange(fieldKey, uri)}
            validation={validation}
            required={config.required}
          />
        );

      // Add more field types as needed
      default:
        console.log('Unknown field type for:', fieldKey, 'type:', config.type);
        return null;
    }
  };

  // =============================================================================
  // RENDER SECTIONS
  // =============================================================================

  const formSections = useMemo(() => {
    return [
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
            { label: 'Pink/Rosé', value: 'pink_rose' },
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
          { key: 'longAshtonClassification', label: 'Long Ashton Classification', type: 'text', required: false, placeholder: 'Long Ashton classification (optional)' },
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
            { label: 'Pét-nat (Méthode Ancestrale)', value: 'pet_nat_methode_ancestrale' },
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
          { key: 'oakTypes', label: 'Oak Types', type: 'multiselect', required: false, placeholder: 'Select oak types (optional)', options: [
            { label: 'No Wood Aging', value: 'no_wood_aging' },
            { label: 'American Oak', value: 'american_oak' },
            { label: 'French Oak', value: 'french_oak' },
            { label: 'English Oak', value: 'english_oak' }
          ]},
          { key: 'barrelHistory', label: 'Barrel History', type: 'multiselect', required: false, placeholder: 'Select barrel history (optional)', options: [
            { label: 'Virgin Oak', value: 'virgin_oak' },
            { label: 'Bourbon Barrel', value: 'bourbon_barrel' },
            { label: 'Wine Barrel', value: 'wine_barrel' },
            { label: 'Sherry Barrel', value: 'sherry_barrel' },
            { label: 'Rum Barrel', value: 'rum_barrel' },
            { label: 'Gin Barrel', value: 'gin_barrel' }
          ]},
          { key: 'alternativeWoods', label: 'Alternative Woods', type: 'multiselect', required: false, placeholder: 'Select alternative woods (optional)', options: [
            { label: 'Cherry', value: 'cherry' },
            { label: 'Apple', value: 'apple' },
            { label: 'Chestnut', value: 'chestnut' },
            { label: 'Acacia', value: 'acacia' },
            { label: 'Other', value: 'other' }
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
  }, []);

  const renderFormSection = (section: any) => {
    // Safety check for formState
    if (!formState?.formData) {
      return null;
    }

    // Show all fields in the section - no filtering needed
    const sectionFields = section.fields;

    if (sectionFields.length === 0) {
      return null;
    }

    const completedFields = sectionFields.filter((field: any) => {
      const value = formState.formData[field.key];
      // For required fields, check they have meaningful values
      if (field.required) {
        return value !== undefined && value !== '' && value !== 0;
      }
      // For optional fields, just check they have any value
      return value !== undefined && value !== '';
    });

    const completionPercentage = sectionFields.length > 0
      ? (completedFields.length / sectionFields.length) * 100
      : 100;

    return (
      <View key={section.id} style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>{section.title}</Text>
        {section.description && <Text style={{ marginBottom: 10 }}>{section.description}</Text>}
        {sectionFields.map(field => {
          return (
            <React.Fragment key={field.key}>
              {renderFormField(field.key as keyof CiderMasterRecord, field)}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  // TEMPORARY: Simple bypass to test if validation errors are blocking rendering
  if (false) {
    return (
      <SafeAreaContainer>
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 24, color: 'red', marginBottom: 20 }}>
            FORM BYPASS TEST - Validation errors preventing form render?
          </Text>
          <Text style={{ marginBottom: 10 }}>Name Field Test</Text>
          <Text style={{ marginBottom: 10 }}>Brand Field Test</Text>
          <Text style={{ marginBottom: 10 }}>ABV Field Test</Text>
          <Text style={{ marginBottom: 10 }}>Rating Field Test</Text>
        </View>
      </SafeAreaContainer>
    );
  }

  // Safety check to ensure formState is properly initialized
  if (!formState || !formState.formData) {
    return (
      <SafeAreaContainer>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading form...</Text>
        </View>
      </SafeAreaContainer>
    );
  }

  return (
    <SafeAreaContainer>
      <View testID="enhanced-quick-entry-screen" style={{ flex: 1 }}>
        {/* Simple Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add New Cider</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${formState.formCompleteness.percentage}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {formState.formCompleteness.percentage}% complete
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollViewContent, { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {formSections.map((section, index) => (
            <React.Fragment key={section.id || index}>
              {renderFormSection(section)}
            </React.Fragment>
          ))}

          {/* Duplicate Warning */}
          {formState.duplicateWarning && (
            <View style={styles.duplicateWarning}>
              <Text style={styles.duplicateWarningTitle}>
                {formState.duplicateWarning.type === 'duplicate' ? '⚠️ Possible Duplicate' : '💡 Similar Cider Found'}
              </Text>
              <Text style={styles.duplicateWarningText}>
                {formState.duplicateWarning.message}
              </Text>
            </View>
          )}

          {/* Submit Button */}
          <View style={styles.submitContainer}>
            <Button
              title="Save Cider"
              onPress={handleSubmit}
              loading={formState.isSubmitting}
              disabled={!formState.formCompleteness.canSubmit || formState.isSubmitting}
            />
            <Button
              title="Cancel"
              onPress={() => navigation.goBack()}
              variant="secondary"
              style={{ marginTop: 12 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </View>
    </SafeAreaContainer>
  );
}

const styles = StyleSheet.create({
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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 40,
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
  submitContainer: {
    marginTop: 24,
    marginBottom: 20,
  },
});