import { Rating } from '../types/cider';
import { ExperienceLog } from '../types/experience';

/**
 * Calculate average rating from experiences
 * Returns null if no experiences have ratings
 */
export function calculateAverageRating(experiences: ExperienceLog[]): Rating | null {
  // Filter to only experiences with ratings
  const rated = experiences.filter(exp => exp.rating !== undefined && exp.rating !== null);

  if (rated.length === 0) {
    return null;
  }

  const sum = rated.reduce((acc, exp) => acc + exp.rating!, 0);
  const avg = sum / rated.length;
  const rounded = Math.round(avg * 10) / 10; // Round to 1 decimal place

  // Clamp to valid Rating range (1-10)
  return Math.max(1, Math.min(10, rounded)) as Rating;
}

/**
 * Calculate average detailed ratings from experiences
 * Only returns ratings for categories that have data
 */
export function calculateDetailedRatings(experiences: ExperienceLog[]): {
  appearance?: Rating;
  aroma?: Rating;
  taste?: Rating;
  mouthfeel?: Rating;
} {
  const validExperiences = experiences.filter(exp => exp.detailedRatings);

  if (validExperiences.length === 0) {
    return {};
  }

  const sums = {
    appearance: 0,
    aroma: 0,
    taste: 0,
    mouthfeel: 0
  };

  const counts = {
    appearance: 0,
    aroma: 0,
    taste: 0,
    mouthfeel: 0
  };

  validExperiences.forEach(exp => {
    if (exp.detailedRatings) {
      Object.keys(sums).forEach(key => {
        const typedKey = key as keyof typeof sums;
        const value = exp.detailedRatings![typedKey];
        if (value !== undefined && value !== null) {
          sums[typedKey] += value;
          counts[typedKey]++;
        }
      });
    }
  });

  const result: Record<string, Rating> = {};
  Object.keys(sums).forEach(key => {
    const typedKey = key as keyof typeof counts;
    const count = counts[typedKey];
    if (count > 0) {
      const avg = sums[typedKey] / count;
      const rounded = Math.round(avg * 10) / 10; // Round to 1 decimal place
      result[key] = Math.max(1, Math.min(10, rounded)) as Rating;
    }
  });

  return result;
}

/**
 * Get weighted average (more recent experiences weighted higher)
 * More recent experiences have higher weight, older experiences decay
 * Returns null if no experiences have ratings
 */
export function calculateWeightedRating(experiences: ExperienceLog[]): Rating | null {
  // Filter to only experiences with ratings
  const rated = experiences.filter(exp => exp.rating !== undefined && exp.rating !== null);

  if (rated.length === 0) {
    return null;
  }

  // Sort by date (most recent first)
  const sorted = [...rated].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Apply exponential decay: recent experiences weight = 1.0, older decay to 0.5
  let weightedSum = 0;
  let totalWeight = 0;

  sorted.forEach((exp, index) => {
    const weight = Math.max(0.5, 1.0 - (index * 0.1)); // Decay by 10% per experience
    weightedSum += exp.rating! * weight;
    totalWeight += weight;
  });

  const avg = weightedSum / totalWeight;
  const rounded = Math.round(avg * 10) / 10; // Round to 1 decimal place
  return Math.max(1, Math.min(10, rounded)) as Rating;
}

/**
 * Get rating with source information for display purposes
 */
export function getCiderRatingWithSource(
  experiences: ExperienceLog[],
  fallbackRating?: Rating | null
): {
  rating: Rating | null;
  source: 'calculated' | 'legacy' | 'none';
  experienceCount: number;
} {
  const calculatedRating = calculateAverageRating(experiences);

  if (calculatedRating !== null) {
    return {
      rating: calculatedRating,
      source: 'calculated',
      experienceCount: experiences.filter(e => e.rating).length
    };
  }

  if (fallbackRating) {
    return {
      rating: fallbackRating,
      source: 'legacy',
      experienceCount: 0
    };
  }

  return {
    rating: null,
    source: 'none',
    experienceCount: 0
  };
}
