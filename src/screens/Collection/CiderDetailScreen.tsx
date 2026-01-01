// Cider Detail Screen - Shows detailed view of a single cider
// Displays all cider information with edit/delete options

import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { CiderMasterRecord } from '../../types/cider';
import { ExperienceLog } from '../../types/experience';
import { useCiderStore } from '../../store/ciderStore';
import { RootStackParamList } from '../../types/navigation';
import SafeAreaContainer from '../../components/common/SafeAreaContainer';
import Button from '../../components/common/Button';
import { sqliteService } from '../../services/database/sqlite';
import { Ionicons } from '@expo/vector-icons';

type Props = StackScreenProps<RootStackParamList, 'CiderDetail'>;

export default function CiderDetailScreen({ route, navigation }: Props) {
  const { ciderId } = route.params;
  const { getCiderById, deleteCider } = useCiderStore();
  const [cider, setCider] = useState<CiderMasterRecord | null>(null);
  const [experiences, setExperiences] = useState<ExperienceLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Set up header with edit button
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('CiderEdit', { ciderId })}
          style={styles.headerButton}
        >
          <Ionicons name="pencil" size={24} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, ciderId]);

  // Load cider data and experiences
  const loadCiderAndExperiences = useCallback(async () => {
    try {
      const ciderData = getCiderById(ciderId);
      setCider(ciderData);

      // Load experiences for this cider
      const ciderExperiences = await sqliteService.getExperiencesByCiderId(ciderId);
      setExperiences(ciderExperiences);
    } catch (error) {
      console.error('Failed to load cider:', error);
      Alert.alert('Error', 'Failed to load cider details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [ciderId, getCiderById, navigation]);

  // Initial load
  useEffect(() => {
    loadCiderAndExperiences();
  }, [loadCiderAndExperiences]);

  // Refresh cider data when screen comes into focus (after edit)
  useFocusEffect(
    useCallback(() => {
      const ciderData = getCiderById(ciderId);
      if (ciderData) {
        setCider(ciderData);
      }
    }, [ciderId, getCiderById])
  );

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

  const getContainerTypeLabel = (type: string, customType?: string): string => {
    const containerTypeLabels: Record<string, string> = {
      'bottle': 'Bottle',
      'can': 'Can',
      'draught': 'Draught',
      'keg': 'Keg',
      'bag_in_box': 'Bag in Box',
      'other': 'Other'
    };

    // If type is 'other' and customType is provided, return the custom type
    if (type === 'other' && customType) {
      return customType;
    }

    return containerTypeLabels[type] || type;
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

        {/* Recent Experiences */}
        <View style={styles.section}>
          <View style={styles.experiencesSectionHeader}>
            <Text style={styles.sectionTitle}>Recent Experiences</Text>
            {experiences.length > 3 && (
              <TouchableOpacity onPress={() => navigation.navigate('ExperienceHistory', { ciderId })}>
                <Text style={styles.viewAllText}>View All ({experiences.length})</Text>
              </TouchableOpacity>
            )}
          </View>

          {experiences.length === 0 ? (
            <View style={styles.noExperiencesContainer}>
              <Ionicons name="wine-outline" size={48} color="#ccc" />
              <Text style={styles.noExperiencesText}>No experiences logged yet</Text>
              <Text style={styles.noExperiencesSubtext}>Start by logging your first experience!</Text>
            </View>
          ) : (
            <View style={styles.experiencesContainer}>
              {experiences.slice(0, 3).map((experience) => (
                <TouchableOpacity
                  key={experience.id}
                  style={styles.experienceCard}
                  onPress={() => navigation.navigate('ExperienceDetail', { experienceId: experience.id })}
                >
                  <View style={styles.experienceHeader}>
                    <View style={styles.experienceDate}>
                      <Text style={styles.experienceDateText}>
                        {experience.date.toLocaleDateString()}
                      </Text>
                      <Text style={styles.experienceTimeText}>
                        {experience.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    {experience.rating && (
                      <View style={styles.experienceRating}>
                        <Ionicons name="star" size={14} color="#FFD700" />
                        <Text style={styles.experienceRatingText}>{experience.rating}/10</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.experienceVenue}>
                    <Ionicons name="location-outline" size={16} color="#666" />
                    <Text style={styles.experienceVenueText}>{experience.venue.name}</Text>
                  </View>

                  <View style={styles.experiencePrice}>
                    <Text style={styles.experiencePriceText}>
                      £{experience.price.toFixed(2)} ({experience.containerSize}ml {getContainerTypeLabel(experience.containerType || 'bottle', experience.containerTypeCustom)}) • £{experience.pricePerPint.toFixed(2)}/pint
                    </Text>
                  </View>

                  <View style={styles.experienceActions}>
                    <Ionicons name="chevron-forward" size={16} color="#007AFF" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Button
            title="Log Experience"
            onPress={() => navigation.navigate('ExperienceLog', { ciderId })}
            variant="primary"
            style={styles.experienceButton}
          />

          <Button
            title="View Experience History"
            onPress={() => navigation.navigate('ExperienceHistory', { ciderId })}
            variant="secondary"
            style={styles.historyButton}
          />

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
  headerButton: {
    marginRight: 16,
    padding: 4,
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
    gap: 12,
  },
  experienceButton: {
    backgroundColor: '#32D74B',
  },
  historyButton: {
    backgroundColor: '#FF9500',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  experiencesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  noExperiencesContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noExperiencesText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#999',
    marginTop: 12,
    marginBottom: 4,
  },
  noExperiencesSubtext: {
    fontSize: 14,
    color: '#ccc',
  },
  experiencesContainer: {
    gap: 12,
  },
  experienceCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  experienceDate: {
    flex: 1,
  },
  experienceDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  experienceTimeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  experienceRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  experienceRatingText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#F57C00',
    marginLeft: 2,
  },
  experienceVenue: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  experienceVenueText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  experiencePrice: {
    marginBottom: 8,
  },
  experiencePriceText: {
    fontSize: 12,
    color: '#888',
  },
  experienceActions: {
    alignItems: 'flex-end',
  },
});