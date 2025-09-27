// Phase 3: Experience Logging Screen
// Complete implementation with venue detection, GPS, and price calculation

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
  TouchableOpacity
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { ExperienceFormState, ExperienceLog, CONTAINER_SIZES, VenueInfo, Location } from '../../types/experience';
import { CiderMasterRecord, VenueType, Rating, ContainerType } from '../../types/cider';
import { RootStackParamList } from '../../types/navigation';

import SafeAreaContainer from '../../components/common/SafeAreaContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/common/Button';
import FormSection from '../../components/forms/FormSection';
import LocationPicker from '../../components/maps/LocationPicker';
import VenueSelector from '../../components/venue/VenueSelector';

import { sqliteService } from '../../services/database/sqlite';
import { locationService } from '../../services/location/LocationService';
import { syncManager } from '../../services/sync/SyncManager';

type ExperienceLogRouteProp = RouteProp<RootStackParamList, 'ExperienceLog'>;
type ExperienceLogNavigationProp = StackNavigationProp<RootStackParamList, 'ExperienceLog'>;

interface Props {
  route: ExperienceLogRouteProp;
  navigation: ExperienceLogNavigationProp;
}

export default function ExperienceLogScreen({ route, navigation }: Props) {
  const { ciderId } = route.params;

  // State
  const [cider, setCider] = useState<CiderMasterRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState(Date.now());

  const [formState, setFormState] = useState<ExperienceFormState>({
    ciderId,
    venue: {
      id: '',
      name: '',
      type: 'pub',
      location: undefined
    },
    price: 0,
    containerSize: CONTAINER_SIZES.PINT,
    containerType: 'bottle',
    notes: '',
    date: new Date(),
    rating: undefined
  });

  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);

  // Auto-calculate price per pint
  const pricePerPint = useMemo(() => {
    if (formState.price > 0 && formState.containerSize > 0) {
      const PINT_SIZE = 568; // ml
      return Math.round((formState.price * PINT_SIZE / formState.containerSize) * 100) / 100; // Round to 2 decimal places
    }
    return 0;
  }, [formState.price, formState.containerSize]);

  // Form validation
  const isFormValid = useMemo(() => {
    return (
      formState.venue.id &&
      formState.venue.name.trim().length >= 2 &&
      formState.venue.location &&
      formState.price > 0 &&
      formState.containerSize > 0 &&
      pricePerPint > 0
    );
  }, [formState, pricePerPint]);

  // Load cider data and location
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);

        // Load cider data
        const ciderData = await sqliteService.getCiderById(ciderId);
        if (!ciderData) {
          Alert.alert('Error', 'Cider not found');
          navigation.goBack();
          return;
        }
        setCider(ciderData);

        // Get current location
        const locationResult = await locationService.getCurrentLocation();
        if (locationResult.success && locationResult.location) {
          setCurrentLocation(locationResult.location);
          // Don't automatically set venue location - let user choose venue first
        } else {
          setLocationError(locationResult.error || 'Unable to get location');
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
        Alert.alert('Error', 'Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [ciderId, navigation]);

  const handleVenueSelect = useCallback((venue: VenueInfo) => {
    setFormState(prev => ({
      ...prev,
      venue
    }));
  }, []);

  const handleLocationUpdate = useCallback((location: Location) => {
    setCurrentLocation(location);
  }, []);

  const handlePriceChange = useCallback((price: number) => {
    if (price >= 0 && price <= 100) {
      setFormState(prev => ({
        ...prev,
        price
      }));
    }
  }, []);

  const handleContainerSizeChange = useCallback((size: number) => {
    setFormState(prev => ({
      ...prev,
      containerSize: size
    }));
  }, []);

  const handleContainerTypeChange = useCallback((type: ContainerType) => {
    setFormState(prev => ({
      ...prev,
      containerType: type
    }));
  }, []);

  const handleNotesChange = useCallback((notes: string) => {
    if (notes.length <= 500) {
      setFormState(prev => ({
        ...prev,
        notes
      }));
    }
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!isFormValid || !cider) return;

    setIsSubmitting(true);
    const completionTime = (Date.now() - startTime) / 1000;

    try {
      // Create experience log
      const experience: ExperienceLog = {
        id: generateUUID(),
        userId: 'current-user', // TODO: Get from auth context
        ciderId: formState.ciderId,
        date: formState.date,
        venue: formState.venue,
        price: formState.price,
        containerSize: formState.containerSize,
        containerType: formState.containerType,
        pricePerPint,
        notes: formState.notes || undefined,
        rating: formState.rating,
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending',
        version: 1
      };

      // Save locally first (optimistic update)
      await sqliteService.createExperience(experience);

      // Queue for sync
      await syncManager.queueOperation('CREATE_EXPERIENCE', experience);

      // Record performance metric
      console.log(`Experience entry completed in ${completionTime}s (target: <30s)`);

      // Show success and navigate back
      Alert.alert(
        'Success!',
        `Experience logged successfully!\nCompletion time: ${completionTime.toFixed(1)}s`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );

    } catch (error) {
      console.error('Failed to log experience:', error);
      Alert.alert(
        'Error',
        'Failed to log experience. Please check your connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [formState, isFormValid, cider, pricePerPint, startTime, navigation]);

  if (isLoading) {
    return (
      <SafeAreaContainer>
        <LoadingSpinner message="Loading cider details..." />
      </SafeAreaContainer>
    );
  }

  if (!cider) {
    return (
      <SafeAreaContainer>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Cider not found</Text>
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

          {/* Location Status */}
          {locationError && (
            <View style={styles.locationError}>
              <Ionicons name="location-outline" size={16} color="#FF6B6B" />
              <Text style={styles.locationErrorText}>{locationError}</Text>
            </View>
          )}

          {/* Venue Selection */}
          <FormSection title="Where did you try it?">
            <VenueSelector
              selectedVenue={formState.venue.id ? formState.venue : null}
              currentLocation={currentLocation}
              onVenueSelect={handleVenueSelect}
              onLocationUpdate={handleLocationUpdate}
            />
          </FormSection>

          {/* Price & Container */}
          <FormSection title="Price & Container">
            <PriceInput
              label="Price (£)"
              value={formState.price}
              onChangeText={handlePriceChange}
              placeholder="0.00"
            />

            <ContainerSizeSelector
              value={formState.containerSize}
              onSelect={handleContainerSizeChange}
              presets={Object.values(CONTAINER_SIZES)}
            />

            <ContainerTypeSelector
              value={formState.containerType}
              onSelect={handleContainerTypeChange}
            />

            <PricePerPintDisplay value={pricePerPint} />
          </FormSection>

          {/* Notes */}
          <FormSection title="Notes (optional)">
            <NotesInput
              value={formState.notes}
              onChangeText={handleNotesChange}
              placeholder="How was it? Any thoughts?"
              maxLength={500}
            />
            <Text style={styles.characterCount}>
              {formState.notes.length}/500 characters
            </Text>
          </FormSection>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <Button
            title={isSubmitting ? "Logging Experience..." : "Log Experience"}
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

// Helper Components

// Additional helper components
const PriceInput: React.FC<{
  label: string;
  value: number;
  onChangeText: (value: number) => void;
  placeholder?: string;
}> = ({ label, value, onChangeText, placeholder }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value > 0 ? value.toString() : ''}
      onChangeText={(text) => onChangeText(parseFloat(text) || 0)}
      placeholder={placeholder}
      keyboardType="decimal-pad"
      returnKeyType="done"
    />
  </View>
);

const ContainerSizeSelector: React.FC<{
  value: number;
  onSelect: (size: number) => void;
  presets: number[];
}> = ({ value, onSelect, presets }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>Container Size</Text>
    <View style={styles.containerSizeRow}>
      {presets.map((size, index) => (
        <TouchableOpacity
          key={`container-${index}-${size}`}
          style={[
            styles.containerSizeButton,
            value === size && styles.containerSizeButtonActive
          ]}
          onPress={() => onSelect(size)}
        >
          <Text style={[
            styles.containerSizeText,
            value === size && styles.containerSizeTextActive
          ]}>
            {size >= 1000 ? `${size / 1000}L` : `${size}ml`}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const ContainerTypeSelector: React.FC<{
  value: ContainerType;
  onSelect: (type: ContainerType) => void;
}> = ({ value, onSelect }) => {
  const containerTypes: { value: ContainerType; label: string; icon: string }[] = [
    { value: 'bottle', label: 'Bottle', icon: 'wine' },
    { value: 'can', label: 'Can', icon: 'cylinder' },
    { value: 'draught', label: 'Draught', icon: 'beer' },
    { value: 'bag_in_box', label: 'Bag in Box', icon: 'cube' },
    { value: 'other', label: 'Other', icon: 'help-circle' },
  ];

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>Container Type</Text>
      <View style={styles.containerTypeRow}>
        {containerTypes.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.containerTypeButton,
              value === type.value && styles.containerTypeButtonActive
            ]}
            onPress={() => onSelect(type.value)}
          >
            <Ionicons
              name={type.icon as any}
              size={20}
              color={value === type.value ? '#fff' : '#666'}
            />
            <Text style={[
              styles.containerTypeText,
              value === type.value && styles.containerTypeTextActive
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const PricePerPintDisplay: React.FC<{
  value: number;
}> = ({ value }) => (
  <View style={styles.pricePerPintContainer}>
    <Text style={styles.pricePerPintLabel}>Price per pint:</Text>
    <Text style={styles.pricePerPintValue}>
      £{value > 0 ? value.toFixed(2) : '0.00'}
    </Text>
  </View>
);

const NotesInput: React.FC<{
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
}> = ({ value, onChangeText, placeholder, maxLength = 500 }) => (
  <View style={styles.inputContainer}>
    <TextInput
      style={[styles.input, styles.notesInput]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      multiline
      numberOfLines={4}
      maxLength={maxLength}
      textAlignVertical="top"
    />
    <Text style={styles.characterCount}>
      {value.length}/{maxLength}
    </Text>
  </View>
);

// Utility functions
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

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
  locationError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  locationErrorText: {
    fontSize: 14,
    color: '#FF6B6B',
    marginLeft: 8,
    flex: 1,
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
  characterCount: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
    marginTop: 4,
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
  submitContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  submitButton: {
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
});