import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { RootTabScreenProps } from '../../types/navigation';
import { QuickEntryForm, FormValidationErrors, Rating } from '../../types/cider';
import { validateQuickEntryForm, sanitizeFormData } from '../../utils/validation';
import { AppError, DatabaseError, ErrorHandler } from '../../utils/errors';
import SafeAreaContainer from '../../components/common/SafeAreaContainer';
import Input from '../../components/common/Input';
import RatingInput from '../../components/common/RatingInput';
import Button from '../../components/common/Button';
import { sqliteService } from '../../services/database/sqlite';

type Props = RootTabScreenProps<'QuickEntry'>;

export default function QuickEntryScreen({ navigation }: Props) {
  const [formData, setFormData] = useState<QuickEntryForm>({
    name: '',
    brand: '',
    abv: 0,
    overallRating: 5 as Rating, // Default to middle rating
  });

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

      // Create the cider record with sanitized data
      const newCider = await sqliteService.createCider({
        name: sanitizedData.name,
        brand: sanitizedData.brand,
        abv: sanitizedData.abv,
        overallRating: sanitizedData.overallRating,
      });

      console.log('New cider created:', newCider);

      // Reset form
      resetForm();

      Alert.alert(
        'Success!',
        `${newCider.name} has been added to your collection.`,
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
      overallRating: 5 as Rating,
    });
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
  const updateRating = useMemo(() => updateFormData('overallRating'), [updateFormData]);

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
              value={formData.abv === 0 ? '' : formData.abv.toString()}
              onChangeText={(text) => {
                const numValue = parseFloat(text) || 0;
                updateAbv(numValue);
              }}
              placeholder="e.g., 5.0"
              error={errors.abv}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />

            <RatingInput
              label="Overall Rating"
              rating={formData.overallRating}
              onRatingChange={updateRating}
              maxRating={10}
            />
            {errors.overallRating && (
              <View style={styles.errorContainer}>
                <Input
                  label=""
                  value=""
                  onChangeText={() => {}}
                  error={errors.overallRating}
                  containerStyle={styles.hiddenInput}
                />
              </View>
            )}

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
  errorContainer: {
    marginTop: -16,
  },
  hiddenInput: {
    height: 0,
    marginBottom: 0,
  },
});