// Experience Edit Screen
// Allows editing an existing experience record

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  KeyboardTypeOptions,
  BackHandler
} from 'react-native';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { ExperienceLog, CONTAINER_SIZES, VenueInfo, Location } from '../../types/experience';
import { CiderMasterRecord, ContainerType, Rating } from '../../types/cider';
import { RootStackParamList } from '../../types/navigation';

import SafeAreaContainer from '../../components/common/SafeAreaContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/common/Button';
import RatingInput from '../../components/common/RatingInput';
import FormSection from '../../components/forms/FormSection';
import VenueSelector from '../../components/venue/VenueSelector';

import { sqliteService } from '../../services/database/sqlite';
import { syncManager } from '../../services/sync/SyncManager';

type ExperienceEditRouteProp = RouteProp<RootStackParamList, 'ExperienceEdit'>;
type ExperienceEditNavigationProp = StackNavigationProp<RootStackParamList, 'ExperienceEdit'>;

export default function ExperienceEditScreen() {
  const route = useRoute<ExperienceEditRouteProp>();
  const navigation = useNavigation<ExperienceEditNavigationProp>();
  const { experienceId } = route.params;

  // State
  const [experience, setExperience] = useState<ExperienceLog | null>(null);
  const [cider, setCider] = useState<CiderMasterRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Form state
  const [venue, setVenue] = useState<VenueInfo>({
    id: '',
    name: '',
    type: 'pub',
    location: undefined
  });
  const [price, setPrice] = useState(0);
  const [priceDisplay, setPriceDisplay] = useState('');
  const [containerSize, setContainerSize] = useState(CONTAINER_SIZES.PINT);
  const [containerType, setContainerType] = useState<ContainerType>('bottle');
  const [containerTypeCustom, setContainerTypeCustom] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const [detailedRatings, setDetailedRatings] = useState<{
    appearance?: Rating;
    aroma?: Rating;
    taste?: Rating;
    mouthfeel?: Rating;
  }>({
    appearance: undefined,
    aroma: undefined,
    taste: undefined,
    mouthfeel: undefined
  });
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);

  // Auto-calculate price per pint
  const pricePerPint = useMemo(() => {
    if (price > 0 && containerSize > 0) {
      const PINT_SIZE = 568; // ml
      return Math.round((price * PINT_SIZE / containerSize) * 100) / 100;
    }
    return 0;
  }, [price, containerSize]);

  // Auto-calculate overall rating from detailed ratings
  const overallRating = useMemo(() => {
    const { appearance, aroma, taste, mouthfeel } = detailedRatings || {};
    const ratings = [appearance, aroma, taste, mouthfeel].filter((r): r is number => r !== undefined);

    if (ratings.length === 0) return undefined;

    const sum = ratings.reduce((acc, r) => acc + r, 0);
    const average = sum / ratings.length;
    const rounded = Math.round(average * 10) / 10; // Round to 1 decimal place
    return Math.max(1, Math.min(10, rounded)) as Rating;
  }, [detailedRatings]);

  // Form validation
  const isFormValid = useMemo(() => {
    const hasAllDetailedRatings =
      detailedRatings?.appearance !== undefined &&
      detailedRatings?.aroma !== undefined &&
      detailedRatings?.taste !== undefined &&
      detailedRatings?.mouthfeel !== undefined;

    return (
      venue.id &&
      venue.name.trim().length >= 2 &&
      venue.location &&
      price > 0 &&
      containerSize > 0 &&
      hasAllDetailedRatings && // Require all 4 detailed ratings
      pricePerPint > 0
    );
  }, [venue, price, containerSize, detailedRatings, pricePerPint]);

  // Load experience data
  useEffect(() => {
    const loadExperienceData = async () => {
      try {
        setIsLoading(true);

        // Get experience
        const allExperiences = await sqliteService.getAllExperiences();
        const foundExperience = allExperiences.find(exp => exp.id === experienceId);

        if (!foundExperience) {
          Alert.alert('Error', 'Experience not found');
          navigation.goBack();
          return;
        }

        setExperience(foundExperience);

        // Populate form state
        setVenue(foundExperience.venue);
        setPrice(foundExperience.price);
        setPriceDisplay(foundExperience.price > 0 ? foundExperience.price.toString() : '');
        setContainerSize(foundExperience.containerSize);
        setContainerType(foundExperience.containerType);
        setContainerTypeCustom(foundExperience.containerTypeCustom);
        setNotes(foundExperience.notes || '');
        setDetailedRatings(foundExperience.detailedRatings || {
          appearance: undefined,
          aroma: undefined,
          taste: undefined,
          mouthfeel: undefined
        });
        if (foundExperience.venue.location) {
          setCurrentLocation(foundExperience.venue.location);
        }

        // Load cider data
        const ciderData = await sqliteService.getCiderById(foundExperience.ciderId);
        setCider(ciderData);
      } catch (error) {
        console.error('Failed to load experience:', error);
        Alert.alert('Error', 'Failed to load experience data');
        navigation.goBack();
      } finally {
        setIsLoading(false);
      }
    };

    loadExperienceData();
  }, [experienceId, navigation]);

  // Show discard confirmation dialog
  const showDiscardAlert = useCallback(() => {
    Alert.alert(
      'Discard Changes?',
      'You have unsaved changes. Are you sure you want to discard them?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() }
      ]
    );
  }, [navigation]);

  // Handle Android back button - only when this screen is focused
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (isDirty) {
          showDiscardAlert();
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [isDirty, showDiscardAlert])
  );

  const handleVenueSelect = useCallback((selectedVenue: VenueInfo) => {
    setVenue(selectedVenue);
    setIsDirty(true);
  }, []);

  const handleLocationUpdate = useCallback((location: Location) => {
    setCurrentLocation(location);
  }, []);

  const handlePriceChange = useCallback((text: string) => {
    if (text === '' || /^\d*\.?\d{0,2}$/.test(text)) {
      setPriceDisplay(text);
      const numValue = parseFloat(text);
      if (!isNaN(numValue)) {
        setPrice(numValue);
      } else if (text === '') {
        setPrice(0);
      }
      setIsDirty(true);
    }
  }, []);

  const handleContainerSizeChange = useCallback((size: number) => {
    setContainerSize(size);
    setIsDirty(true);
  }, []);

  const handleContainerTypeChange = useCallback((type: ContainerType) => {
    setContainerType(type);
    if (type !== 'other') {
      setContainerTypeCustom(undefined);
    }
    setIsDirty(true);
  }, []);

  const handleContainerTypeCustomChange = useCallback((customType: string) => {
    setContainerTypeCustom(customType);
    setIsDirty(true);
  }, []);

  const handleNotesChange = useCallback((text: string) => {
    if (text.length <= 500) {
      setNotes(text);
      setIsDirty(true);
    }
  }, []);

  const handleDetailedRatingChange = useCallback((field: 'appearance' | 'aroma' | 'taste' | 'mouthfeel', newRating: number) => {
    setDetailedRatings(prev => ({
      ...prev,
      [field]: newRating as Rating
    }));
    setIsDirty(true);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!isFormValid || !experience) return;

    setIsSubmitting(true);

    try {
      // Create updated experience
      const updatedExperience: ExperienceLog = {
        ...experience,
        venue,
        price,
        containerSize,
        containerType,
        containerTypeCustom,
        pricePerPint,
        notes: notes || undefined,
        rating: overallRating!,
        detailedRatings,
        updatedAt: new Date(),
        syncStatus: 'pending',
        version: (experience.version || 1) + 1
      };

      // Update in database
      await sqliteService.updateExperience(experienceId, updatedExperience);

      // Queue for sync
      await syncManager.queueOperation('UPDATE_EXPERIENCE', updatedExperience);

      Alert.alert(
        'Success!',
        'Experience updated successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Failed to update experience:', error);
      Alert.alert('Error', 'Failed to update experience. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [experience, venue, price, containerSize, containerType, containerTypeCustom, pricePerPint, notes, rating, detailedRatings, isFormValid, experienceId, navigation]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (isDirty) {
      showDiscardAlert();
    } else {
      navigation.goBack();
    }
  }, [isDirty, showDiscardAlert, navigation]);

  if (isLoading) {
    return (
      <SafeAreaContainer>
        <LoadingSpinner message="Loading experience..." />
      </SafeAreaContainer>
    );
  }

  if (!experience || !cider) {
    return (
      <SafeAreaContainer>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Experience not found</Text>
        </View>
      </SafeAreaContainer>
    );
  }

  return (
    <SafeAreaContainer>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Cider Reference */}
          <View style={styles.ciderReference}>
            <Text style={styles.ciderName}>{cider.name}</Text>
            <Text style={styles.ciderBrand}>by {cider.brand}</Text>
            <Text style={styles.ciderDetails}>{cider.abv}% ABV • Rating: {cider.overallRating}/10</Text>
          </View>

          {/* Venue Selection */}
          <FormSection title="Where did you try it?">
            <VenueSelector
              selectedVenue={venue.id ? venue : null}
              currentLocation={currentLocation}
              onVenueSelect={handleVenueSelect}
              onLocationUpdate={handleLocationUpdate}
            />
          </FormSection>

          {/* Price & Container */}
          <FormSection title="Price & Container">
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Price (£)</Text>
              <TextInput
                style={styles.input}
                value={priceDisplay}
                onChangeText={handlePriceChange}
                placeholder="0.00"
                keyboardType={Platform.OS === 'android' ? 'numeric' : 'decimal-pad'}
                returnKeyType="done"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Container Size</Text>
              <View style={styles.containerSizeRow}>
                {Object.values(CONTAINER_SIZES).map((size, index) => (
                  <TouchableOpacity
                    key={`container-${index}-${size}`}
                    style={[
                      styles.containerSizeButton,
                      containerSize === size && styles.containerSizeButtonActive
                    ]}
                    onPress={() => handleContainerSizeChange(size)}
                  >
                    <Text style={[
                      styles.containerSizeText,
                      containerSize === size && styles.containerSizeTextActive
                    ]}>
                      {size >= 1000 ? `${size / 1000}L` : `${size}ml`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Container Type</Text>
              <View style={styles.containerTypeRow}>
                {[
                  { value: 'bottle' as ContainerType, label: 'Bottle', icon: 'wine' },
                  { value: 'can' as ContainerType, label: 'Can', icon: 'download' },
                  { value: 'draught' as ContainerType, label: 'Draught', icon: 'beer' },
                  { value: 'keg' as ContainerType, label: 'Keg', icon: 'flask' },
                  { value: 'bag_in_box' as ContainerType, label: 'Bag in Box', icon: 'cube' },
                  { value: 'other' as ContainerType, label: 'Other', icon: 'help-circle' },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.containerTypeButton,
                      containerType === type.value && styles.containerTypeButtonActive
                    ]}
                    onPress={() => handleContainerTypeChange(type.value)}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={20}
                      color={containerType === type.value ? '#fff' : '#666'}
                    />
                    <Text style={[
                      styles.containerTypeText,
                      containerType === type.value && styles.containerTypeTextActive
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {containerType === 'other' && (
                <View style={{ marginTop: 12 }}>
                  <TextInput
                    style={styles.input}
                    value={containerTypeCustom || ''}
                    onChangeText={handleContainerTypeCustomChange}
                    placeholder="Specify container type..."
                    placeholderTextColor="#999"
                    returnKeyType="done"
                  />
                </View>
              )}
            </View>

            <View style={styles.pricePerPintContainer}>
              <Text style={styles.pricePerPintLabel}>Price per pint:</Text>
              <Text style={styles.pricePerPintValue}>
                £{pricePerPint > 0 ? pricePerPint.toFixed(2) : '0.00'}
              </Text>
            </View>
          </FormSection>

          {/* Rating Section */}
          <FormSection title="Rating">
            <View style={styles.detailedRatingsContainer}>
              <RatingInput
                label="Appearance"
                rating={detailedRatings?.appearance}
                onRatingChange={(rating) => handleDetailedRatingChange('appearance', rating)}
                maxRating={10}
                required
              />
              <RatingInput
                label="Aroma"
                rating={detailedRatings?.aroma}
                onRatingChange={(rating) => handleDetailedRatingChange('aroma', rating)}
                maxRating={10}
                required
              />
              <RatingInput
                label="Taste"
                rating={detailedRatings?.taste}
                onRatingChange={(rating) => handleDetailedRatingChange('taste', rating)}
                maxRating={10}
                required
              />
              <RatingInput
                label="Mouthfeel"
                rating={detailedRatings?.mouthfeel}
                onRatingChange={(rating) => handleDetailedRatingChange('mouthfeel', rating)}
                maxRating={10}
                required
              />
            </View>

            {overallRating !== undefined && (
              <View style={styles.calculatedRatingBox}>
                <Text style={styles.calculatedRatingLabel}>Overall Rating (calculated)</Text>
                <Text style={styles.calculatedRatingValue}>{overallRating.toFixed(1)}/10</Text>
              </View>
            )}
          </FormSection>

          {/* Notes */}
          <FormSection title="Notes (optional)">
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={handleNotesChange}
                placeholder="How was it? Any thoughts?"
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.characterCount}>
                {notes.length}/500 characters
              </Text>
            </View>
          </FormSection>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Button
            title={isSubmitting ? "Saving..." : "Save Changes"}
            onPress={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            loading={isSubmitting}
            style={[
              styles.submitButton,
              !isFormValid && styles.submitButtonDisabled
            ]}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  ciderReference: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ciderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  ciderBrand: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  ciderDetails: {
    fontSize: 14,
    color: '#888',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
    marginTop: 4,
  },
  containerSizeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  containerSizeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  containerSizeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  containerSizeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  containerSizeTextActive: {
    color: '#fff',
  },
  containerTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  containerTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 6,
  },
  containerTypeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  containerTypeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  containerTypeTextActive: {
    color: '#fff',
  },
  pricePerPintContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    marginBottom: 16,
  },
  pricePerPintLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  pricePerPintValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  detailedRatingsContainer: {
    gap: 8,
  },
  calculatedRatingBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calculatedRatingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  calculatedRatingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
});
