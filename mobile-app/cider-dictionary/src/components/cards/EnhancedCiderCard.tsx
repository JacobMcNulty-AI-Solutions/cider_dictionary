// Enhanced Cider Card Component
// Supports Phase 2 features with comprehensive cider data display

import React, { memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image
} from 'react-native';
import { CiderMasterRecord, TraditionalStyle } from '../../types/cider';

interface Props {
  cider: CiderMasterRecord;
  onPress?: (cider: CiderMasterRecord) => void;
  onLongPress?: (cider: CiderMasterRecord) => void;
  selected?: boolean;
  selectionMode?: boolean;
  viewMode?: 'list' | 'grid';
  showFullDetails?: boolean;
  testID?: string;
}

const EnhancedCiderCard = memo<Props>(({
  cider,
  onPress,
  onLongPress,
  selected = false,
  selectionMode = false,
  viewMode = 'list',
  showFullDetails = false,
  testID
}) => {
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = viewMode === 'grid' ? (screenWidth - 32) / 2 - 8 : screenWidth - 32;

  // Memoized values
  const formattedDate = useMemo(() => {
    return cider.createdAt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: viewMode === 'grid' ? undefined : 'numeric',
    });
  }, [cider.createdAt, viewMode]);

  const ratingStars = useMemo(() => {
    const stars = [];
    const fullStars = Math.floor(cider.overallRating / 2);
    const hasHalfStar = (cider.overallRating % 2) >= 1;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push('★');
      } else if (i === fullStars && hasHalfStar) {
        stars.push('☆');
      } else {
        stars.push('☆');
      }
    }

    return stars.join('');
  }, [cider.overallRating]);

  const abvColor = useMemo(() => {
    if (cider.abv < 4) return '#28A745';
    if (cider.abv < 6) return '#FFC107';
    if (cider.abv < 8) return '#FD7E14';
    return '#DC3545';
  }, [cider.abv]);

  const styleColor = useMemo(() => {
    const styleColors: Record<TraditionalStyle, string> = {
      traditional_english: '#8B4513',
      modern_craft: '#FF6B35',
      heritage: '#6B8E23',
      international: '#4682B4',
      fruit_cider: '#FF69B4',
      perry: '#DDA0DD',
      ice_cider: '#87CEEB',
      other: '#708090'
    };
    return cider.traditionalStyle ? styleColors[cider.traditionalStyle] : '#666';
  }, [cider.traditionalStyle]);

  const handlePress = () => {
    onPress?.(cider);
  };

  const handleLongPress = () => {
    onLongPress?.(cider);
  };

  const renderTasteTags = () => {
    if (!cider.tasteTags || cider.tasteTags.length === 0) return null;

    const displayTags = viewMode === 'grid'
      ? cider.tasteTags.slice(0, 2)
      : cider.tasteTags.slice(0, 4);

    return (
      <View style={styles.tagsContainer}>
        {displayTags.map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
        {cider.tasteTags.length > displayTags.length && (
          <View style={styles.tagMore}>
            <Text style={styles.tagMoreText}>
              +{cider.tasteTags.length - displayTags.length}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderCharacteristics = () => {
    if (!showFullDetails || (!cider.sweetness && !cider.carbonation && !cider.clarity)) return null;

    const { sweetness, carbonation, clarity } = cider;

    return (
      <View style={styles.characteristicsContainer}>
        {sweetness && (
          <View style={styles.characteristic}>
            <Text style={styles.characteristicLabel}>Sweetness:</Text>
            <Text style={styles.characteristicValue}>
              {sweetness.replace('_', ' ').toLowerCase()}
            </Text>
          </View>
        )}
        {carbonation && (
          <View style={styles.characteristic}>
            <Text style={styles.characteristicLabel}>Carbonation:</Text>
            <Text style={styles.characteristicValue}>
              {carbonation.replace('_', ' ').toLowerCase()}
            </Text>
          </View>
        )}
        {clarity && (
          <View style={styles.characteristic}>
            <Text style={styles.characteristicLabel}>Clarity:</Text>
            <Text style={styles.characteristicValue}>
              {clarity.replace('_', ' ').toLowerCase()}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderVenue = () => {
    if (!cider.venue || viewMode === 'grid') return null;

    return (
      <View style={styles.venueContainer}>
        <Text style={styles.venueIcon}>📍</Text>
        <Text style={styles.venueText} numberOfLines={1}>
          {cider.venue.name}
        </Text>
      </View>
    );
  };

  const renderPhoto = () => {
    if (!cider.photo) return null;

    return (
      <View style={styles.photoContainer}>
        <Image
          source={{ uri: cider.photo }}
          style={[
            styles.photo,
            viewMode === 'grid' && styles.photoGrid
          ]}
          resizeMode="cover"
        />
      </View>
    );
  };

  const renderSelectionIndicator = () => {
    if (!selectionMode) return null;

    return (
      <View style={styles.selectionIndicator}>
        <View style={[
          styles.selectionCircle,
          selected && styles.selectionCircleSelected
        ]}>
          {selected && <Text style={styles.selectionCheck}>✓</Text>}
        </View>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        viewMode === 'grid' && styles.cardGrid,
        selected && styles.cardSelected,
        { width: cardWidth }
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      testID={testID || `cider-card-${cider.id}`}
    >
      {renderSelectionIndicator()}

      <View style={styles.cardContent}>
        <View style={styles.mainContent}>
          {renderPhoto()}

          <View style={styles.detailsContent}>
            <View style={styles.headerSection}>
          <View style={styles.titleContainer}>
            <Text
              style={[styles.title, viewMode === 'grid' && styles.titleGrid]}
              numberOfLines={viewMode === 'grid' ? 2 : 1}
            >
              {cider.name}
            </Text>
            <Text
              style={[styles.brand, viewMode === 'grid' && styles.brandGrid]}
              numberOfLines={1}
            >
              {cider.brand}
            </Text>
          </View>

          <View style={styles.ratingSection}>
            <Text style={styles.ratingStars}>{ratingStars}</Text>
            <Text style={styles.ratingText}>
              {cider.overallRating}/10
            </Text>
          </View>
        </View>

        <View style={styles.detailsSection}>
          <View style={styles.detailsRow}>
            <View style={styles.abvContainer}>
              <Text style={[styles.abvText, { color: abvColor }]}>
                {cider.abv.toFixed(1)}% ABV
              </Text>
            </View>

            {cider.containerType && (
              <View style={styles.containerBadge}>
                <Text style={styles.containerText}>
                  {cider.containerType === 'bag_in_box' ? 'Box' :
                   cider.containerType.charAt(0).toUpperCase() + cider.containerType.slice(1)}
                </Text>
              </View>
            )}

            {cider.traditionalStyle && (
              <View style={[styles.styleBadge, { backgroundColor: styleColor + '20' }]}>
                <Text style={[styles.styleText, { color: styleColor }]}>
                  {cider.traditionalStyle.replace('_', ' ').toLowerCase()}
                </Text>
              </View>
            )}
          </View>

          {renderTasteTags()}
          {renderVenue()}
          {renderCharacteristics()}
        </View>

            <View style={styles.footerSection}>
              <Text style={styles.dateText}>
                Added {formattedDate}
              </Text>

              {cider.notes && (
                <Text style={styles.notesIndicator}>📝</Text>
              )}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
  },
  cardGrid: {
    marginHorizontal: 4,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: '#2196F3',
    backgroundColor: '#e3f2fd',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  selectionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#666',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionCircleSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  selectionCheck: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardContent: {
    padding: 12,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailsContent: {
    flex: 1,
    marginLeft: 12,
  },
  photoContainer: {
    alignItems: 'center',
  },
  photo: {
    width: 90, // Portrait width for bottle photos
    height: 120, // Portrait height (4:3 aspect ratio)
    borderRadius: 8,
  },
  photoGrid: {
    width: 60,
    height: 80, // Smaller portrait for grid view
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  titleGrid: {
    fontSize: 14,
  },
  brand: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  brandGrid: {
    fontSize: 12,
  },
  ratingSection: {
    alignItems: 'flex-end',
  },
  ratingStars: {
    fontSize: 14,
    color: '#FFD700',
    marginBottom: 2,
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  detailsSection: {
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 6,
  },
  abvContainer: {
    marginRight: 8,
  },
  abvText: {
    fontSize: 13,
    fontWeight: '600',
  },
  containerBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
  },
  containerText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  styleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
  },
  styleText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tag: {
    backgroundColor: '#e8f4f8',
    borderColor: '#b3d9e6',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
    marginBottom: 2,
  },
  tagText: {
    fontSize: 10,
    color: '#2c7a8c',
    fontWeight: '500',
  },
  tagMore: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
    marginBottom: 2,
  },
  tagMoreText: {
    fontSize: 10,
    color: '#999',
    fontWeight: '500',
  },
  venueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  venueIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  venueText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  characteristicsContainer: {
    marginTop: 6,
  },
  characteristic: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  characteristicLabel: {
    fontSize: 11,
    color: '#999',
    minWidth: 70,
  },
  characteristicValue: {
    fontSize: 11,
    color: '#666',
    textTransform: 'capitalize',
  },
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  dateText: {
    fontSize: 11,
    color: '#999',
  },
  notesIndicator: {
    fontSize: 12,
  },
});

export default EnhancedCiderCard;