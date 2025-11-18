/**
 * Statistical Utility Functions
 *
 * Comprehensive collection of mathematical and statistical functions
 * for analytics calculations, data analysis, and metrics computation.
 */

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate that array contains only valid numeric values
 * Filters out NaN and Infinity values
 *
 * @param values - Array to validate
 * @returns Filtered array with only valid numbers
 */
function filterValidNumbers(values: number[]): number[] {
  return values.filter(v => typeof v === 'number' && isFinite(v) && !isNaN(v));
}

// ============================================================================
// BASIC STATISTICS
// ============================================================================

/**
 * Calculate the sum of all values in an array.
 *
 * @param values - Array of numeric values
 * @returns The sum of all values, or 0 if array is empty
 *
 * @example
 * sum([1, 2, 3, 4, 5]) // returns 15
 * sum([]) // returns 0
 * sum([-5, 5]) // returns 0
 */
export function sum(values: number[]): number {
  const validValues = filterValidNumbers(values);
  if (validValues.length === 0) return 0;
  return validValues.reduce((acc, val) => acc + val, 0);
}

/**
 * Calculate the arithmetic mean (average) of an array of numbers.
 *
 * @param values - Array of numeric values
 * @returns The mean value, or 0 if array is empty
 *
 * @example
 * mean([1, 2, 3, 4, 5]) // returns 3
 * mean([10, 20, 30]) // returns 20
 * mean([]) // returns 0
 */
export function mean(values: number[]): number {
  const validValues = filterValidNumbers(values);
  if (validValues.length === 0) return 0;
  return sum(validValues) / validValues.length;
}

/**
 * Calculate the median (middle value) of an array of numbers.
 * For even-length arrays, returns the average of the two middle values.
 *
 * @param values - Array of numeric values
 * @returns The median value, or 0 if array is empty
 *
 * @example
 * median([1, 2, 3, 4, 5]) // returns 3
 * median([1, 2, 3, 4]) // returns 2.5
 * median([5, 1, 3, 2, 4]) // returns 3 (sorts first)
 */
export function median(values: number[]): number {
  const validValues = filterValidNumbers(values);
  if (validValues.length === 0) return 0;

  const sorted = sortAscending(validValues);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    // Even length: average of two middle values
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    // Odd length: middle value
    return sorted[mid];
  }
}

/**
 * Calculate the mode (most frequently occurring value) of an array.
 * If multiple values have the same highest frequency, returns the first one encountered.
 *
 * @param values - Array of numeric values
 * @returns The mode value, or undefined if array is empty
 *
 * @example
 * mode([1, 2, 2, 3, 3, 3, 4]) // returns 3
 * mode([1, 1, 2, 2]) // returns 1 (first encountered)
 * mode([]) // returns undefined
 */
export function mode(values: number[]): number | undefined {
  if (values.length === 0) return undefined;

  const frequencyMap = new Map<number, number>();
  let maxFrequency = 0;
  let modeValue: number | undefined = undefined;

  for (const value of values) {
    const frequency = (frequencyMap.get(value) || 0) + 1;
    frequencyMap.set(value, frequency);

    if (frequency > maxFrequency) {
      maxFrequency = frequency;
      modeValue = value;
    }
  }

  return modeValue;
}

/**
 * Find the minimum value in an array.
 *
 * @param values - Array of numeric values
 * @returns The minimum value, or Infinity if array is empty
 *
 * @example
 * min([5, 2, 8, 1, 9]) // returns 1
 * min([-5, 0, 5]) // returns -5
 */
export function min(values: number[]): number {
  const validValues = filterValidNumbers(values);
  if (validValues.length === 0) return Infinity;

  let minimum = validValues[0];
  for (let i = 1; i < validValues.length; i++) {
    if (validValues[i] < minimum) {
      minimum = validValues[i];
    }
  }
  return minimum;
}

/**
 * Find the maximum value in an array.
 *
 * @param values - Array of numeric values
 * @returns The maximum value, or -Infinity if array is empty
 *
 * @example
 * max([5, 2, 8, 1, 9]) // returns 9
 * max([-5, 0, 5]) // returns 5
 */
export function max(values: number[]): number {
  const validValues = filterValidNumbers(values);
  if (validValues.length === 0) return -Infinity;

  let maximum = validValues[0];
  for (let i = 1; i < validValues.length; i++) {
    if (validValues[i] > maximum) {
      maximum = validValues[i];
    }
  }
  return maximum;
}

// ============================================================================
// VARIABILITY MEASURES
// ============================================================================

/**
 * Calculate the variance of an array of numbers.
 * Uses the sample variance formula (n-1 denominator).
 *
 * @param values - Array of numeric values
 * @returns The variance, or 0 if array has fewer than 2 values
 *
 * @example
 * variance([2, 4, 4, 4, 5, 5, 7, 9]) // returns 4.571428571428571
 * variance([1, 1, 1]) // returns 0
 */
export function variance(values: number[]): number {
  const validValues = filterValidNumbers(values);
  if (validValues.length < 2) return 0;

  const avg = mean(validValues);
  const squaredDifferences = validValues.map(value => Math.pow(value - avg, 2));

  // Sample variance: divide by (n-1)
  return sum(squaredDifferences) / (validValues.length - 1);
}

