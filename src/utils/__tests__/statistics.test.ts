/**
 * Unit Tests for Statistical Utility Functions
 *
 * Comprehensive test suite covering all 19 statistical functions
 * with happy path, edge cases, error handling, and mathematical accuracy tests.
 */

import {
  sum,
  mean,
  median,
  mode,
  min,
  max,
  variance,
  standardDeviation,
  coefficientOfVariation,
  quartiles,
  interquartileRange,
  percentile,
  detectOutliers,
  zScore,
  linearRegression,
  predict,
  shannonEntropy,
  sortAscending,
  round,
} from '../statistics';

// ============================================================================
// BASIC STATISTICS
// ============================================================================

describe('sum', () => {
  describe('happy path', () => {
    it('should sum an array of positive numbers', () => {
      expect(sum([1, 2, 3, 4, 5])).toBe(15);
    });

    it('should sum an array of negative numbers', () => {
      expect(sum([-1, -2, -3])).toBe(-6);
    });

    it('should sum an array with mixed positive and negative numbers', () => {
      expect(sum([-5, 5, -10, 10])).toBe(0);
    });

    it('should sum decimal numbers', () => {
      expect(sum([1.5, 2.5, 3.0])).toBe(7);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for empty array', () => {
      expect(sum([])).toBe(0);
    });

    it('should handle single value', () => {
      expect(sum([42])).toBe(42);
    });

    it('should handle two values', () => {
      expect(sum([10, 20])).toBe(30);
    });

    it('should handle all zeros', () => {
      expect(sum([0, 0, 0, 0])).toBe(0);
    });

    it('should handle all same values', () => {
      expect(sum([5, 5, 5, 5])).toBe(20);
    });
  });
});

describe('mean', () => {
  describe('happy path', () => {
    it('should calculate mean of consecutive integers', () => {
      expect(mean([1, 2, 3, 4, 5])).toBe(3);
    });

    it('should calculate mean of larger numbers', () => {
      expect(mean([10, 20, 30])).toBe(20);
    });

    it('should calculate mean with decimals', () => {
      expect(mean([1.5, 2.5, 3.5])).toBe(2.5);
    });

    it('should calculate mean of negative numbers', () => {
      expect(mean([-10, -20, -30])).toBe(-20);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for empty array', () => {
      expect(mean([])).toBe(0);
    });

    it('should handle single value', () => {
      expect(mean([42])).toBe(42);
    });

    it('should handle two values', () => {
      expect(mean([10, 20])).toBe(15);
    });

    it('should handle all same values', () => {
      expect(mean([7, 7, 7, 7])).toBe(7);
    });

    it('should handle zeros', () => {
      expect(mean([0, 0, 0])).toBe(0);
    });
  });
});

describe('median', () => {
  describe('happy path', () => {
    it('should calculate median of odd-length array', () => {
      expect(median([1, 2, 3, 4, 5])).toBe(3);
    });

    it('should calculate median of even-length array', () => {
      expect(median([1, 2, 3, 4])).toBe(2.5);
    });

    it('should sort unsorted array before calculating', () => {
      expect(median([5, 1, 3, 2, 4])).toBe(3);
    });

    it('should handle negative numbers', () => {
      expect(median([-5, -1, 0, 1, 5])).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for empty array', () => {
      expect(median([])).toBe(0);
    });

    it('should handle single value', () => {
      expect(median([42])).toBe(42);
    });

    it('should handle two values', () => {
      expect(median([10, 20])).toBe(15);
    });

    it('should handle all same values', () => {
      expect(median([5, 5, 5, 5])).toBe(5);
    });

    it('should handle duplicates in sorted order', () => {
      expect(median([1, 2, 2, 2, 3])).toBe(2);
    });
  });
});

describe('mode', () => {
  describe('happy path', () => {
    it('should find the most frequent value', () => {
      expect(mode([1, 2, 2, 3, 3, 3, 4])).toBe(3);
    });

    it('should return first mode when multiple values have same frequency', () => {
      expect(mode([1, 1, 2, 2])).toBe(1);
    });

    it('should handle mode with negative numbers', () => {
      expect(mode([-1, -1, -1, 0, 1])).toBe(-1);
    });

    it('should find mode when all values appear once', () => {
      expect(mode([1, 2, 3, 4, 5])).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should return undefined for empty array', () => {
      expect(mode([])).toBeUndefined();
    });

    it('should handle single value', () => {
      expect(mode([42])).toBe(42);
    });

    it('should handle two identical values', () => {
      expect(mode([5, 5])).toBe(5);
    });

    it('should handle all same values', () => {
      expect(mode([7, 7, 7, 7])).toBe(7);
    });

    it('should handle zeros', () => {
      expect(mode([0, 0, 1, 2])).toBe(0);
    });
  });
});

