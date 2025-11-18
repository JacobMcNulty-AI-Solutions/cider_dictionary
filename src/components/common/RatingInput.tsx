import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Rating } from '../../types/cider';

interface Props {
  rating: Rating;
  onRatingChange: (rating: Rating) => void;
  maxRating?: number;
  label?: string;
}

const RatingInput = memo<Props>(({ rating, onRatingChange, maxRating = 10, label }) => {
  // Memoize the stars array generation for better performance
  const stars = useMemo(() => {
    const starsArray = [];
    for (let i = 1; i <= maxRating; i++) {
      starsArray.push(i);
    }
    return starsArray;
  }, [maxRating]);

  // Memoize the star press handlers to prevent re-creation
  const createStarPressHandler = useCallback((starValue: number) => {
    return () => onRatingChange(starValue as Rating);
  }, [onRatingChange]);

  const renderStar = useCallback((starValue: number) => (
    <TouchableOpacity
      key={starValue}
      onPress={createStarPressHandler(starValue)}
      style={styles.star}
      hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
      accessibilityLabel={`Set rating to ${starValue} stars`}
      accessibilityRole="button"
    >
      <Ionicons
        name={starValue <= rating ? 'star' : 'star-outline'}
        size={24}
        color={starValue <= rating ? '#FFD700' : '#DDD'}
      />
    </TouchableOpacity>
  ), [rating, createStarPressHandler]);

  return (
    <View style={styles.container} testID="rating-input">
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.starsContainer} testID="rating-stars">
        {stars.map(renderStar)}
        <Text style={styles.ratingText}>{rating}/{maxRating}</Text>
      </View>
    </View>
  );
});

RatingInput.displayName = 'RatingInput';

export default RatingInput;

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  star: {
    marginRight: 4,
  },
  ratingText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});