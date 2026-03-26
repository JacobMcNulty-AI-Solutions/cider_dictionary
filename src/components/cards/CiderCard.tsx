import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BasicCiderRecord } from '../../types/cider';

interface Props {
  cider: BasicCiderRecord;
  onPress?: (cider: BasicCiderRecord) => void;
}

const CiderCard = memo<Props>(({ cider, onPress }) => {
  // Get the rating to display (use cached rating if available)
  const displayRating = cider._cachedRating !== null && cider._cachedRating !== undefined
    ? cider._cachedRating
    : null;

  const hasRating = displayRating !== null;

  // Memoize the formatted date
  const formattedDate = useMemo(() => {
    return cider.createdAt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [cider.createdAt]);

  // Get ABV color based on strength
  const getAbvColor = (abv: number) => {
    if (abv < 4) return '#28A745'; // Low - Green
    if (abv < 6) return '#FFC107'; // Medium - Yellow
    if (abv < 8) return '#FD7E14'; // High - Orange
    return '#DC3545'; // Very High - Red
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(cider)}
      activeOpacity={0.8}
      accessibilityLabel={`${cider.name} by ${cider.brand}`}
      accessibilityHint="Tap to view cider details"
    >
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.name} numberOfLines={2}>
            {cider.name}
          </Text>
          <Text style={styles.brand} numberOfLines={1}>
            {cider.brand}
          </Text>
        </View>
        {hasRating ? (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingBadgeText}>
              {displayRating!.toFixed(1)}
            </Text>
          </View>
        ) : (
          <View style={[styles.ratingBadge, styles.noRatingBadge]}>
            <Text style={[styles.ratingBadgeText, styles.noRatingBadgeText]}>
              -
            </Text>
          </View>
        )}
      </View>

      <View style={styles.details}>
        <View style={styles.metricRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>ABV</Text>
            <View style={styles.abvContainer}>
              <Text style={[styles.metricValue, { color: getAbvColor(cider.abv) }]}>
                {cider.abv}%
              </Text>
            </View>
          </View>

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Rating</Text>
            <View style={styles.ratingContainer}>
              {hasRating ? (
                <View style={styles.ratingDisplay}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.ratingText}>{displayRating!.toFixed(1)}/10</Text>
                </View>
              ) : (
                <Text style={styles.noRatingText}>Not rated</Text>
              )}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.date}>
          Added {formattedDate}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

CiderCard.displayName = 'CiderCard';

export default CiderCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 0.5,
    borderColor: '#F0F0F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleSection: {
    flex: 1,
    marginRight: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    lineHeight: 24,
  },
  brand: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  ratingBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 44,
    alignItems: 'center',
  },
  ratingBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  noRatingBadge: {
    backgroundColor: '#E1E1E1',
  },
  noRatingBadgeText: {
    color: '#999',
  },
  details: {
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  abvContainer: {
    alignItems: 'center',
  },
  ratingContainer: {
    alignItems: 'center',
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  noRatingText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#999',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    paddingTop: 12,
  },
  date: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontWeight: '500',
  },
});