describe('min', () => {
  describe('happy path', () => {
    it('should find minimum value in array', () => {
      expect(min([5, 2, 8, 1, 9])).toBe(1);
    });

    it('should handle negative numbers', () => {
      expect(min([-5, 0, 5])).toBe(-5);
    });

    it('should handle all negative numbers', () => {
      expect(min([-10, -5, -3, -20])).toBe(-20);
    });

    it('should handle decimal numbers', () => {
      expect(min([1.5, 1.2, 1.8, 1.1])).toBe(1.1);
    });
  });

  describe('edge cases', () => {
    it('should return Infinity for empty array', () => {
      expect(min([])).toBe(Infinity);
    });

    it('should handle single value', () => {
      expect(min([42])).toBe(42);
    });

    it('should handle two values', () => {
      expect(min([10, 5])).toBe(5);
    });

    it('should handle all same values', () => {
      expect(min([7, 7, 7])).toBe(7);
    });

    it('should handle zeros', () => {
      expect(min([0, 1, 2])).toBe(0);
    });
  });
});

describe('max', () => {
  describe('happy path', () => {
    it('should find maximum value in array', () => {
      expect(max([5, 2, 8, 1, 9])).toBe(9);
    });

    it('should handle negative numbers', () => {
      expect(max([-5, 0, 5])).toBe(5);
    });

    it('should handle all negative numbers', () => {
      expect(max([-10, -5, -3, -20])).toBe(-3);
    });

    it('should handle decimal numbers', () => {
      expect(max([1.5, 1.2, 1.8, 1.1])).toBe(1.8);
    });
  });

  describe('edge cases', () => {
    it('should return -Infinity for empty array', () => {
      expect(max([])).toBe(-Infinity);
    });

    it('should handle single value', () => {
      expect(max([42])).toBe(42);
    });

    it('should handle two values', () => {
      expect(max([10, 5])).toBe(10);
    });

    it('should handle all same values', () => {
      expect(max([7, 7, 7])).toBe(7);
    });

    it('should handle zeros', () => {
      expect(max([0, -1, -2])).toBe(0);
    });
  });
});

// ============================================================================
// VARIABILITY MEASURES
// ============================================================================

