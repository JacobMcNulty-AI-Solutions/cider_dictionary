import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RootTabScreenProps } from '../../types/navigation';
import { QuickEntryForm, FormValidationErrors, Rating } from '../../types/cider';
import { validateQuickEntryForm, sanitizeFormData } from '../../utils/validation';
import { AppError, DatabaseError, ErrorHandler } from '../../utils/errors';
import SafeAreaContainer from '../../components/common/SafeAreaContainer';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { sqliteService } from '../../services/database/sqlite';

type Props = RootTabScreenProps<'QuickEntry'>;

export default function QuickEntryScreen({ navigation }: Props) {
  const [formData, setFormData] = useState<Omit<QuickEntryForm, 'overallRating'>>({
    name: '',
    brand: '',
    abv: 0,
  });

  // Separate string state for ABV to preserve decimal point while typing
  const [abvDisplayValue, setAbvDisplayValue] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormValidationErrors>({});

  // Memoize validation result to prevent unnecessary re-computations
  const validationResult = useMemo(() => {
    return validateQuickEntryForm(formData);
  }, [formData]);

  // Use the validation result
  const isFormValid = validationResult.isValid;

  const handleSubmit = useCallback(async () => {
    // Update errors first
    setErrors(validationResult.errors);

    if (!validationResult.isValid) {
      return;
    }

    setIsLoading(true);

    try {
      // Sanitize form data
      const sanitizedData = sanitizeFormData(formData);

      // Initialize database if not already done
      await sqliteService.initializeDatabase();

      // Create the cider record WITHOUT rating (ratings come from experiences)
      const newCider = await sqliteService.createCider({
        name: sanitizedData.name,
        brand: sanitizedData.brand,
        abv: sanitizedData.abv,
        overallRating: 5 as Rating, // Placeholder - will be replaced by cache on first experience
      });

      console.log('New cider created:', newCider);

      // Reset form
      resetForm();

      // OPTIONAL (not forced) - Ask user if they want to log first experience
      Alert.alert(
        'Cider Added!',
        `${newCider.name} has been added to your collection. Would you like to log your first tasting experience?`,
        [
          {
            text: 'Not Now',
            onPress: () => navigation.navigate('Collection'),
            style: 'cancel',
          },
          {
            text: 'Add Another Cider',
            style: 'default',
          },
          {
            text: 'Log First Tasting',
            onPress: () => navigation.navigate('ExperienceLog', {
              ciderId: newCider.id,
              ciderName: newCider.name,
              isFirstExperience: true
            }),
            style: 'default',
          },
        ]
      );
    } catch (error) {
      const appError = ErrorHandler.fromUnknown(error, 'QuickEntryScreen.handleSubmit');
      ErrorHandler.log(appError, 'QuickEntryScreen.handleSubmit');

      // Show user-friendly error message
      const userMessage = appError instanceof AppError
        ? appError.getUserMessage()
        : 'Failed to save the cider. Please try again.';

      const alertButtons = [{ text: 'OK' }];

      // Add retry button for retryable errors
      if (appError instanceof AppError && appError.isRetryable()) {
        alertButtons.unshift({
          text: 'Retry',
          onPress: () => handleSubmit(),
        });
      }

      Alert.alert('Error', userMessage, alertButtons);
    } finally {
      setIsLoading(false);
    }
  }, [formData, validationResult, navigation]);

  // Memoized reset function
  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      brand: '',
      abv: 0,
    });
    setAbvDisplayValue('');
    setErrors({});
  }, []);

  // Memoized form field updaters for better performance
  const updateFormData = useCallback((field: keyof QuickEntryForm) =>
    (value: string | number) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      // Clear error when user starts typing - will be recalculated by useMemo
      if (errors[field]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    }, [errors]);

  // Memoize individual field updaters to prevent re-renders
  const updateName = useMemo(() => updateFormData('name'), [updateFormData]);
  const updateBrand = useMemo(() => updateFormData('brand'), [updateFormData]);
  const updateAbv = useMemo(() => updateFormData('abv'), [updateFormData]);

  return (
    <SafeAreaContainer>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            <Input
              label="Cider Name"
              value={formData.name}
              onChangeText={updateName}
              placeholder="e.g., Angry Orchard Crisp Apple"
              error={errors.name}
              required
              autoCapitalize="words"
              returnKeyType="next"
              maxLength={100}
            />

            <Input
              label="Brand"
              value={formData.brand}
              onChangeText={updateBrand}
              placeholder="e.g., Angry Orchard"
              error={errors.brand}
              required
              autoCapitalize="words"
              returnKeyType="next"
              maxLength={50}
            />

            <Input
              label="ABV (%)"
              value={abvDisplayValue}
              onChangeText={(text) => {
                // Allow empty, numbers, and one decimal point
                if (text === '' || /^\d*\.?\d*$/.test(text)) {
                  setAbvDisplayValue(text);
                  const numValue = parseFloat(text) || 0;
                  updateAbv(numValue);
                }
              }}
              placeholder="e.g., 5.0"
              error={errors.abv}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />

            {/* Info banner explaining ratings come from experiences */}
            <View style={styles.ratingInfoBanner}>
              <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
              <Text style={styles.ratingInfoText}>
                Ratings are based on your tasting experiences. After adding a cider,
                log your first tasting to rate it.
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <Button
                title="Save Cider"
                onPress={handleSubmit}
                loading={isLoading}
                disabled={isLoading}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaContainer>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  form: {
    padding: 20,
  },
  buttonContainer: {
    marginTop: 32,
    marginBottom: 20,
  },
  ratingInfoBanner: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  ratingInfoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
});