/**
 * Calculate the standard deviation of an array of numbers.
 * Uses the sample standard deviation formula (square root of sample variance).
 *
 * @param values - Array of numeric values
 * @returns The standard deviation, or 0 if array has fewer than 2 values
 *
 * @example
 * standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]) // returns 2.138089935299395
 * standardDeviation([1, 1, 1]) // returns 0
 */
export function standardDeviation(values: number[]): number {
  return Math.sqrt(variance(values));
}

/**
 * Calculate the coefficient of variation (CV).
 * CV = (standard deviation / mean) * 100
 * Useful for comparing variability between datasets with different units or means.
 *
 * @param values - Array of numeric values
 * @returns The coefficient of variation as a percentage, or 0 if mean is 0 or array is too small
 *
 * @example
 * coefficientOfVariation([2, 4, 6, 8, 10]) // returns ~42.43
 * coefficientOfVariation([100, 100, 100]) // returns 0
 */
export function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;

  const avg = mean(values);
  if (avg === 0) return 0;

  const stdDev = standardDeviation(values);
  return (stdDev / Math.abs(avg)) * 100;
}

// ============================================================================
// DISTRIBUTION ANALYSIS
// ============================================================================

/**
 * Calculate the quartiles (Q1, Q2, Q3) of an array of numbers.
 * Q1 = 25th percentile, Q2 = median (50th percentile), Q3 = 75th percentile
 *
 * @param values - Array of numeric values
 * @returns Object containing q1, q2 (median), and q3
 *
 * @example
 * quartiles([1, 2, 3, 4, 5, 6, 7, 8, 9])
 * // returns { q1: 2.5, q2: 5, q3: 7.5 }
 */
export function quartiles(values: number[]): { q1: number; q2: number; q3: number } {
  if (values.length === 0) {
    return { q1: 0, q2: 0, q3: 0 };
  }

  return {
    q1: percentile(values, 25),
    q2: percentile(values, 50), // Same as median
    q3: percentile(values, 75),
  };
}

/**
 * Calculate the interquartile range (IQR).
 * IQR = Q3 - Q1, representing the range of the middle 50% of the data.
 *
 * @param values - Array of numeric values
 * @returns The IQR value, or 0 if array is empty
 *
 * @example
 * interquartileRange([1, 2, 3, 4, 5, 6, 7, 8, 9]) // returns 5
 */
export function interquartileRange(values: number[]): number {
  if (values.length === 0) return 0;

  const { q1, q3 } = quartiles(values);
  return q3 - q1;
}

/**
 * Calculate the Pth percentile of an array of numbers.
 * Uses linear interpolation between closest ranks.
 * Values outside the range [0, 100] are clamped to the valid range.
 *
 * @param values - Array of numeric values
 * @param p - Percentile to calculate (0-100). Values outside this range are clamped.
 * @returns The value at the Pth percentile, or 0 if array is empty
 *
 * @example
 * percentile([1, 2, 3, 4, 5], 50) // returns 3 (median)
 * percentile([1, 2, 3, 4, 5], 25) // returns 2
 * percentile([1, 2, 3, 4, 5], 75) // returns 4
 * percentile([1, 2, 3, 4, 5], -10) // returns 1 (clamped to 0)
 * percentile([1, 2, 3, 4, 5], 150) // returns 5 (clamped to 100)
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;

  // Clamp percentile to valid range [0, 100]
  if (p < 0 || p > 100) {
    console.warn(`Percentile ${p} out of range [0, 100], clamping to valid range`);
    p = Math.max(0, Math.min(100, p));
  }

  const sorted = sortAscending(values);

  if (p === 0) return sorted[0];
  if (p === 100) return sorted[sorted.length - 1];

  // Calculate position using linear interpolation
  const position = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;

  if (lower === upper) {
    return sorted[lower];
  }

  // Linear interpolation between lower and upper values
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

// ============================================================================
// OUTLIER DETECTION
// ============================================================================

/**
 * Detect outliers in an array using the IQR method.
 * Values beyond Q1 - threshold*IQR or Q3 + threshold*IQR are considered outliers.
 *
 * @param values - Array of numeric values
 * @param threshold - Multiplier for IQR (default: 1.5 for standard outliers, 3.0 for extreme outliers)
 * @returns Array of outlier values
 *
 * @example
 * detectOutliers([1, 2, 3, 4, 5, 100]) // returns [100]
 * detectOutliers([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 1.5) // returns []
 */
export function detectOutliers(values: number[], threshold: number = 1.5): number[] {
  if (values.length < 4) return []; // Need at least 4 values for meaningful outlier detection

  const { q1, q3 } = quartiles(values);
  const iqr = q3 - q1;

  const lowerBound = q1 - threshold * iqr;
  const upperBound = q3 + threshold * iqr;

  return values.filter(value => value < lowerBound || value > upperBound);
}

