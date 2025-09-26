// Cider Detail Screen - Shows detailed view of a single cider
// Displays all cider information with edit/delete options

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { CiderMasterRecord } from '../../types/cider';
import { useCiderStore } from '../../store/ciderStore';
import { RootStackParamList } from '../../types/navigation';
import SafeAreaContainer from '../../components/common/SafeAreaContainer';
import Button from '../../components/common/Button';

type Props = StackScreenProps<RootStackParamList, 'CiderDetail'>;

export default function CiderDetailScreen({ route, navigation }: Props) {
  const { ciderId } = route.params;
  const { getCiderById, deleteCider } = useCiderStore();
  const [cider, setCider] = useState<CiderMasterRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const ciderData = getCiderById(ciderId);
      setCider(ciderData);
    } catch (error) {
      console.error('Failed to load cider:', error);
      Alert.alert('Error', 'Failed to load cider details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [ciderId, getCiderById, navigation]);

  const handleDelete = () => {
    if (!cider) return;

    Alert.alert(
      'Delete Cider',
      `Are you sure you want to delete "${cider.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCider(cider.id);
              Alert.alert('Success', 'Cider deleted successfully');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete cider');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaContainer>
        <View style={styles.loadingContainer}>
          <Text>Loading cider details...</Text>
        </View>
      </SafeAreaContainer>
    );
  }

  if (!cider) {
    return (
      <SafeAreaContainer>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Cider not found</Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaContainer>
    );
  }

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatValue = (value: string) => {
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase());
  };

  return (
    <SafeAreaContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.ciderName}>{cider.name}</Text>
          <Text style={styles.brandName}>{cider.brand}</Text>
        </View>

        {/* Photo */}
        {cider.photo && (
          <View style={styles.photoContainer}>
            <Image source={{ uri: cider.photo }} style={styles.photo} resizeMode="cover" />
          </View>
        )}

        {/* Basic Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.label}>ABV:</Text>
            <Text style={styles.value}>{cider.abv}%</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Overall Rating:</Text>
            <Text style={styles.ratingValue}>{cider.overallRating}/10</Text>
          </View>

          {cider.containerType && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Container:</Text>
              <Text style={styles.value}>{cider.containerType}</Text>
            </View>
          )}
        </View>

        {/* Style */}
        {cider.traditionalStyle && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Style</Text>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Traditional Style:</Text>
              <Text style={styles.value}>{formatValue(cider.traditionalStyle)}</Text>
            </View>
          </View>
        )}

        {/* Characteristics */}
        {(cider.sweetness || cider.carbonation || cider.clarity || cider.color) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Characteristics</Text>

            {cider.sweetness && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Sweetness:</Text>
                <Text style={styles.value}>{formatValue(cider.sweetness)}</Text>
              </View>
            )}

            {cider.carbonation && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Carbonation:</Text>
                <Text style={styles.value}>{formatValue(cider.carbonation)}</Text>
              </View>
            )}

            {cider.clarity && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Clarity:</Text>
                <Text style={styles.value}>{formatValue(cider.clarity)}</Text>
              </View>
            )}

            {cider.color && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Color:</Text>
                <Text style={styles.value}>{formatValue(cider.color)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Taste Tags */}
        {cider.tasteTags && cider.tasteTags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Taste Tags</Text>
            <View style={styles.tagsContainer}>
              {cider.tasteTags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Apple Classification */}
        {cider.appleClassification && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Apple Classification</Text>

            {cider.appleClassification.categories && cider.appleClassification.categories.length > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Categories:</Text>
                <Text style={styles.value}>{cider.appleClassification.categories.join(', ')}</Text>
              </View>
            )}

            {cider.appleClassification.varieties && cider.appleClassification.varieties.length > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Varieties:</Text>
                <Text style={styles.value}>{cider.appleClassification.varieties.join(', ')}</Text>
              </View>
            )}

            {cider.appleClassification.longAshtonClassification && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Long Ashton:</Text>
                <Text style={styles.value}>{cider.appleClassification.longAshtonClassification}</Text>
              </View>
            )}
          </View>
        )}

        {/* Production Methods */}
        {cider.productionMethods && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Production Methods</Text>

            {cider.productionMethods.fermentation && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Fermentation:</Text>
                <Text style={styles.value}>{formatValue(cider.productionMethods.fermentation)}</Text>
              </View>
            )}

            {cider.productionMethods.specialProcesses && cider.productionMethods.specialProcesses.length > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Special Processes:</Text>
                <Text style={styles.value}>{cider.productionMethods.specialProcesses.map(p => formatValue(p)).join(', ')}</Text>
              </View>
            )}
          </View>
        )}

        {/* Detailed Ratings */}
        {cider.detailedRatings && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detailed Ratings</Text>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Appearance:</Text>
              <Text style={styles.ratingValue}>{cider.detailedRatings.appearance}/10</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Aroma:</Text>
              <Text style={styles.ratingValue}>{cider.detailedRatings.aroma}/10</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Taste:</Text>
              <Text style={styles.ratingValue}>{cider.detailedRatings.taste}/10</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Mouthfeel:</Text>
              <Text style={styles.ratingValue}>{cider.detailedRatings.mouthfeel}/10</Text>
            </View>
          </View>
        )}

        {/* Notes */}
        {cider.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{cider.notes}</Text>
          </View>
        )}

        {/* Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Added:</Text>
            <Text style={styles.value}>{formatDate(cider.createdAt)}</Text>
          </View>

          {cider.venue && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Venue:</Text>
                <Text style={styles.value}>
                  {typeof cider.venue === 'string' ? cider.venue : cider.venue.name}
                </Text>
              </View>
              {typeof cider.venue === 'object' && cider.venue.type && (
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Venue Type:</Text>
                  <Text style={styles.value}>{cider.venue.type}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Button
            title="Delete Cider"
            onPress={handleDelete}
            variant="secondary"
            style={styles.deleteButton}
          />
        </View>
      </ScrollView>
    </SafeAreaContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 20,
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  ciderName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  brandName: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  photoContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    alignItems: 'center',
    paddingVertical: 16,
  },
  photo: {
    width: 200, // Portrait width for bottle photos
    height: 267, // Portrait height (3:4 aspect ratio, same as camera)
    borderRadius: 8,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '400',
  },
  ratingValue: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '500',
  },
  notesText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  actionsSection: {
    marginTop: 20,
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
});