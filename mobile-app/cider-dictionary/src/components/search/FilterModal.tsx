// Phase 4: Advanced Filter Modal
// Provides comprehensive filtering UI for advanced search

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { FilterState, DEFAULT_FILTERS } from '../../types/search';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Predefined filter options
const TASTE_TAG_OPTIONS = [
  'Fruity', 'Crisp', 'Sweet', 'Dry', 'Tart', 'Smooth',
  'Complex', 'Light', 'Bold', 'Refreshing', 'Earthy', 'Floral'
];

const TRADITIONAL_STYLE_OPTIONS = [
  'English Dry', 'English Sweet', 'French', 'Spanish',
  'New England', 'Modern', 'Heritage', 'Farmhouse', 'Wild'
];

const SWEETNESS_OPTIONS = ['Dry', 'Off-Dry', 'Semi-Sweet', 'Sweet'];
const CARBONATION_OPTIONS = ['Still', 'Petillant', 'Sparkling'];
const CLARITY_OPTIONS = ['Clear', 'Hazy', 'Cloudy'];
const COLOR_OPTIONS = ['Pale', 'Golden', 'Amber', 'Rose', 'Deep'];

interface FilterModalProps {
  visible: boolean;
  currentFilters: FilterState;
  onApply: (filters: FilterState) => void;
  onClose: () => void;
}