/**
 * Calculate the z-score for a specific value within a dataset.
 * Z-score = (value - mean) / standard deviation
 * Indicates how many standard deviations a value is from the mean.
 *
 * @param value - The value to calculate z-score for
 * @param values - Array of numeric values for context
 * @returns The z-score, or 0 if standard deviation is 0
 *
 * @example
 * zScore(10, [2, 4, 6, 8, 10]) // returns ~1.26
 * zScore(5, [5, 5, 5, 5]) // returns 0 (all values are mean)
 */
export function zScore(value: number, values: number[]): number {
  if (values.length < 2) return 0;

  const avg = mean(values);
  const stdDev = standardDeviation(values);

  if (stdDev === 0) return 0;

  return (value - avg) / stdDev;
}

// ============================================================================
// REGRESSION ANALYSIS
// ============================================================================

/**
 * Calculate linear regression for a set of data points.
 * Returns slope (m), intercept (b), and R² (coefficient of determination).
 * Formula: y = mx + b
 *
 * @param dataPoints - Array of {x, y} coordinate pairs
 * @returns Object with slope, intercept, and r2 values
 *
 * @example
 * linearRegression([
 *   {x: 1, y: 2}, {x: 2, y: 4}, {x: 3, y: 6}
 * ]) // returns { slope: 2, intercept: 0, r2: 1 } (perfect fit)
 */
export function linearRegression(
  dataPoints: { x: number; y: number }[]
): { slope: number; intercept: number; r2: number } {
  const validPoints = dataPoints.filter(p =>
    isFinite(p.x) && !isNaN(p.x) && isFinite(p.y) && !isNaN(p.y)
  );
  if (validPoints.length < 2) {
    return { slope: 0, intercept: 0, r2: 0 };
  }

  const n = validPoints.length;
  const xValues = validPoints.map(p => p.x);
  const yValues = validPoints.map(p => p.y);

  const xMean = mean(xValues);
  const yMean = mean(yValues);

  // Calculate slope: m = Σ[(x - x̄)(y - ȳ)] / Σ[(x - x̄)²]
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = xValues[i] - xMean;
    const yDiff = yValues[i] - yMean;
    numerator += xDiff * yDiff;
    denominator += xDiff * xDiff;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  // Calculate R² (coefficient of determination)
  let ssRes = 0; // Sum of squares of residuals
  let ssTot = 0; // Total sum of squares

  for (let i = 0; i < n; i++) {
    const predicted = slope * xValues[i] + intercept;
    ssRes += Math.pow(yValues[i] - predicted, 2);
    ssTot += Math.pow(yValues[i] - yMean, 2);
  }

  const r2 = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);

  return {
    slope: round(slope, 6),
    intercept: round(intercept, 6),
    r2: round(Math.max(0, Math.min(1, r2)), 6), // Clamp between 0 and 1
  };
}

/**
 * Predict a y value using a linear regression model.
 *
 * @param x - The x value to predict for
 * @param regression - Regression model with slope and intercept
 * @returns The predicted y value
 *
 * @example
 * const model = { slope: 2, intercept: 1 };
 * predict(5, model) // returns 11 (y = 2*5 + 1)
 */
export function predict(
  x: number,
  regression: { slope: number; intercept: number }
): number {
  return regression.slope * x + regression.intercept;
}

// ============================================================================
// INFORMATION THEORY
// ============================================================================

/**
 * Calculate Shannon entropy for a dataset.
 * Measures the diversity or unpredictability of the data.
 * Higher entropy = more diverse/unpredictable.
 *
 * @param values - Array of values (can be any type)
 * @returns Shannon entropy value (0 = no diversity, higher = more diverse)
 *
 * @example
 * shannonEntropy([1, 1, 1, 1]) // returns 0 (no diversity)
 * shannonEntropy([1, 2, 3, 4]) // returns 2 (maximum diversity for 4 items)
 * shannonEntropy(['a', 'a', 'b', 'b']) // returns 1
 */
export function shannonEntropy(values: any[]): number {
  if (values.length === 0) return 0;

  // Count frequencies
  const frequencyMap = new Map<any, number>();
  for (const value of values) {
    frequencyMap.set(value, (frequencyMap.get(value) || 0) + 1);
  }

  // Calculate entropy: H = -Σ(p * log2(p))
  let entropy = 0;
  const total = values.length;

  for (const count of frequencyMap.values()) {
    const probability = count / total;
    entropy -= probability * Math.log2(probability);
  }

  return round(entropy, 6);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sort an array of numbers in ascending order (non-mutating).
 *
 * @param values - Array of numeric values
 * @returns New sorted array
 *
 * @example
 * sortAscending([3, 1, 4, 1, 5, 9]) // returns [1, 1, 3, 4, 5, 9]
 */
export function sortAscending(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

/**
 * Round a number to a specified number of decimal places.
 *
 * @param value - The number to round
 * @param decimals - Number of decimal places (default: 2)
 * @returns Rounded number
 *
 * @example
 * round(3.14159, 2) // returns 3.14
 * round(3.14159, 4) // returns 3.1416
 * round(3.14159) // returns 3.14 (default)
 */
export function round(value: number, decimals: number = 2): number {
  if (!isFinite(value)) return value;
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}
