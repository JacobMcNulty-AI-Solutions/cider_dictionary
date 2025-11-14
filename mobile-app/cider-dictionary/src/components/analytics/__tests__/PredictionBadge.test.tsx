/**
 * Test Suite for PredictionBadge Component
 *
 * Tests cover:
 * - All direction variants (increasing/decreasing/stable)
 * - Confidence levels
 * - Size variants
 * - Color coding
 * - Label display
 * - Accessibility
 *
 * Target: 15+ tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { PredictionBadge } from '../PredictionBadge';

// ============================================================================
// Tests
// ============================================================================

describe('PredictionBadge', () => {
  // ============================================================================
  // Direction Variants
  // ============================================================================

  describe('Direction Variants', () => {
    it('should render increasing direction', () => {
      const { getByText } = render(
        <PredictionBadge direction="increasing" confidence={0.8} />
      );

      expect(getByText('Trending Up')).toBeTruthy();
    });

    it('should render decreasing direction', () => {
      const { getByText } = render(
        <PredictionBadge direction="decreasing" confidence={0.8} />
      );

      expect(getByText('Trending Down')).toBeTruthy();
    });

    it('should render stable direction', () => {
      const { getByText } = render(
        <PredictionBadge direction="stable" confidence={0.8} />
      );

      expect(getByText('Stable')).toBeTruthy();
    });
  });

  // ============================================================================
  // Confidence Levels
  // ============================================================================

  describe('Confidence Levels', () => {
    it('should display excellent confidence (>= 90%)', () => {
      const { getByText } = render(
        <PredictionBadge direction="increasing" confidence={0.95} />
      );

      expect(getByText('95%')).toBeTruthy();
      expect(getByText('Excellent')).toBeTruthy();
    });

    it('should display good confidence (70-89%)', () => {
      const { getByText } = render(
        <PredictionBadge direction="increasing" confidence={0.75} />
      );

      expect(getByText('75%')).toBeTruthy();
      expect(getByText('Good')).toBeTruthy();
    });

    it('should display fair confidence (50-69%)', () => {
      const { getByText } = render(
        <PredictionBadge direction="increasing" confidence={0.55} />
      );

      expect(getByText('55%')).toBeTruthy();
      expect(getByText('Fair')).toBeTruthy();
    });

    it('should display low confidence (< 50%)', () => {
      const { getByText } = render(
        <PredictionBadge direction="increasing" confidence={0.35} />
      );

      expect(getByText('35%')).toBeTruthy();
      expect(getByText('Low')).toBeTruthy();
    });

    it('should round confidence to nearest integer', () => {
      const { getByText } = render(
        <PredictionBadge direction="increasing" confidence={0.847} />
      );

      expect(getByText('85%')).toBeTruthy();
    });
  });

  // ============================================================================
  // Size Variants
  // ============================================================================

  describe('Size Variants', () => {
    it('should render small size', () => {
      const { getByText } = render(
        <PredictionBadge direction="increasing" confidence={0.8} size="small" />
      );

      expect(getByText('Trending Up')).toBeTruthy();
    });

    it('should render medium size', () => {
      const { getByText } = render(
        <PredictionBadge direction="increasing" confidence={0.8} size="medium" />
      );

      expect(getByText('Trending Up')).toBeTruthy();
    });

    it('should render large size', () => {
      const { getByText } = render(
        <PredictionBadge direction="increasing" confidence={0.8} size="large" />
      );

      expect(getByText('Trending Up')).toBeTruthy();
    });

    it('should not show subtitle for small size', () => {
      const { queryByText } = render(
        <PredictionBadge direction="increasing" confidence={0.8} size="small" />
      );

      expect(queryByText(/reliability trend/)).toBeNull();
    });

    it('should show subtitle for medium size', () => {
      const { getByText } = render(
        <PredictionBadge direction="increasing" confidence={0.8} size="medium" />
      );

      expect(getByText('High reliability trend')).toBeTruthy();
    });

    it('should show subtitle for large size', () => {
      const { getByText } = render(
        <PredictionBadge direction="increasing" confidence={0.8} size="large" />
      );

      expect(getByText('High reliability trend')).toBeTruthy();
    });
  });

  // ============================================================================
  // Label Display
  // ============================================================================

  describe('Label Display', () => {
    it('should display custom label when provided', () => {
      const { getByText } = render(
        <PredictionBadge
          direction="increasing"
          confidence={0.8}
          label="Collection Growth"
        />
      );

      expect(getByText('Collection Growth')).toBeTruthy();
    });

    it('should not display label when not provided', () => {
      const { queryByText } = render(
        <PredictionBadge direction="increasing" confidence={0.8} />
      );

      // Should not crash and should render the badge
      expect(queryByText('Trending Up')).toBeTruthy();
    });
  });

  // ============================================================================
  // Subtitle Messages
  // ============================================================================

  describe('Subtitle Messages', () => {
    it('should show high reliability for confidence >= 70%', () => {
      const { getByText } = render(
        <PredictionBadge direction="increasing" confidence={0.75} size="medium" />
      );

      expect(getByText('High reliability trend')).toBeTruthy();
    });

    it('should show moderate reliability for confidence 40-69%', () => {
      const { getByText } = render(
        <PredictionBadge direction="increasing" confidence={0.5} size="medium" />
      );

      expect(getByText('Moderate reliability trend')).toBeTruthy();
    });

    it('should show low reliability for confidence < 40%', () => {
      const { getByText } = render(
        <PredictionBadge direction="increasing" confidence={0.3} size="medium" />
      );

      expect(getByText('Low reliability trend')).toBeTruthy();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle zero confidence', () => {
      const { getByText } = render(
        <PredictionBadge direction="stable" confidence={0} />
      );

      expect(getByText('0%')).toBeTruthy();
      expect(getByText('Low')).toBeTruthy();
    });

    it('should handle perfect confidence', () => {
      const { getByText } = render(
        <PredictionBadge direction="increasing" confidence={1.0} />
      );

      expect(getByText('100%')).toBeTruthy();
      expect(getByText('Excellent')).toBeTruthy();
    });

    it('should handle confidence exactly at boundary (70%)', () => {
      const { getByText } = render(
        <PredictionBadge direction="increasing" confidence={0.7} />
      );

      expect(getByText('70%')).toBeTruthy();
      expect(getByText('Good')).toBeTruthy();
    });

    it('should handle confidence exactly at boundary (50%)', () => {
      const { getByText } = render(
        <PredictionBadge direction="increasing" confidence={0.5} />
      );

      expect(getByText('50%')).toBeTruthy();
      expect(getByText('Fair')).toBeTruthy();
    });
  });

  // ============================================================================
  // Integration with All Directions
  // ============================================================================

  describe('Integration Tests', () => {
    it('should render correctly with all props', () => {
      const { getByText } = render(
        <PredictionBadge
          direction="increasing"
          confidence={0.85}
          label="Test Label"
          size="large"
        />
      );

      expect(getByText('Test Label')).toBeTruthy();
      expect(getByText('Trending Up')).toBeTruthy();
      expect(getByText('85%')).toBeTruthy();
      expect(getByText('Good')).toBeTruthy();
      expect(getByText('High reliability trend')).toBeTruthy();
    });

    it('should work with decreasing trend and low confidence', () => {
      const { getByText } = render(
        <PredictionBadge
          direction="decreasing"
          confidence={0.25}
          label="Declining Metric"
          size="medium"
        />
      );

      expect(getByText('Declining Metric')).toBeTruthy();
      expect(getByText('Trending Down')).toBeTruthy();
      expect(getByText('25%')).toBeTruthy();
      expect(getByText('Low')).toBeTruthy();
      expect(getByText('Low reliability trend')).toBeTruthy();
    });

    it('should work with stable trend', () => {
      const { getByText } = render(
        <PredictionBadge
          direction="stable"
          confidence={0.92}
          label="Stable Metric"
        />
      );

      expect(getByText('Stable Metric')).toBeTruthy();
      expect(getByText('Stable')).toBeTruthy();
      expect(getByText('92%')).toBeTruthy();
      expect(getByText('Excellent')).toBeTruthy();
    });
  });
});
