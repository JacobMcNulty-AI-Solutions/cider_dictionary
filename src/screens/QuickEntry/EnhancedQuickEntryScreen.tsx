// Enhanced QuickEntry Screen with Progressive Disclosure
// Now uses the shared CiderForm component for consistency with edit screen

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  BackHandler
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { RootTabScreenProps } from '../../types/navigation';
import { CiderMasterRecord } from '../../types/cider';
import { useCiderStore } from '../../store/ciderStore';
import SafeAreaContainer from '../../components/common/SafeAreaContainer';
import CiderForm from '../../components/forms/CiderForm';

type Props = RootTabScreenProps<'QuickEntry'>;

export default function EnhancedQuickEntryScreen({ navigation }: Props) {
  const { addCider } = useCiderStore();
  const [isDirty, setIsDirty] = useState(false);
  // Key to force form reset - changes after each successful save or when screen focuses
  const [formKey, setFormKey] = useState(0);

  // Reset form when screen comes into focus (e.g., navigating back from another tab)
  useFocusEffect(
    useCallback(() => {
      // Reset form key to force fresh form state
      setFormKey(prev => prev + 1);
      setIsDirty(false);
    }, [])
  );

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (isDirty) {
        Alert.alert(
          'Discard Changes?',
          'You have unsaved changes. Are you sure you want to go back?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
          ]
        );
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isDirty, navigation]);

  // Handle form submission
  const handleSubmit = useCallback(async (formData: Partial<CiderMasterRecord>) => {
    try {
      // Create cider record
      const ciderData = {
        name: formData.name || 'Unknown Cider',
        brand: formData.brand || 'Unknown Brand',
        abv: formData.abv || 5.0,
        overallRating: formData.overallRating || 5,
        userId: 'default-user',
        ...formData,
      };

      const ciderId = await addCider(ciderData);

      Alert.alert(
        'Success!',
        `"${ciderData.name}" has been added to your collection.`,
        [
          {
            text: 'Add Another',
            style: 'default',
            onPress: () => {
              // Reset form for new entry
              setFormKey(prev => prev + 1);
              setIsDirty(false);
            },
          },
          {
            text: 'View Collection',
            onPress: () => navigation.navigate('Collection'),
            style: 'default',
          },
        ]
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save cider';
      Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
      throw error;
    }
  }, [addCider, navigation]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (isDirty) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [isDirty, navigation]);

  // Handle dirty state changes
  const handleDirtyChange = useCallback((dirty: boolean) => {
    setIsDirty(dirty);
  }, []);

  return (
    <SafeAreaContainer>
      <View testID="enhanced-quick-entry-screen" style={styles.container}>
        <CiderForm
          key={formKey}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitButtonText="Save Cider"
          isEdit={false}
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
});
