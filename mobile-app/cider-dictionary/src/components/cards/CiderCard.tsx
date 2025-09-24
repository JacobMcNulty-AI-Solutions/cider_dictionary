import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BasicCiderRecord } from '../../types/cider';

interface Props {
  cider: BasicCiderRecord;
  onPress?: (cider: BasicCiderRecord) => void;
}

const CiderCard = memo<Props>(({ cider, onPress }) => {
  // Memoize the stars rendering for better performance
  const stars = useMemo(() => {
    const starsArray = [];
    const maxRating = 10;

    for (let i = 0; i < Math.min(5, maxRating); i++) {
      const starRating = (i + 1) * (maxRating / 5);
      starsArray.push(
        <Ionicons
          key={i}
          name={cider.overallRating >= starRating ? 'star' : 'star-outline'}
          size={18}
          color={cider.overallRating >= starRating ? '#FFD700' : '#E1E1E1'}
        />
      );
    }
    return starsArray;
  }, [cider.overallRating]);

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
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingBadgeText}>
            {cider.overallRating}
          </Text>
        </View>
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
              <View style={styles.stars}>
                {stars}
              </View>
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
  stars: {
    flexDirection: 'row',
    gap: 2,
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