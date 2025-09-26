// Image Picker Component for Photo Capture
// Handles camera access and gallery selection for cider photos

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform
} from 'react-native';
import * as ImagePickerExpo from 'expo-image-picker';
import { FieldValidationState } from '../../types/cider';

interface ImagePickerProps {
  label: string;
  value?: string;
  onImageSelect: (uri: string | null) => void;
  validation?: FieldValidationState;
  required?: boolean;
  containerStyle?: any;
}

export const ImagePicker: React.FC<ImagePickerProps> = ({
  label,
  value,
  onImageSelect,
  validation,
  required = false,
  containerStyle
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const requestPermissions = async () => {
    // Request camera permissions
    const cameraPermission = await ImagePickerExpo.requestCameraPermissionsAsync();
    const mediaLibraryPermission = await ImagePickerExpo.requestMediaLibraryPermissionsAsync();

    if (cameraPermission.status !== 'granted' || mediaLibraryPermission.status !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Camera and photo library access are needed to add photos to your cider entries.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Add Photo',
      'Choose how you want to add a photo of your cider',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickFromGallery },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setIsLoading(true);
    try {
      const result = await ImagePickerExpo.launchCameraAsync({
        mediaTypes: ImagePickerExpo.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelect(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      console.error('Camera error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const pickFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setIsLoading(true);
    try {
      const result = await ImagePickerExpo.launchImageLibraryAsync({
        mediaTypes: ImagePickerExpo.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelect(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photo. Please try again.');
      console.error('Gallery error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removePhoto = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onImageSelect(null) }
      ]
    );
  };

  const getBorderColor = () => {
    if (validation?.showFeedback) {
      return validation.isValid ? '#4CAF50' : '#F44336';
    }
    return '#e0e0e0';
  };

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
        {validation.suggestions.map((suggestion, index) => (
          <Text key={`suggestion-${index}`} style={styles.suggestionText}>
            💡 {suggestion}
          </Text>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      </View>

      <View style={[styles.imageContainer, { borderColor: getBorderColor() }]}>
        {value ? (
          <>
            <Image source={{ uri: value }} style={styles.image} resizeMode="cover" />
            <View style={styles.imageOverlay}>
              <TouchableOpacity
                style={styles.changeButton}
                onPress={showImagePickerOptions}
                disabled={isLoading}
              >
                <Text style={styles.changeButtonText}>Change Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={removePhoto}
                disabled={isLoading}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <TouchableOpacity
            style={styles.placeholderButton}
            onPress={showImagePickerOptions}
            disabled={isLoading}
          >
            <Text style={styles.cameraIcon}>📷</Text>
            <Text style={styles.placeholderText}>
              {isLoading ? 'Loading...' : 'Add Photo'}
            </Text>
            <Text style={styles.placeholderSubtext}>
              Tap to take photo or choose from gallery
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {renderValidationFeedback()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  required: {
    color: '#F44336',
  },
  imageContainer: {
    height: 200,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  changeButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  changeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  removeButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#F44336',
    borderRadius: 4,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  placeholderButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  cameraIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  feedbackContainer: {
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 12,
    color: '#FF9800',
    marginBottom: 2,
  },
  suggestionText: {
    fontSize: 12,
    color: '#2196F3',
    marginBottom: 2,
  },
});