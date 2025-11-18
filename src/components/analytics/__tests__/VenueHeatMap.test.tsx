/**
 * Test Suite for VenueHeatMap Component
 *
 * Tests cover:
 * - Rendering with valid heat map data
 * - Map marker generation
 * - Callout interactions
 * - Loading states
 * - Empty states
 * - Edge cases
 * - Accessibility
 *
 * Target: 20+ tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { VenueHeatMap } from '../VenueHeatMap';
import { HeatMapData, ClusteredPoint, GeoBounds } from '../../../types/analytics';

// ============================================================================
// Test Data Helpers
// ============================================================================

/**
 * Create mock heat map data
 */
function createMockHeatMapData(
  pointCount: number = 3,
  overrides: Partial<HeatMapData> = {}
): HeatMapData {
  const points: ClusteredPoint[] = Array(pointCount)
    .fill(0)
    .map((_, i) => ({
      latitude: 51.5 + i * 0.1,
      longitude: -0.1 + i * 0.1,
      weight: i + 1,
      venueNames: [`Venue ${i + 1}`],
      experiences: i + 1,
    }));

  const bounds: GeoBounds = {
    minLat: 51.5,
    maxLat: 51.7,
    minLng: -0.1,
    maxLng: 0.1,
    centerLat: 51.6,
    centerLng: 0,
  };

  return {
    points,
    bounds,
    intensity: pointCount,
    metadata: {
      totalVenues: pointCount,
      totalExperiences: pointCount * 2,
      clusterRadius: 100,
    },
    ...overrides,
  };
}

/**
 * Create mock clustered point
 */
