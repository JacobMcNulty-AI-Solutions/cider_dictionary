// Interactive Tag Selection Component
// Allows users to select and deselect taste tags with visual feedback

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { FieldValidationState } from '../../types/cider';

// Common taste tags for cider
export const COMMON_TASTE_TAGS = [
  // Fruit characteristics
  'Apple', 'Green Apple', 'Red Apple', 'Cooking Apple', 'Crabapple',
  'Pear', 'Stone Fruit', 'Citrus', 'Berries', 'Tropical',

  // Sweetness levels
  'Bone Dry', 'Dry', 'Off-Dry', 'Medium Sweet', 'Sweet',

  // Flavor profiles
  'Tart', 'Crisp', 'Refreshing', 'Sharp', 'Smooth',
  'Balanced', 'Complex', 'Simple', 'Clean', 'Rustic',

  // Specific flavors
  'Honey', 'Caramel', 'Vanilla', 'Spice', 'Cinnamon',
  'Clove', 'Nutmeg', 'Floral', 'Herbal', 'Earthy',

  // Mouthfeel
  'Light', 'Medium Body', 'Full Body', 'Sparkling', 'Still',
  'Creamy', 'Astringent', 'Tannic', 'Fizzy', 'Flat',

  // Other characteristics
  'Funky', 'Brett', 'Wild', 'Traditional', 'Modern',
  'Hopped', 'Barrel Aged', 'Oak', 'Smoky', 'Mineral'
];

interface TagSelectorProps {
  label: string;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  availableTags?: string[];
  validation?: FieldValidationState;
  required?: boolean;
  maxTags?: number;
}

const TagSelector = memo<TagSelectorProps>(({
  label,
  selectedTags = [],
  onTagsChange,
  availableTags = COMMON_TASTE_TAGS,
  validation,
  required = false,
  maxTags = 10
}) => {
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      // Remove tag
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      // Add tag (respect maxTags limit)
      if (selectedTags.length < maxTags) {
        onTagsChange([...selectedTags, tag]);
      }
    }
  };

  const renderTag = (tag: string, isSelected: boolean) => (
    <TouchableOpacity
      key={tag}
      onPress={() => toggleTag(tag)}
      style={[
        styles.tag,
        isSelected ? styles.tagSelected : styles.tagUnselected
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${isSelected ? 'Remove' : 'Add'} ${tag} tag`}
    >
      <Text style={[
        styles.tagText,
        isSelected ? styles.tagTextSelected : styles.tagTextUnselected
      ]}>
        {tag}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        <Text style={styles.counter}>
          {selectedTags.length}/{maxTags}
        </Text>
      </View>

      {/* Selected tags section */}
      {selectedTags.length > 0 && (
        <View style={styles.selectedSection}>
          <Text style={styles.selectedLabel}>Selected:</Text>
          <View style={styles.selectedTagsContainer}>
            {selectedTags.map(tag => renderTag(tag, true))}
          </View>
        </View>
      )}

      {/* Available tags section */}
      <View style={styles.availableSection}>
        <Text style={styles.availableLabel}>Available Tags:</Text>
        <ScrollView
          horizontal={false}
          showsVerticalScrollIndicator={false}
          style={styles.tagsScrollView}
          contentContainerStyle={styles.tagsContainer}
        >
          {availableTags.map(tag => renderTag(tag, selectedTags.includes(tag)))}
        </ScrollView>
      </View>

      {/* Validation feedback */}
      {validation && validation.showFeedback && (
        <View style={styles.validationContainer}>
          {validation.errors.map((error, index) => (
            <Text key={`error-${index}`} style={styles.errorText}>
              {error}
            </Text>
          ))}
          {validation.warnings.map((warning, index) => (
            <Text key={`warning-${index}`} style={styles.warningText}>
              {warning}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
});

TagSelector.displayName = 'TagSelector';

export default TagSelector;

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  required: {
    color: '#e74c3c',
  },
  counter: {
    fontSize: 14,
    color: '#666',
  },
  selectedSection: {
    marginBottom: 12,
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 8,
  },
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  availableSection: {
    maxHeight: 200,
  },
  availableLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7f8c8d',
    marginBottom: 8,
  },
  tagsScrollView: {
    maxHeight: 150,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagSelected: {
    backgroundColor: '#3498db',
    borderColor: '#2980b9',
  },
  tagUnselected: {
    backgroundColor: '#f8f9fa',
    borderColor: '#dee2e6',
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tagTextSelected: {
    color: '#fff',
  },
  tagTextUnselected: {
    color: '#495057',
  },
  validationContainer: {
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#e74c3c',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 12,
    color: '#f39c12',
    marginBottom: 2,
  },
});