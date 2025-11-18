import React, { memo, useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  Animated,
} from 'react-native';

interface Props extends TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  containerStyle?: ViewStyle;
  required?: boolean;
}

const Input = memo<Props>(({
  label,
  value,
  onChangeText,
  error,
  containerStyle,
  required = false,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const hasValue = Boolean(value);
  const hasError = Boolean(error);

  // Determine input border style based on state
  const getBorderStyle = () => {
    if (hasError) return styles.inputError;
    if (isFocused) return styles.inputFocused;
    return undefined;
  };
  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelContainer}>
        <Text style={[
          styles.label,
          isFocused && styles.labelFocused,
          hasError && styles.labelError
        ]}>
          {label}
        </Text>
        {required && (
          <Text style={styles.required}> *</Text>
        )}
      </View>
      <TextInput
        style={[styles.input, getBorderStyle()]}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholderTextColor="#999"
        selectionColor="#007AFF"
        accessibilityLabel={label}
        accessibilityHint={required ? 'Required field' : undefined}
        {...textInputProps}
      />
      {error && (
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
});

Input.displayName = 'Input';

export default Input;

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    transition: 'color 0.2s ease',
  },
  labelFocused: {
    color: '#007AFF',
  },
  labelError: {
    color: '#FF3B30',
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E1E1E1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#FBFBFB',
    minHeight: 52,
    textAlignVertical: 'center',
  },
  inputFocused: {
    borderColor: '#007AFF',
    backgroundColor: '#fff',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 6,
    marginLeft: 4,
  },
});