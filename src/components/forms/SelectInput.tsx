// Select Input Component for Dropdowns
// Handles single and multi-select options with search

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  SafeAreaView
} from 'react-native';
import { FieldValidationState } from '../../types/cider';

interface SelectOption {
  label: string;
  value: any;
}

interface SelectInputProps {
  label: string;
  value?: any | any[];
  options: SelectOption[];
  onSelectionChange: (value: any) => void;
  placeholder?: string;
  validation?: FieldValidationState;
  multiSelect?: boolean;
  searchable?: boolean;
  required?: boolean;
  disabled?: boolean;
  containerStyle?: any;
}

const SelectInput: React.FC<SelectInputProps> = ({
  label,
  value,
  options,
  onSelectionChange,
  placeholder = 'Select an option',
  validation,
  multiSelect = false,
  searchable = false,
  required = false,
  disabled = false,
  containerStyle
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOptions = multiSelect
    ? (Array.isArray(value) ? value : [])
    : (value ? [value] : []);

  const filteredOptions = searchable && searchQuery
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const getDisplayValue = () => {
    if (multiSelect) {
      if (selectedOptions.length === 0) return placeholder;
      if (selectedOptions.length === 1) {
        const option = options.find(opt => opt.value === selectedOptions[0]);
        return option?.label || 'Selected';
      }
      return `${selectedOptions.length} selected`;
    } else {
      if (!value) return placeholder;
      const option = options.find(opt => opt.value === value);
      return option?.label || 'Selected';
    }
  };

  const handleOptionPress = useCallback((option: SelectOption) => {
    if (multiSelect) {
      const isSelected = selectedOptions.includes(option.value);
      let newSelection: any[];

      if (isSelected) {
        newSelection = selectedOptions.filter(v => v !== option.value);
      } else {
        newSelection = [...selectedOptions, option.value];
      }

      onSelectionChange(newSelection);
    } else {
      onSelectionChange(option.value);
      setIsModalVisible(false);
    }
    setSearchQuery('');
  }, [selectedOptions, multiSelect, onSelectionChange]);

  const isOptionSelected = (option: SelectOption) => {
    return multiSelect
      ? selectedOptions.includes(option.value)
      : value === option.value;
  };

  const getBorderColor = () => {
    if (validation?.showFeedback) {
      return validation.isValid ? '#4CAF50' : '#F44336';
    }
    return '#e0e0e0';
  };

  const renderOption = ({ item }: { item: SelectOption }) => (
    <TouchableOpacity
      style={[
        styles.optionItem,
        isOptionSelected(item) && styles.selectedOption
      ]}
      onPress={() => handleOptionPress(item)}
    >
      <Text
        style={[
          styles.optionText,
          isOptionSelected(item) && styles.selectedOptionText
        ]}
      >
        {item.label}
      </Text>
      {isOptionSelected(item) && (
        <Text style={styles.checkmark}>✓</Text>
      )}
    </TouchableOpacity>
  );

  const renderValidationFeedback = () => {
    if (!validation?.showFeedback) return null;

    return (
      <View style={styles.feedbackContainer}>
        {validation.errors.map((error, index) => (
          <Text key={`error-${index}`} style={styles.errorText}>
            • {error}
          </Text>
        ))}

        {validation.warnings.map((warning, index) => (
          <Text key={`warning-${index}`} style={styles.warningText}>
            ⚠ {warning}
          </Text>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelRow}>
        <View style={styles.labelContainer}>
          <Text style={[styles.label, required && styles.requiredLabel]}>
            {label}
          </Text>
          {required && (
            <Text style={styles.asterisk}> *</Text>
          )}
        </View>
        {validation?.showFeedback && (
          <Text style={validation.isValid ? styles.validIcon : styles.errorIcon}>
            {validation.isValid ? '✓' : '✗'}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.selectButton,
          { borderColor: getBorderColor() },
          disabled && styles.disabledButton
        ]}
        onPress={() => !disabled && setIsModalVisible(true)}
        disabled={disabled}
      >
        <Text
          style={[
            styles.selectButtonText,
            (!value || (multiSelect && selectedOptions.length === 0)) &&
              styles.placeholderText
          ]}
        >
          {getDisplayValue()}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>

      {renderValidationFeedback()}

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>{label}</Text>

            {multiSelect && (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>

          {searchable && (
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search options..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                returnKeyType="search"
              />
            </View>
          )}

          <ScrollView
            style={styles.optionsList}
            showsVerticalScrollIndicator={false}
          >
            {filteredOptions.map((item, index) => (
              <View key={`option-${index}`}>
                {renderOption({ item })}
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  requiredLabel: {
    color: '#1976D2',
  },
  asterisk: {
    color: '#F44336',
  },
  validIcon: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  errorIcon: {
    fontSize: 16,
    color: '#F44336',
    fontWeight: 'bold',
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 12,
    minHeight: 44,
  },
  disabledButton: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  selectButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  feedbackContainer: {
    marginTop: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#F44336',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 13,
    color: '#FF9800',
    marginBottom: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  doneButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  doneButtonText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    fontSize: 16,
    color: '#333',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  optionsList: {
    flex: 1,
    backgroundColor: '#fff',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedOption: {
    backgroundColor: '#e3f2fd',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  selectedOptionText: {
    color: '#1976D2',
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 16,
    color: '#1976D2',
    fontWeight: 'bold',
  },
});

export default SelectInput;