export default function FilterModal({
  visible,
  currentFilters,
  onApply,
  onClose,
}: FilterModalProps) {
  // Local state for filters (apply on confirm)
  const [filters, setFilters] = useState<FilterState>(currentFilters);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleApply = useCallback(() => {
    onApply(filters);
  }, [filters, onApply]);

  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handleRatingRangeChange = useCallback((values: number[]) => {
    setFilters(prev => ({
      ...prev,
      ratingRange: [values[0], values[1]],
    }));
  }, []);

  const handleAbvRangeChange = useCallback((values: number[]) => {
    setFilters(prev => ({
      ...prev,
      abvRange: [values[0], values[1]],
    }));
  }, []);

  const handlePriceRangeChange = useCallback((values: number[]) => {
    setFilters(prev => ({
      ...prev,
      priceRange: [values[0], values[1]],
    }));
  }, []);

  const toggleTasteTag = useCallback((tag: string) => {
    setFilters(prev => {
      const newTags = new Set(prev.tasteTags);
      if (newTags.has(tag)) {
        newTags.delete(tag);
      } else {
        newTags.add(tag);
      }
      return {
        ...prev,
        tasteTags: newTags,
      };
    });
  }, []);

  const toggleTraditionalStyle = useCallback((style: string) => {
    setFilters(prev => {
      const newStyles = new Set(prev.traditionalStyles);
      if (newStyles.has(style)) {
        newStyles.delete(style);
      } else {
        newStyles.add(style);
      }
      return {
        ...prev,
        traditionalStyles: newStyles,
      };
    });
  }, []);

  const toggleCharacteristic = useCallback(
    (category: keyof FilterState['characteristics'], value: string) => {
      setFilters(prev => {
        const newValues = new Set(prev.characteristics[category]);
        if (newValues.has(value)) {
          newValues.delete(value);
        } else {
          newValues.add(value);
        }
        return {
          ...prev,
          characteristics: {
            ...prev.characteristics,
            [category]: newValues,
          },
        };
      });
    },
    []
  );

  const toggleBooleanFilter = useCallback((
    key: 'hasPhoto' | 'hasNotes' | 'hasExperiences'
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key] === null ? true : prev[key] === true ? false : null,
    }));
  }, []);

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const renderRangeSlider = (
    label: string,
    range: [number, number],
    min: number,
    max: number,
    step: number,
    onChange: (values: number[]) => void,
    unit: string = ''
  ) => (
    <View style={styles.filterSection}>
      <Text style={styles.sectionTitle}>{label}</Text>
      <View style={styles.rangeValues}>
        <Text style={styles.rangeValue}>
          {range[0]}{unit}
        </Text>
        <Text style={styles.rangeValue}>
          {range[1]}{unit}
        </Text>
      </View>
      <View style={styles.sliderContainer}>
        {/* Using two sliders to simulate range slider */}
        <Slider
          style={styles.slider}
          minimumValue={min}
          maximumValue={max}
          step={step}
          value={range[0]}
          onValueChange={(value) => onChange([value, range[1]])}
          minimumTrackTintColor="#D4A574"
          maximumTrackTintColor="#E0E0E0"
          thumbTintColor="#D4A574"
        />
        <Slider
          style={styles.slider}
          minimumValue={min}
          maximumValue={max}
          step={step}
          value={range[1]}
          onValueChange={(value) => onChange([range[0], value])}
          minimumTrackTintColor="#D4A574"
          maximumTrackTintColor="#E0E0E0"
          thumbTintColor="#D4A574"
        />
      </View>
    </View>
  );

  const renderMultiSelect = (
    label: string,
    options: string[],
    selected: Set<string>,
    onToggle: (value: string) => void
  ) => (
    <View style={styles.filterSection}>
      <Text style={styles.sectionTitle}>{label}</Text>
      <View style={styles.chipContainer}>
        {options.map(option => {
          const isSelected = selected.has(option);
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
              ]}
              onPress={() => onToggle(option)}
            >
              <Text style={[
                styles.chipText,
                isSelected && styles.chipTextSelected,
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderBooleanToggle = (
    label: string,
    key: 'hasPhoto' | 'hasNotes' | 'hasExperiences'
  ) => {
    const value = filters[key];
    return (
      <View style={styles.booleanToggle}>
        <Text style={styles.booleanLabel}>{label}</Text>
        <View style={styles.toggleButtons}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              value === true && styles.toggleButtonActive,
            ]}
            onPress={() => toggleBooleanFilter(key)}
          >
            <Text style={[
              styles.toggleButtonText,
              value === true && styles.toggleButtonTextActive,
            ]}>
              Yes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              value === false && styles.toggleButtonActive,
            ]}
            onPress={() => toggleBooleanFilter(key)}
          >
            <Text style={[
              styles.toggleButtonText,
              value === false && styles.toggleButtonTextActive,
            ]}>
              No
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              value === null && styles.toggleButtonActive,
            ]}
            onPress={() => toggleBooleanFilter(key)}
          >
            <Text style={[
              styles.toggleButtonText,
              value === null && styles.toggleButtonTextActive,
            ]}>
              Any
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Advanced Filters</Text>
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Filters Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Range Filters */}
          {renderRangeSlider(
            'Rating',
            filters.ratingRange,
            1,
            10,
            0.5,
            handleRatingRangeChange,
            ''
          )}

          {renderRangeSlider(
            'ABV',
            filters.abvRange,
            0.1,
            20,
            0.1,
            handleAbvRangeChange,
            '%'
          )}

          {renderRangeSlider(
            'Price',
            filters.priceRange,
            0,
            100,
            1,
            handlePriceRangeChange,
            '$'
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Taste Tags */}
          {renderMultiSelect(
            'Taste Tags',
            TASTE_TAG_OPTIONS,
            filters.tasteTags,
            toggleTasteTag
          )}

          {/* Traditional Styles */}
          {renderMultiSelect(
            'Traditional Styles',
            TRADITIONAL_STYLE_OPTIONS,
            filters.traditionalStyles,
            toggleTraditionalStyle
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Characteristics */}
          <Text style={styles.sectionGroupTitle}>Characteristics</Text>

          {renderMultiSelect(
            'Sweetness',
            SWEETNESS_OPTIONS,
            filters.characteristics.sweetness,
            (value) => toggleCharacteristic('sweetness', value)
          )}

          {renderMultiSelect(
            'Carbonation',
            CARBONATION_OPTIONS,
            filters.characteristics.carbonation,
            (value) => toggleCharacteristic('carbonation', value)
          )}

          {renderMultiSelect(
            'Clarity',
            CLARITY_OPTIONS,
            filters.characteristics.clarity,
            (value) => toggleCharacteristic('clarity', value)
          )}

          {renderMultiSelect(
            'Color',
            COLOR_OPTIONS,
            filters.characteristics.color,
            (value) => toggleCharacteristic('color', value)
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Boolean Filters */}
          <Text style={styles.sectionGroupTitle}>Additional Filters</Text>

          {renderBooleanToggle('Has Photo', 'hasPhoto')}
          {renderBooleanToggle('Has Notes', 'hasNotes')}
          {renderBooleanToggle('Has Experiences', 'hasExperiences')}

          {/* Bottom padding */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={handleApply}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    padding: 8,
    width: 60,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  resetButton: {
    padding: 8,
    width: 60,
    alignItems: 'flex-end',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4A574',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionGroupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    marginTop: 8,
  },
  rangeValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rangeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4A574',
  },
  sliderContainer: {
    marginHorizontal: -8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: '#D4A574',
    borderColor: '#D4A574',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  booleanToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  booleanLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  toggleButtons: {
    flexDirection: 'row',
  },
  toggleButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginLeft: 4,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#D4A574',
    borderColor: '#D4A574',
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  applyButton: {
    backgroundColor: '#D4A574',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
