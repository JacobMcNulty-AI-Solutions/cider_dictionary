// CiderEditScreen - Screen for editing existing cider records
// Uses the shared CiderForm component

import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Alert, BackHandler, ActivityIndicator, Text } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../types/navigation';
import { CiderMasterRecord } from '../../types/cider';
import { useCiderStore } from '../../store/ciderStore';
import CiderForm from '../../components/forms/CiderForm';
import SafeAreaContainer from '../../components/common/SafeAreaContainer';

type Props = StackScreenProps<RootStackParamList, 'CiderEdit'>;

export default function CiderEditScreen({ route, navigation }: Props) {
  const { ciderId } = route.params;
  const { getCiderById, updateCider } = useCiderStore();

  const [originalCider, setOriginalCider] = useState<CiderMasterRecord | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing cider data
  useEffect(() => {
    const cider = getCiderById(ciderId);
    if (cider) {
      setOriginalCider(cider);
      setIsLoading(false);
    } else {
      Alert.alert('Error', 'Cider not found', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
  }, [ciderId, getCiderById, navigation]);

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

  // Handle Android back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (isDirty) {
          showDiscardAlert();
          return true; // Prevent default back behavior
        }
        return false; // Allow default back behavior
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [isDirty, showDiscardAlert])
  );

  // Handle cancel action
  const handleCancel = useCallback(() => {
    if (isDirty) {
      showDiscardAlert();
    } else {
      navigation.goBack();
    }
  }, [isDirty, showDiscardAlert, navigation]);

  // Handle form submission
  const handleSubmit = useCallback(async (formData: Partial<CiderMasterRecord>) => {
    if (!originalCider) return;

    try {
      await updateCider(originalCider.id, formData);
      Alert.alert('Success', 'Cider updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Failed to update cider:', error);
      Alert.alert('Error', 'Failed to update cider. Please try again.');
    }
  }, [originalCider, updateCider, navigation]);

  // Handle dirty state changes
  const handleDirtyChange = useCallback((dirty: boolean) => {
    setIsDirty(dirty);
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading cider...</Text>
        </View>
      </SafeAreaContainer>
    );
  }

  // Show error state if cider not found
  if (!originalCider) {
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
      <View style={styles.container}>
        <CiderForm
          initialData={originalCider}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitButtonText="Update Cider"
          isEdit={true}
          onDirtyChange={handleDirtyChange}
        />
      </View>
    </SafeAreaContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
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