describe('variance', () => {
  describe('happy path', () => {
    it('should calculate variance correctly', () => {
      // Known variance: [1,2,3,4,5] => variance = 2.5
      expect(variance([1, 2, 3, 4, 5])).toBeCloseTo(2.5, 5);
    });

    it('should calculate variance for dataset from documentation', () => {
      // [2, 4, 4, 4, 5, 5, 7, 9] => variance ≈ 4.571
      expect(variance([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(4.571428571, 5);
    });

    it('should return 0 for identical values', () => {
      expect(variance([5, 5, 5, 5])).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(variance([-2, -1, 0, 1, 2])).toBeCloseTo(2.5, 5);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for empty array', () => {
      expect(variance([])).toBe(0);
    });

    it('should return 0 for single value', () => {
      expect(variance([42])).toBe(0);
    });

    it('should calculate variance for two values', () => {
      expect(variance([10, 20])).toBe(50);
    });

    it('should return 0 for all same values', () => {
      expect(variance([1, 1, 1])).toBe(0);
    });
  });
});

describe('standardDeviation', () => {
  describe('happy path', () => {
    it('should calculate standard deviation correctly', () => {
      // sqrt(variance([1,2,3,4,5])) = sqrt(2.5) ≈ 1.58
      expect(standardDeviation([1, 2, 3, 4, 5])).toBeCloseTo(1.5811388, 5);
    });

    it('should calculate standard deviation for dataset from documentation', () => {
      // [2, 4, 4, 4, 5, 5, 7, 9] => std dev ≈ 2.138
      expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138089935, 5);
    });

    it('should return 0 for identical values', () => {
      expect(standardDeviation([5, 5, 5, 5])).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(standardDeviation([-2, -1, 0, 1, 2])).toBeCloseTo(1.5811388, 5);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for empty array', () => {
      expect(standardDeviation([])).toBe(0);
    });

    it('should return 0 for single value', () => {
      expect(standardDeviation([42])).toBe(0);
    });

    it('should calculate for two values', () => {
      expect(standardDeviation([10, 20])).toBeCloseTo(7.0710678, 5);
    });

    it('should return 0 for all same values', () => {
      expect(standardDeviation([1, 1, 1])).toBe(0);
    });
  });
});

describe('coefficientOfVariation', () => {
  describe('happy path', () => {
    it('should calculate CV as percentage', () => {
      // CV = (std dev / mean) * 100
      const values = [2, 4, 6, 8, 10];
      const result = coefficientOfVariation(values);
      // Mean = 6, StdDev ≈ 3.162, CV ≈ 52.70
      expect(result).toBeCloseTo(52.70, 1);
    });

    it('should return 0 for identical values', () => {
      expect(coefficientOfVariation([100, 100, 100])).toBe(0);
    });

    it('should handle large variations', () => {
      const values = [1, 100];
      const result = coefficientOfVariation(values);
      expect(result).toBeGreaterThan(0);
    });

    it('should use absolute value of mean', () => {
      const values = [-10, -20, -30];
      const result = coefficientOfVariation(values);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for empty array', () => {
      expect(coefficientOfVariation([])).toBe(0);
    });

    it('should return 0 for single value', () => {
      expect(coefficientOfVariation([42])).toBe(0);
    });

    it('should return 0 when mean is 0', () => {
      expect(coefficientOfVariation([-5, 0, 5])).toBe(0);
    });

    it('should handle arrays with less than 2 values', () => {
      expect(coefficientOfVariation([1])).toBe(0);
    });
  });
});

// ============================================================================
// DISTRIBUTION ANALYSIS
// ============================================================================

describe('quartiles', () => {
  describe('happy path', () => {
    it('should calculate quartiles correctly', () => {
      const result = quartiles([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      // Using linear interpolation method: Q1=3, Q2=5, Q3=7
      expect(result.q1).toBe(3);
      expect(result.q2).toBe(5);
      expect(result.q3).toBe(7);
    });

    it('should calculate q2 as median', () => {
      const values = [1, 2, 3, 4, 5];
      const result = quartiles(values);
      expect(result.q2).toBe(median(values));
    });

    it('should handle even-length arrays', () => {
      const result = quartiles([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(result.q1).toBeGreaterThan(0);
      expect(result.q2).toBeGreaterThan(result.q1);
      expect(result.q3).toBeGreaterThan(result.q2);
    });

    it('should handle unsorted data', () => {
      const result = quartiles([5, 1, 9, 3, 7, 2, 8, 4, 6]);
      // Same as sorted [1,2,3,4,5,6,7,8,9]
      expect(result.q1).toBe(3);
      expect(result.q2).toBe(5);
      expect(result.q3).toBe(7);
    });
  });

  describe('edge cases', () => {
    it('should return zeros for empty array', () => {
      const result = quartiles([]);
      expect(result.q1).toBe(0);
      expect(result.q2).toBe(0);
      expect(result.q3).toBe(0);
    });

    it('should handle single value', () => {
      const result = quartiles([42]);
      expect(result.q1).toBe(42);
      expect(result.q2).toBe(42);
      expect(result.q3).toBe(42);
    });

    it('should handle all same values', () => {
      const result = quartiles([5, 5, 5, 5, 5]);
      expect(result.q1).toBe(5);
      expect(result.q2).toBe(5);
      expect(result.q3).toBe(5);
    });
  });
});

describe('interquartileRange', () => {
  describe('happy path', () => {
    it('should calculate IQR correctly', () => {
      // IQR = Q3 - Q1 = 7 - 3 = 4
      expect(interquartileRange([1, 2, 3, 4, 5, 6, 7, 8, 9])).toBe(4);
    });

    it('should return 0 for identical values', () => {
      expect(interquartileRange([5, 5, 5, 5, 5])).toBe(0);
    });

    it('should handle larger datasets', () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 1);
      const iqr = interquartileRange(values);
      expect(iqr).toBeGreaterThan(0);
    });

    it('should handle negative numbers', () => {
      const values = [-10, -5, 0, 5, 10];
      const iqr = interquartileRange(values);
      expect(iqr).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for empty array', () => {
      expect(interquartileRange([])).toBe(0);
    });

    it('should return 0 for single value', () => {
      expect(interquartileRange([42])).toBe(0);
    });

    it('should handle two values', () => {
      const iqr = interquartileRange([10, 20]);
      expect(iqr).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('percentile', () => {
  describe('happy path', () => {
    it('should calculate 50th percentile (median)', () => {
      expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    });

    it('should calculate 25th percentile', () => {
      expect(percentile([1, 2, 3, 4, 5], 25)).toBe(2);
    });

    it('should calculate 75th percentile', () => {
      expect(percentile([1, 2, 3, 4, 5], 75)).toBe(4);
    });

    it('should use linear interpolation', () => {
      const result = percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 33);
      expect(result).toBeGreaterThan(3);
      expect(result).toBeLessThan(4);
    });

    it('should handle unsorted data', () => {
      expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for empty array', () => {
      expect(percentile([], 50)).toBe(0);
    });

    it('should handle 0th percentile', () => {
      expect(percentile([1, 2, 3, 4, 5], 0)).toBe(1);
    });

    it('should handle 100th percentile', () => {
      expect(percentile([1, 2, 3, 4, 5], 100)).toBe(5);
    });

    it('should handle single value', () => {
      expect(percentile([42], 50)).toBe(42);
    });

    it('should clamp percentile < 0 to 0', () => {
      const result = percentile([1, 2, 3, 4, 5], -1);
      expect(result).toBe(1); // Same as 0th percentile
    });

    it('should clamp percentile > 100 to 100', () => {
      const result = percentile([1, 2, 3, 4, 5], 150);
      expect(result).toBe(5); // Same as 100th percentile
    });
  });
});

// ============================================================================
// OUTLIER DETECTION
// ============================================================================

describe('detectOutliers', () => {
  describe('happy path', () => {
    it('should detect outliers using IQR method', () => {
      const outliers = detectOutliers([1, 2, 3, 4, 5, 100]);
      expect(outliers).toContain(100);
      expect(outliers.length).toBeGreaterThan(0);
    });

    it('should return empty array when no outliers', () => {
      const outliers = detectOutliers([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(outliers).toEqual([]);
    });

    it('should use custom threshold', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100];
      const outliersDefault = detectOutliers(values, 1.5);
      const outliersStrict = detectOutliers(values, 3.0);
      expect(outliersDefault.length).toBeGreaterThanOrEqual(outliersStrict.length);
    });

    it('should detect both low and high outliers', () => {
      const outliers = detectOutliers([-100, 1, 2, 3, 4, 5, 100]);
      expect(outliers).toContain(-100);
      expect(outliers).toContain(100);
    });

    it('should handle negative numbers', () => {
      const outliers = detectOutliers([-50, -10, -5, 0, 5, 10, 50]);
      expect(outliers.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should return empty array for less than 4 values', () => {
      expect(detectOutliers([1, 2, 3])).toEqual([]);
      expect(detectOutliers([1, 2])).toEqual([]);
      expect(detectOutliers([1])).toEqual([]);
    });

    it('should return empty array for empty input', () => {
      expect(detectOutliers([])).toEqual([]);
    });

    it('should handle all same values', () => {
      expect(detectOutliers([5, 5, 5, 5, 5])).toEqual([]);
    });

    it('should handle uniform distribution', () => {
      const values = Array.from({ length: 10 }, (_, i) => i + 1);
      const outliers = detectOutliers(values);
      expect(outliers).toEqual([]);
    });
  });
});

describe('zScore', () => {
  describe('happy path', () => {
    it('should calculate z-score correctly', () => {
      const values = [2, 4, 6, 8, 10];
      const z = zScore(10, values);
      expect(z).toBeCloseTo(1.2649110640673518, 5);
    });

    it('should return 0 for mean value', () => {
      const values = [1, 2, 3, 4, 5];
      const z = zScore(3, values); // 3 is the mean
      expect(z).toBeCloseTo(0, 5);
    });

    it('should return negative z-score for below mean', () => {
      const values = [1, 2, 3, 4, 5];
      const z = zScore(1, values);
      expect(z).toBeLessThan(0);
    });

    it('should return positive z-score for above mean', () => {
      const values = [1, 2, 3, 4, 5];
      const z = zScore(5, values);
      expect(z).toBeGreaterThan(0);
    });

    it('should handle negative numbers', () => {
      const values = [-10, -5, 0, 5, 10];
      const z = zScore(10, values);
      expect(z).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for single value', () => {
      expect(zScore(42, [42])).toBe(0);
    });

    it('should return 0 when standard deviation is 0', () => {
      expect(zScore(5, [5, 5, 5, 5])).toBe(0);
    });

    it('should return 0 for empty array', () => {
      expect(zScore(10, [])).toBe(0);
    });

    it('should handle value not in dataset', () => {
      const values = [1, 2, 3, 4, 5];
      const z = zScore(100, values);
      expect(z).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// REGRESSION ANALYSIS
// ============================================================================

describe('linearRegression', () => {
  describe('happy path', () => {
    it('should calculate regression for perfect linear relationship', () => {
      const points = [
        { x: 1, y: 2 },
        { x: 2, y: 4 },
        { x: 3, y: 6 },
      ];
      const result = linearRegression(points);

      expect(result.slope).toBeCloseTo(2, 5);
      expect(result.intercept).toBeCloseTo(0, 5);
      expect(result.r2).toBeCloseTo(1, 5);
    });

    it('should calculate regression with non-zero intercept', () => {
      const points = [
        { x: 1, y: 3 },
        { x: 2, y: 5 },
        { x: 3, y: 7 },
      ];
      const result = linearRegression(points);

      expect(result.slope).toBeCloseTo(2, 5);
      expect(result.intercept).toBeCloseTo(1, 5);
      expect(result.r2).toBeCloseTo(1, 5);
    });

    it('should handle negative correlation', () => {
      const points = [
        { x: 1, y: 10 },
        { x: 2, y: 8 },
        { x: 3, y: 6 },
        { x: 4, y: 4 },
      ];
      const result = linearRegression(points);

      expect(result.slope).toBeLessThan(0);
      expect(result.r2).toBeGreaterThan(0.9);
    });

    it('should handle imperfect fit', () => {
      const points = [
        { x: 1, y: 2 },
        { x: 2, y: 4 },
        { x: 3, y: 5 },
        { x: 4, y: 8 },
      ];
      const result = linearRegression(points);

      expect(result.slope).toBeGreaterThan(0);
      expect(result.r2).toBeGreaterThan(0);
      expect(result.r2).toBeLessThanOrEqual(1);
    });

    it('should handle negative x and y values', () => {
      const points = [
        { x: -2, y: -4 },
        { x: -1, y: -2 },
        { x: 0, y: 0 },
        { x: 1, y: 2 },
      ];
      const result = linearRegression(points);

      expect(result.slope).toBeCloseTo(2, 5);
      expect(result.r2).toBeCloseTo(1, 5);
    });
  });

  describe('edge cases', () => {
    it('should handle single point', () => {
      const points = [{ x: 1, y: 2 }];
      const result = linearRegression(points);

      expect(result.slope).toBe(0);
      expect(result.intercept).toBe(0);
      expect(result.r2).toBe(0);
    });

    it('should handle empty array', () => {
      const result = linearRegression([]);

      expect(result.slope).toBe(0);
      expect(result.intercept).toBe(0);
      expect(result.r2).toBe(0);
    });

    it('should handle vertical line (all x values same)', () => {
      const points = [
        { x: 5, y: 1 },
        { x: 5, y: 2 },
        { x: 5, y: 3 },
      ];
      const result = linearRegression(points);

      expect(result.slope).toBe(0);
    });

    it('should handle horizontal line (all y values same)', () => {
      const points = [
        { x: 1, y: 5 },
        { x: 2, y: 5 },
        { x: 3, y: 5 },
      ];
      const result = linearRegression(points);

      expect(result.slope).toBeCloseTo(0, 5);
      expect(result.r2).toBe(1); // Perfect fit for horizontal line
    });

    it('should clamp r2 between 0 and 1', () => {
      const points = [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ];
      const result = linearRegression(points);

      expect(result.r2).toBeGreaterThanOrEqual(0);
      expect(result.r2).toBeLessThanOrEqual(1);
    });
  });
});

describe('predict', () => {
  describe('happy path', () => {
    it('should predict y value using linear model', () => {
      const model = { slope: 2, intercept: 1 };
      expect(predict(5, model)).toBe(11); // y = 2*5 + 1 = 11
    });

    it('should handle zero slope', () => {
      const model = { slope: 0, intercept: 5 };
      expect(predict(10, model)).toBe(5);
    });

    it('should handle zero intercept', () => {
      const model = { slope: 3, intercept: 0 };
      expect(predict(4, model)).toBe(12);
    });

    it('should handle negative slope', () => {
      const model = { slope: -2, intercept: 10 };
      expect(predict(3, model)).toBe(4); // y = -2*3 + 10 = 4
    });

    it('should handle negative x values', () => {
      const model = { slope: 2, intercept: 1 };
      expect(predict(-3, model)).toBe(-5); // y = 2*(-3) + 1 = -5
    });
  });

  describe('edge cases', () => {
    it('should handle x = 0', () => {
      const model = { slope: 2, intercept: 5 };
      expect(predict(0, model)).toBe(5);
    });

    it('should handle both values = 0', () => {
      const model = { slope: 0, intercept: 0 };
      expect(predict(0, model)).toBe(0);
    });

    it('should handle decimal slope and intercept', () => {
      const model = { slope: 1.5, intercept: 2.5 };
      expect(predict(2, model)).toBe(5.5);
    });

    it('should handle large values', () => {
      const model = { slope: 1, intercept: 0 };
      expect(predict(1000000, model)).toBe(1000000);
    });
  });
});

// ============================================================================
// INFORMATION THEORY
// ============================================================================

describe('shannonEntropy', () => {
  describe('happy path', () => {
    it('should return 0 for no diversity', () => {
      expect(shannonEntropy([1, 1, 1, 1])).toBe(0);
    });

    it('should calculate entropy for uniform distribution', () => {
      // Maximum entropy for 4 distinct items = log2(4) = 2
      expect(shannonEntropy([1, 2, 3, 4])).toBeCloseTo(2, 5);
    });

    it('should calculate entropy for two-item distribution', () => {
      expect(shannonEntropy(['a', 'a', 'b', 'b'])).toBeCloseTo(1, 5);
    });

    it('should handle numeric values', () => {
      const entropy = shannonEntropy([1, 1, 2, 2, 3, 3]);
      expect(entropy).toBeGreaterThan(0);
      expect(entropy).toBeCloseTo(1.584963, 5);
    });

    it('should handle string values', () => {
      const entropy = shannonEntropy(['red', 'blue', 'green', 'red']);
      expect(entropy).toBeGreaterThan(0);
    });

    it('should have higher entropy for more diverse data', () => {
      const lowDiversity = shannonEntropy([1, 1, 1, 2]);
      const highDiversity = shannonEntropy([1, 2, 3, 4]);
      expect(highDiversity).toBeGreaterThan(lowDiversity);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for empty array', () => {
      expect(shannonEntropy([])).toBe(0);
    });

    it('should return 0 for single value', () => {
      expect(shannonEntropy([42])).toBe(0);
    });

    it('should handle all same string values', () => {
      expect(shannonEntropy(['a', 'a', 'a'])).toBe(0);
    });

    it('should handle mixed types', () => {
      const entropy = shannonEntropy([1, '1', true, 1]);
      expect(entropy).toBeGreaterThan(0);
    });

    it('should handle boolean values', () => {
      const entropy = shannonEntropy([true, false, true, false]);
      expect(entropy).toBeCloseTo(1, 5);
    });
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

describe('sortAscending', () => {
  describe('happy path', () => {
    it('should sort numbers in ascending order', () => {
      expect(sortAscending([3, 1, 4, 1, 5, 9])).toEqual([1, 1, 3, 4, 5, 9]);
    });

    it('should handle negative numbers', () => {
      expect(sortAscending([-5, 10, -3, 0, 7])).toEqual([-5, -3, 0, 7, 10]);
    });

    it('should handle decimal numbers', () => {
      expect(sortAscending([1.5, 1.1, 1.9, 1.3])).toEqual([1.1, 1.3, 1.5, 1.9]);
    });

    it('should not mutate original array', () => {
      const original = [3, 1, 2];
      const sorted = sortAscending(original);
      expect(original).toEqual([3, 1, 2]);
      expect(sorted).toEqual([1, 2, 3]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty array', () => {
      expect(sortAscending([])).toEqual([]);
    });

    it('should handle single value', () => {
      expect(sortAscending([42])).toEqual([42]);
    });

    it('should handle already sorted array', () => {
      expect(sortAscending([1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle reverse sorted array', () => {
      expect(sortAscending([5, 4, 3, 2, 1])).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle duplicates', () => {
      expect(sortAscending([3, 1, 2, 1, 3])).toEqual([1, 1, 2, 3, 3]);
    });

    it('should handle all same values', () => {
      expect(sortAscending([5, 5, 5, 5])).toEqual([5, 5, 5, 5]);
    });
  });
});

describe('round', () => {
  describe('happy path', () => {
    it('should round to 2 decimal places by default', () => {
      expect(round(3.14159)).toBe(3.14);
    });

    it('should round to specified decimal places', () => {
      expect(round(3.14159, 4)).toBe(3.1416);
    });

    it('should round to 0 decimal places', () => {
      expect(round(3.7, 0)).toBe(4);
      expect(round(3.4, 0)).toBe(3);
    });

    it('should handle negative numbers', () => {
      expect(round(-3.14159, 2)).toBe(-3.14);
    });

    it('should handle rounding up', () => {
      expect(round(2.5)).toBe(2.5);
      expect(round(2.555, 2)).toBe(2.56);
    });

    it('should handle rounding down', () => {
      expect(round(2.4)).toBe(2.4);
      expect(round(2.444, 2)).toBe(2.44);
    });
  });

  describe('edge cases', () => {
    it('should handle zero', () => {
      expect(round(0)).toBe(0);
      expect(round(0.0001, 2)).toBe(0);
    });

    it('should handle integers', () => {
      expect(round(5)).toBe(5);
      expect(round(42, 3)).toBe(42);
    });

    it('should handle very small decimals', () => {
      expect(round(0.0001, 2)).toBe(0);
      expect(round(0.0001, 4)).toBe(0.0001);
    });

    it('should handle Infinity', () => {
      expect(round(Infinity)).toBe(Infinity);
      expect(round(-Infinity)).toBe(-Infinity);
    });

    it('should handle NaN', () => {
      expect(round(NaN)).toBeNaN();
    });

    it('should handle negative decimal places', () => {
      expect(round(1234, -2)).toBe(1200);
    });

    it('should handle large numbers', () => {
      expect(round(123456.789, 2)).toBe(123456.79);
    });
  });
});

// ============================================================================
// PERFORMANCE TESTS (Optional)
// ============================================================================

describe('performance', () => {
  it('mean handles large datasets efficiently', () => {
    const largeDataset = Array.from({ length: 10000 }, (_, i) => i);
    const start = performance.now();
    const result = mean(largeDataset);
    const duration = performance.now() - start;

    expect(result).toBe(4999.5);
    expect(duration).toBeLessThan(10); // Should be < 10ms
  });

  it('median handles large datasets efficiently', () => {
    const largeDataset = Array.from({ length: 10000 }, (_, i) => i);
    const start = performance.now();
    const result = median(largeDataset);
    const duration = performance.now() - start;

    expect(result).toBe(4999.5);
    expect(duration).toBeLessThan(50); // Should be < 50ms (includes sort)
  });

  it('standardDeviation handles large datasets efficiently', () => {
    const largeDataset = Array.from({ length: 10000 }, (_, i) => i);
    const start = performance.now();
    const result = standardDeviation(largeDataset);
    const duration = performance.now() - start;

    expect(result).toBeGreaterThan(0);
    expect(duration).toBeLessThan(20); // Should be < 20ms
  });

  it('linearRegression handles many data points efficiently', () => {
    const manyPoints = Array.from({ length: 1000 }, (_, i) => ({
      x: i,
      y: 2 * i + 1,
    }));
    const start = performance.now();
    const result = linearRegression(manyPoints);
    const duration = performance.now() - start;

    expect(result.slope).toBeCloseTo(2, 2);
    expect(result.intercept).toBeCloseTo(1, 2);
    expect(duration).toBeLessThan(50); // Should be < 50ms
  });

  it('shannonEntropy handles large datasets efficiently', () => {
    const largeDataset = Array.from({ length: 10000 }, (_, i) => i % 10);
    const start = performance.now();
    const result = shannonEntropy(largeDataset);
    const duration = performance.now() - start;

    expect(result).toBeGreaterThan(0);
    expect(duration).toBeLessThan(50); // Should be < 50ms
  });
});