function createMockCluster(
  venueNames: string[],
  experiences: number,
  lat: number = 51.5,
  lng: number = -0.1
): ClusteredPoint {
  return {
    latitude: lat,
    longitude: lng,
    weight: venueNames.length,
    venueNames,
    experiences,
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('VenueHeatMap', () => {
  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('Rendering', () => {
    it('should render with valid heat map data', () => {
      const heatMapData = createMockHeatMapData(3);

      render(<VenueHeatMap heatMapData={heatMapData} />);

      expect(screen.getByTestId('venue-map-view')).toBeTruthy();
    });

    it('should render loading state', () => {
      render(<VenueHeatMap heatMapData={null} isLoading={true} />);

      expect(screen.getByText('Loading venue map...')).toBeTruthy();
    });

    it('should render empty state when no data', () => {
      render(<VenueHeatMap heatMapData={null} />);

      expect(screen.getByText('No Venue Locations')).toBeTruthy();
      expect(
        screen.getByText(/Add location information to your experiences/)
      ).toBeTruthy();
    });

    it('should render empty state when no points', () => {
      const emptyData = createMockHeatMapData(0);

      render(<VenueHeatMap heatMapData={emptyData} />);

      expect(screen.getByText('No Venue Locations')).toBeTruthy();
    });

    it('should render map with markers for each cluster', () => {
      const heatMapData = createMockHeatMapData(3);

      render(<VenueHeatMap heatMapData={heatMapData} />);

      expect(screen.getByTestId('venue-marker-0')).toBeTruthy();
      expect(screen.getByTestId('venue-marker-1')).toBeTruthy();
      expect(screen.getByTestId('venue-marker-2')).toBeTruthy();
    });

    it('should render stats badge with venue count', () => {
      const heatMapData = createMockHeatMapData(5);

      render(<VenueHeatMap heatMapData={heatMapData} />);

      expect(screen.getByText('5 venues')).toBeTruthy();
    });

    it('should render stats badge with experience count', () => {
      const heatMapData = createMockHeatMapData(3);

      render(<VenueHeatMap heatMapData={heatMapData} />);

      // Stats badge shows total experiences from metadata
      expect(screen.getAllByText(/\d+ experience/).length).toBeGreaterThan(0);
    });

    it('should render legend with intensity colors', () => {
      const heatMapData = createMockHeatMapData(3);

      render(<VenueHeatMap heatMapData={heatMapData} />);

      expect(screen.getByText('Experiences')).toBeTruthy();
      expect(screen.getByText('1-2')).toBeTruthy();
      expect(screen.getByText('3-5')).toBeTruthy();
      expect(screen.getByText('6+')).toBeTruthy();
    });
  });

  // ==========================================================================
  // Marker Tests
  // ==========================================================================

  describe('Markers', () => {
    it('should render marker for single venue cluster', () => {
      const points: ClusteredPoint[] = [
        createMockCluster(['The Crown'], 5, 51.5074, -0.1278),
      ];

      const heatMapData = createMockHeatMapData(1);
      heatMapData.points = points;

      render(<VenueHeatMap heatMapData={heatMapData} />);

      expect(screen.getByTestId('venue-marker-0')).toBeTruthy();
    });

    it('should render markers for multiple clusters', () => {
      const heatMapData = createMockHeatMapData(5);

      render(<VenueHeatMap heatMapData={heatMapData} />);

      for (let i = 0; i < 5; i++) {
        expect(screen.getByTestId(`venue-marker-${i}`)).toBeTruthy();
      }
    });

    it('should display experience count on marker', () => {
      const points: ClusteredPoint[] = [
        createMockCluster(['The Crown'], 7, 51.5074, -0.1278),
      ];

      const heatMapData = createMockHeatMapData(1);
      heatMapData.points = points;

      render(<VenueHeatMap heatMapData={heatMapData} />);

      expect(screen.getByText('7')).toBeTruthy();
    });

    it('should handle large experience counts', () => {
      const points: ClusteredPoint[] = [
        createMockCluster(['Popular Pub'], 25, 51.5074, -0.1278),
      ];

      const heatMapData = createMockHeatMapData(1);
      heatMapData.points = points;

      render(<VenueHeatMap heatMapData={heatMapData} />);

      expect(screen.getByText('25')).toBeTruthy();
    });
  });

  // ==========================================================================
  // Callout Tests
  // ==========================================================================

  describe('Callouts', () => {
    it('should show single venue name in callout', () => {
      const points: ClusteredPoint[] = [
        createMockCluster(['The Crown'], 5, 51.5074, -0.1278),
      ];

      const heatMapData = createMockHeatMapData(1);
      heatMapData.points = points;

      render(<VenueHeatMap heatMapData={heatMapData} />);

      expect(screen.getByText('The Crown')).toBeTruthy();
    });

    it('should show cluster summary for multiple venues', () => {
      const points: ClusteredPoint[] = [
        createMockCluster(['Pub A', 'Pub B', 'Bar C'], 10, 51.5074, -0.1278),
      ];

      const heatMapData = createMockHeatMapData(1);
      heatMapData.points = points;

      render(<VenueHeatMap heatMapData={heatMapData} />);

      expect(screen.getByText('3 venues nearby')).toBeTruthy();
    });

    it('should list venue names in callout', () => {
      const points: ClusteredPoint[] = [
        createMockCluster(['The Crown', 'The Rose'], 8, 51.5074, -0.1278),
      ];

      const heatMapData = createMockHeatMapData(1);
      heatMapData.points = points;

      render(<VenueHeatMap heatMapData={heatMapData} />);

      expect(screen.getByText(/The Crown/)).toBeTruthy();
      expect(screen.getByText(/The Rose/)).toBeTruthy();
    });

    it('should show experience count in callout', () => {
      const points: ClusteredPoint[] = [
        createMockCluster(['The Crown'], 5, 51.5074, -0.1278),
      ];

      const heatMapData = createMockHeatMapData(1);
      heatMapData.points = points;

      render(<VenueHeatMap heatMapData={heatMapData} />);

      expect(screen.getByText('5 experiences')).toBeTruthy();
    });

    it('should handle singular experience count', () => {
      const points: ClusteredPoint[] = [
        createMockCluster(['The Crown'], 1, 51.5074, -0.1278),
      ];

      const heatMapData = createMockHeatMapData(1);
      heatMapData.points = points;

      render(<VenueHeatMap heatMapData={heatMapData} />);

      expect(screen.getByText('1 experience')).toBeTruthy();
    });

    it('should limit venue list display in callout', () => {
      const manyVenues = Array(10)
        .fill(0)
        .map((_, i) => `Venue ${i + 1}`);
      const points: ClusteredPoint[] = [
        createMockCluster(manyVenues, 20, 51.5074, -0.1278),
      ];

      const heatMapData = createMockHeatMapData(1);
      heatMapData.points = points;

      render(<VenueHeatMap heatMapData={heatMapData} />);

      expect(screen.getByText('+7 more')).toBeTruthy();
    });
  });

  // ==========================================================================
  // Interaction Tests
  // ==========================================================================

  describe('Interactions', () => {
    it('should call onVenueSelect when marker is pressed', () => {
      const onVenueSelect = jest.fn();
      const points: ClusteredPoint[] = [
        createMockCluster(['The Crown'], 5, 51.5074, -0.1278),
      ];

      const heatMapData = createMockHeatMapData(1);
      heatMapData.points = points;

      const { getByTestId } = render(
        <VenueHeatMap heatMapData={heatMapData} onVenueSelect={onVenueSelect} />
      );

      const marker = getByTestId('venue-marker-0');
      fireEvent.press(marker);

      expect(onVenueSelect).toHaveBeenCalledWith(['The Crown']);
    });

    it('should call onVenueSelect with multiple venue names', () => {
      const onVenueSelect = jest.fn();
      const points: ClusteredPoint[] = [
        createMockCluster(['Pub A', 'Pub B', 'Bar C'], 10, 51.5074, -0.1278),
      ];

      const heatMapData = createMockHeatMapData(1);
      heatMapData.points = points;

      const { getByTestId } = render(
        <VenueHeatMap heatMapData={heatMapData} onVenueSelect={onVenueSelect} />
      );

      const marker = getByTestId('venue-marker-0');
      fireEvent.press(marker);

      expect(onVenueSelect).toHaveBeenCalledWith(['Pub A', 'Pub B', 'Bar C']);
    });

    it('should handle marker press without onVenueSelect callback', () => {
      const points: ClusteredPoint[] = [
        createMockCluster(['The Crown'], 5, 51.5074, -0.1278),
      ];

      const heatMapData = createMockHeatMapData(1);
      heatMapData.points = points;

      const { getByTestId } = render(<VenueHeatMap heatMapData={heatMapData} />);

      const marker = getByTestId('venue-marker-0');

      // Should not throw
      expect(() => fireEvent.press(marker)).not.toThrow();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle null heat map data', () => {
      render(<VenueHeatMap heatMapData={null} />);

      expect(screen.getByText('No Venue Locations')).toBeTruthy();
    });

    it('should handle empty points array', () => {
      const emptyData: HeatMapData = {
        points: [],
        bounds: {
          minLat: 0,
          maxLat: 0,
          minLng: 0,
          maxLng: 0,
          centerLat: 0,
          centerLng: 0,
        },
        intensity: 0,
        metadata: {
          totalVenues: 0,
          totalExperiences: 0,
          clusterRadius: 100,
        },
      };

      render(<VenueHeatMap heatMapData={emptyData} />);

      expect(screen.getByText('No Venue Locations')).toBeTruthy();
    });

    it('should handle single point heat map', () => {
      const heatMapData = createMockHeatMapData(1);

      render(<VenueHeatMap heatMapData={heatMapData} />);

      expect(screen.getByTestId('venue-marker-0')).toBeTruthy();
      expect(screen.getByText('1 venue')).toBeTruthy();
    });

    it('should handle large number of markers', () => {
      const heatMapData = createMockHeatMapData(50);

      render(<VenueHeatMap heatMapData={heatMapData} />);

      expect(screen.getByTestId('venue-map-view')).toBeTruthy();
      expect(screen.getByText('50 venues')).toBeTruthy();
    });

    it('should handle extreme coordinates', () => {
      const points: ClusteredPoint[] = [
        createMockCluster(['North Pole'], 1, 89.9, 0),
        createMockCluster(['Equator'], 1, 0, 0),
      ];

      const heatMapData = createMockHeatMapData(2);
      heatMapData.points = points;

      render(<VenueHeatMap heatMapData={heatMapData} />);

      expect(screen.getByTestId('venue-map-view')).toBeTruthy();
    });

    it('should handle loading to loaded transition', () => {
      const heatMapData = createMockHeatMapData(3);

      const { rerender } = render(
        <VenueHeatMap heatMapData={null} isLoading={true} />
      );

      expect(screen.getByText('Loading venue map...')).toBeTruthy();

      rerender(<VenueHeatMap heatMapData={heatMapData} isLoading={false} />);

      expect(screen.getByTestId('venue-map-view')).toBeTruthy();
    });

    it('should handle data update after initial render', () => {
      const initialData = createMockHeatMapData(2);
      const updatedData = createMockHeatMapData(5);

      const { rerender } = render(<VenueHeatMap heatMapData={initialData} />);

      expect(screen.getByText('2 venues')).toBeTruthy();

      rerender(<VenueHeatMap heatMapData={updatedData} />);

      expect(screen.getByText('5 venues')).toBeTruthy();
    });

    it('should handle venue name with special characters', () => {
      const points: ClusteredPoint[] = [
        createMockCluster(["O'Brien's Pub & Grill"], 3, 51.5074, -0.1278),
      ];

      const heatMapData = createMockHeatMapData(1);
      heatMapData.points = points;

      render(<VenueHeatMap heatMapData={heatMapData} />);

      expect(screen.getByText("O'Brien's Pub & Grill")).toBeTruthy();
    });

    it('should handle very long venue names', () => {
      const longName = 'The Very Long Venue Name That Goes On And On';
      const points: ClusteredPoint[] = [
        createMockCluster([longName], 2, 51.5074, -0.1278),
      ];

      const heatMapData = createMockHeatMapData(1);
      heatMapData.points = points;

      render(<VenueHeatMap heatMapData={heatMapData} />);

      expect(screen.getByText(longName)).toBeTruthy();
    });
  });

  // ==========================================================================
  // Metadata Tests
  // ==========================================================================

  describe('Metadata', () => {
    it('should display correct venue count (singular)', () => {
      const heatMapData = createMockHeatMapData(1);

      render(<VenueHeatMap heatMapData={heatMapData} />);

      expect(screen.getByText('1 venue')).toBeTruthy();
    });

    it('should display correct venue count (plural)', () => {
      const heatMapData = createMockHeatMapData(5);

      render(<VenueHeatMap heatMapData={heatMapData} />);

      expect(screen.getByText('5 venues')).toBeTruthy();
    });

    it('should display correct experience count (singular)', () => {
      const heatMapData = createMockHeatMapData(1);
      heatMapData.metadata.totalExperiences = 1;

      render(<VenueHeatMap heatMapData={heatMapData} />);

      // May appear in both stats badge and callout
      expect(screen.getAllByText('1 experience').length).toBeGreaterThan(0);
    });

    it('should display correct experience count (plural)', () => {
      const heatMapData = createMockHeatMapData(3);
      heatMapData.metadata.totalExperiences = 10;

      render(<VenueHeatMap heatMapData={heatMapData} />);

      expect(screen.getByText('10 experiences')).toBeTruthy();
    });

    it('should display metadata from heat map data', () => {
      const heatMapData = createMockHeatMapData(3);
      heatMapData.metadata.totalVenues = 5;
      heatMapData.metadata.totalExperiences = 12;

      render(<VenueHeatMap heatMapData={heatMapData} />);

      // Check that metadata values are displayed in the stats badge
      expect(screen.getByText('5 venues')).toBeTruthy();
      expect(screen.getByText('12 experiences')).toBeTruthy();
    });
  });
});
