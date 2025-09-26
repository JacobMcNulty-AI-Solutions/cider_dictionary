// Enhanced Input Component with Real-Time Validation
// Provides immediate visual feedback, warnings, and suggestions

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  TouchableOpacity
} from 'react-native';
import { FieldValidationState } from '../../types/cider';

interface ValidatedInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  placeholder?: string;
  validation?: FieldValidationState;
  suggestions?: string[];
  onSuggestionPress?: (suggestion: string) => void;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  returnKeyType?: 'done' | 'next' | 'send' | 'search';
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  editable?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  containerStyle?: any;
}

const ValidatedInput: React.FC<ValidatedInputProps> = ({
  label,
  value,
  onChangeText,
  onBlur,
  onFocus,
  placeholder,
  validation,
  suggestions = [],
  onSuggestionPress,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  returnKeyType = 'done',
  multiline = false,
  numberOfLines = 1,
  maxLength,
  editable = true,
  required = false,
  autoFocus = false,
  containerStyle
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const animatedColor = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setShowSuggestions(suggestions.length > 0);
    onFocus?.();

    Animated.timing(animatedColor, {
      toValue: validation?.isValid === false ? 2 : 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [validation?.isValid, suggestions.length, onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    setShowSuggestions(false);
    onBlur?.();

    Animated.timing(animatedColor, {
      toValue: validation?.isValid === false ? 2 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [validation?.isValid, onBlur]);

  const handleSuggestionPress = useCallback((suggestion: string) => {
    onSuggestionPress?.(suggestion);
    setShowSuggestions(false);
    inputRef.current?.blur();
  }, [onSuggestionPress]);

  const getBorderColor = () => {
    return animatedColor.interpolate({
      inputRange: [0, 1, 2],
      outputRange: ['#e0e0e0', '#2196F3', '#F44336'],
    });
  };

  const getValidationIcon = () => {
    if (!validation?.showFeedback) return null;

    if (validation.isValid) {
      return <Text style={styles.validIcon}>✓</Text>;
    } else {
      return <Text style={styles.errorIcon}>✗</Text>;
    }
  };

  const renderValidationFeedback = () => {
    if (!validation?.showFeedback) return null;

    return (
      <View style={styles.feedbackContainer}>
        {/* Errors */}
        {validation.errors.map((error, index) => (
          <Text key={`error-${index}`} style={styles.errorText}>
            • {error}
          </Text>
        ))}

        {/* Warnings */}
        {validation.warnings.map((warning, index) => (
          <Text key={`warning-${index}`} style={styles.warningText}>
            ⚠ {warning}
          </Text>
        ))}

        {/* Suggestions */}
        {validation.suggestions.slice(0, 2).map((suggestion, index) => (
          <Text key={`suggestion-${index}`} style={styles.suggestionText}>
            💡 {suggestion}
          </Text>
        ))}
      </View>
    );
  };

  const renderSuggestions = () => {
    if (!showSuggestions || suggestions.length === 0) return null;

    return (
      <View style={styles.suggestionsContainer}>
        {suggestions.map((item, index) => (
          <TouchableOpacity
            key={`suggestion-${index}`}
            style={styles.suggestionItem}
            onPress={() => handleSuggestionPress(item)}
          >
            <Text style={styles.suggestionItemText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, required && styles.requiredLabel]}>
          {label}
          {required && <Text style={styles.asterisk}> *</Text>}
        </Text>
        {getValidationIcon()}
      </View>

      <Animated.View
        style={[
          styles.inputContainer,
          {
            borderColor: getBorderColor(),
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[styles.input, multiline && styles.multilineInput]}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor="#999"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          editable={editable}
          autoFocus={autoFocus}
        />

        {maxLength && (
          <Text style={styles.characterCount}>
            {value.length}/{maxLength}
          </Text>
        )}
      </Animated.View>

      {renderValidationFeedback()}
      {renderSuggestions()}
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
  inputContainer: {
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
    position: 'relative',
  },
  input: {
    fontSize: 16,
    color: '#333',
    padding: 12,
    minHeight: 44,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    fontSize: 12,
    color: '#999',
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
  suggestionText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  suggestionsContainer: {
    marginTop: 4,
    maxHeight: 120,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionItemText: {
    fontSize: 15,
    color: '#333',
  },
});

export default ValidatedInput;