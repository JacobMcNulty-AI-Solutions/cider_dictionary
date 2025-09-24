import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { RootTabScreenProps } from '../../types/navigation';
import { QuickEntryForm } from '../../types/cider';
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
    overallRating: 5, // Default to middle rating
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Cider name is required';
    }

    if (!formData.brand.trim()) {
      newErrors.brand = 'Brand is required';
    }

    if (formData.abv <= 0 || formData.abv > 20) {
      newErrors.abv = 'ABV must be between 0.1% and 20%';
    }

    if (formData.overallRating < 1 || formData.overallRating > 10) {
      newErrors.overallRating = 'Rating must be between 1 and 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Initialize database if not already done
      await sqliteService.initializeDatabase();

      // Create the cider record
      const newCider = await sqliteService.createCider({
        name: formData.name.trim(),
        brand: formData.brand.trim(),
        abv: formData.abv,
        overallRating: formData.overallRating,
      });

      console.log('New cider created:', newCider);

      // Reset form
      setFormData({
        name: '',
        brand: '',
        abv: 0,
        overallRating: 5,
      });

      setErrors({});

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
      console.error('Failed to save cider:', error);
      Alert.alert(
        'Error',
        'Failed to save the cider. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof QuickEntryForm) => (value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

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
              onChangeText={updateFormData('name')}
              placeholder="e.g., Angry Orchard Crisp Apple"
              error={errors.name}
              required
              autoCapitalize="words"
              returnKeyType="next"
            />

            <Input
              label="Brand"
              value={formData.brand}
              onChangeText={updateFormData('brand')}
              placeholder="e.g., Angry Orchard"
              error={errors.brand}
              required
              autoCapitalize="words"
              returnKeyType="next"
            />

            <Input
              label="ABV (%)"
              value={formData.abv === 0 ? '' : formData.abv.toString()}
              onChangeText={(text) => {
                const numValue = parseFloat(text) || 0;
                updateFormData('abv')(numValue);
              }}
              placeholder="e.g., 5.0"
              error={errors.abv}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />

            <RatingInput
              label="Overall Rating"
              rating={formData.overallRating}
              onRatingChange={updateFormData('overallRating')}
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