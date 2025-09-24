import React from 'react';
import { render, fireEvent } from '../../../__tests__/utils/testUtils';
import CiderCard from '../CiderCard';
import { mockCiderRecord, mockCiderRecords, createMockCider, edgeCaseData } from '../../../__tests__/fixtures/ciderData';

describe('CiderCard Component', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  describe('Basic Functionality', () => {
    it('should render cider information correctly', () => {
      const { getByText } = render(
        <CiderCard cider={mockCiderRecord} onPress={mockOnPress} />
      );

      expect(getByText('Test Cider')).toBeTruthy();
      expect(getByText('Test Brand')).toBeTruthy();
      expect(getByText('5.5%')).toBeTruthy();
      expect(getByText('7/10')).toBeTruthy();
    });

    it('should render without onPress prop', () => {
      const { getByText } = render(
        <CiderCard cider={mockCiderRecord} />
      );

      expect(getByText('Test Cider')).toBeTruthy();
    });

    it('should render creation date correctly', () => {
      const { getByText } = render(
        <CiderCard cider={mockCiderRecord} onPress={mockOnPress} />
      );

      // Should show formatted date
      expect(getByText(`Added ${mockCiderRecord.createdAt.toLocaleDateString()}`)).toBeTruthy();
    });
  });

  describe('Star Rating Display', () => {
    it('should display correct number of filled stars for rating', () => {
      // Rating 8 out of 10 should show 4 out of 5 stars filled (8/10 * 5 = 4)
      const cider = createMockCider({ overallRating: 8 });
      const { getAllByTestId } = render(
        <CiderCard cider={cider} onPress={mockOnPress} />
      );

      const filledStars = getAllByTestId(/star-filled/);
      const outlineStars = getAllByTestId(/star-outline/);

      // Should have 4 filled stars and 1 outline star
      expect(filledStars).toHaveLength(4);
      expect(outlineStars).toHaveLength(1);
    });

    it('should display no filled stars for rating 0', () => {
      const cider = createMockCider({ overallRating: 0 });
      const { getAllByTestId } = render(
        <CiderCard cider={cider} onPress={mockOnPress} />
      );

      const outlineStars = getAllByTestId(/star-outline/);
      expect(outlineStars).toHaveLength(5);
    });

    it('should display all filled stars for rating 10', () => {
      const cider = createMockCider({ overallRating: 10 });
      const { getAllByTestId } = render(
        <CiderCard cider={cider} onPress={mockOnPress} />
      );

      const filledStars = getAllByTestId(/star-filled/);
      expect(filledStars).toHaveLength(5);
    });

    it('should handle decimal ratings correctly', () => {
      // Rating 7.5 should show 3.75 stars, rounded down to 3 filled stars
      const cider = createMockCider({ overallRating: 7.5 });
      const { getAllByTestId } = render(
        <CiderCard cider={cider} onPress={mockOnPress} />
      );

      const filledStars = getAllByTestId(/star-filled/);
      const outlineStars = getAllByTestId(/star-outline/);

      expect(filledStars).toHaveLength(3);
      expect(outlineStars).toHaveLength(2);
    });

    it('should display star colors correctly', () => {
      const { getAllByTestId } = render(
        <CiderCard cider={mockCiderRecord} onPress={mockOnPress} />
      );

      const filledStars = getAllByTestId(/star-filled/);
      const outlineStars = getAllByTestId(/star-outline/);

      filledStars.forEach(star => {
        expect(star).toHaveProp('color', '#FFD700');
      });

      outlineStars.forEach(star => {
        expect(star).toHaveProp('color', '#DDD');
      });
    });
  });

  describe('User Interaction', () => {
    it('should call onPress when card is pressed', () => {
      const { getByText } = render(
        <CiderCard cider={mockCiderRecord} onPress={mockOnPress} />
      );

      fireEvent.press(getByText('Test Cider'));
      expect(mockOnPress).toHaveBeenCalledWith(mockCiderRecord);
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should not crash when onPress is not provided', () => {
      const { getByText } = render(
        <CiderCard cider={mockCiderRecord} />
      );

      expect(() => {
        fireEvent.press(getByText('Test Cider'));
      }).not.toThrow();
    });

    it('should have proper touch feedback', () => {
      const { getByText } = render(
        <CiderCard cider={mockCiderRecord} onPress={mockOnPress} />
      );

      const card = getByText('Test Cider').parent?.parent;
      expect(card).toHaveProp('activeOpacity', 0.7);
    });

    it('should be pressable throughout the entire card', () => {
      const { getByText } = render(
        <CiderCard cider={mockCiderRecord} onPress={mockOnPress} />
      );

      // Press on different parts of the card
      fireEvent.press(getByText('Test Cider')); // Name
      fireEvent.press(getByText('Test Brand')); // Brand
      fireEvent.press(getByText('5.5%')); // ABV

      expect(mockOnPress).toHaveBeenCalledTimes(3);
    });
  });

  describe('Text Truncation', () => {
    it('should truncate long cider names', () => {
      const { getByText } = render(
        <CiderCard cider={edgeCaseData.longName} onPress={mockOnPress} />
      );

      const nameElement = getByText(edgeCaseData.longName.name);
      expect(nameElement).toHaveProp('numberOfLines', 1);
    });

    it('should truncate long brand names', () => {
      const longBrandCider = createMockCider({
        brand: 'This is an extremely long brand name that should be truncated'
      });

      const { getByText } = render(
        <CiderCard cider={longBrandCider} onPress={mockOnPress} />
      );

      const brandElement = getByText(longBrandCider.brand);
      expect(brandElement).toHaveProp('numberOfLines', 1);
    });
  });

  describe('Data Display Formats', () => {
    it('should display ABV with one decimal place', () => {
      const cider = createMockCider({ abv: 4 });
      const { getByText } = render(
        <CiderCard cider={cider} onPress={mockOnPress} />
      );

      expect(getByText('4%')).toBeTruthy();
    });

    it('should display ABV with proper decimal formatting', () => {
      const cider = createMockCider({ abv: 4.75 });
      const { getByText } = render(
        <CiderCard cider={cider} onPress={mockOnPress} />
      );

      expect(getByText('4.75%')).toBeTruthy();
    });

    it('should display rating as X/10 format', () => {
      const cider = createMockCider({ overallRating: 6 });
      const { getByText } = render(
        <CiderCard cider={cider} onPress={mockOnPress} />
      );

      expect(getByText('6/10')).toBeTruthy();
    });

    it('should handle different date formats', () => {
      const recentDate = new Date('2024-12-25T14:30:00.000Z');
      const cider = createMockCider({ createdAt: recentDate });
      const { getByText } = render(
        <CiderCard cider={cider} onPress={mockOnPress} />
      );

      expect(getByText(`Added ${recentDate.toLocaleDateString()}`)).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum ABV correctly', () => {
      const { getByText } = render(
        <CiderCard cider={edgeCaseData.minAbv} onPress={mockOnPress} />
      );

      expect(getByText('0.1%')).toBeTruthy();
    });

    it('should handle maximum ABV correctly', () => {
      const { getByText } = render(
        <CiderCard cider={edgeCaseData.maxAbv} onPress={mockOnPress} />
      );

      expect(getByText('20%')).toBeTruthy();
    });

    it('should handle minimum rating correctly', () => {
      const { getByText, getAllByTestId } = render(
        <CiderCard cider={edgeCaseData.minRating} onPress={mockOnPress} />
      );

      expect(getByText('1/10')).toBeTruthy();

      // Should show 0.5 stars filled (1/10 * 5), rounded down to 0
      const outlineStars = getAllByTestId(/star-outline/);
      expect(outlineStars).toHaveLength(5);
    });

    it('should handle maximum rating correctly', () => {
      const { getByText, getAllByTestId } = render(
        <CiderCard cider={edgeCaseData.maxRating} onPress={mockOnPress} />
      );

      expect(getByText('10/10')).toBeTruthy();

      // Should show all 5 stars filled
      const filledStars = getAllByTestId(/star-filled/);
      expect(filledStars).toHaveLength(5);
    });

    it('should handle empty string names gracefully', () => {
      const emptyCider = createMockCider({ name: '', brand: '' });
      const { queryByText } = render(
        <CiderCard cider={emptyCider} onPress={mockOnPress} />
      );

      // Should still render empty strings
      expect(queryByText('')).toBeTruthy();
    });

    it('should handle special characters in names', () => {
      const specialCider = createMockCider({
        name: 'Café & Bar\'s "Special" Cider (100% Organic)',
        brand: 'Münchener Bräu & Co.'
      });

      const { getByText } = render(
        <CiderCard cider={specialCider} onPress={mockOnPress} />
      );

      expect(getByText('Café & Bar\'s "Special" Cider (100% Organic)')).toBeTruthy();
      expect(getByText('Münchener Bräu & Co.')).toBeTruthy();
    });

    it('should handle very old dates', () => {
      const oldDate = new Date('1900-01-01T00:00:00.000Z');
      const oldCider = createMockCider({ createdAt: oldDate });
      const { getByText } = render(
        <CiderCard cider={oldCider} onPress={mockOnPress} />
      );

      expect(getByText(`Added ${oldDate.toLocaleDateString()}`)).toBeTruthy();
    });

    it('should handle future dates', () => {
      const futureDate = new Date('2030-12-31T23:59:59.000Z');
      const futureCider = createMockCider({ createdAt: futureDate });
      const { getByText } = render(
        <CiderCard cider={futureCider} onPress={mockOnPress} />
      );

      expect(getByText(`Added ${futureDate.toLocaleDateString()}`)).toBeTruthy();
    });
  });

  describe('Styling and Layout', () => {
    it('should have proper card styling', () => {
      const { getByText } = render(
        <CiderCard cider={mockCiderRecord} onPress={mockOnPress} />
      );

      const card = getByText('Test Cider').parent?.parent;
      expect(card).toHaveStyle({
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
      });
    });

    it('should have proper shadow styling', () => {
      const { getByText } = render(
        <CiderCard cider={mockCiderRecord} onPress={mockOnPress} />
      );

      const card = getByText('Test Cider').parent?.parent;
      expect(card).toHaveStyle({
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      });
    });

    it('should have proper text styling', () => {
      const { getByText } = render(
        <CiderCard cider={mockCiderRecord} onPress={mockOnPress} />
      );

      const name = getByText('Test Cider');
      const brand = getByText('Test Brand');
      const date = getByText(`Added ${mockCiderRecord.createdAt.toLocaleDateString()}`);

      expect(name).toHaveStyle({
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
      });

      expect(brand).toHaveStyle({
        fontSize: 16,
        color: '#666',
      });

      expect(date).toHaveStyle({
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
      });
    });

    it('should have proper layout spacing', () => {
      const { getByText } = render(
        <CiderCard cider={mockCiderRecord} onPress={mockOnPress} />
      );

      const header = getByText('Test Cider').parent;
      const details = getByText('ABV:').parent?.parent;

      expect(header).toHaveStyle({ marginBottom: 12 });
      expect(details).toHaveStyle({ marginBottom: 12 });
    });
  });

  describe('Multiple Ciders Rendering', () => {
    it('should render multiple different ciders correctly', () => {
      const { getByText } = render(
        <>
          {mockCiderRecords.map(cider => (
            <CiderCard key={cider.id} cider={cider} onPress={mockOnPress} />
          ))}
        </>
      );

      // Verify all ciders are rendered
      expect(getByText('Scrumpy Jack Original')).toBeTruthy();
      expect(getByText('Strongbow Original')).toBeTruthy();
      expect(getByText('Old Mout Kiwi & Lime')).toBeTruthy();
      expect(getByText('Magners Original')).toBeTruthy();
      expect(getByText('Rekorderlig Strawberry & Lime')).toBeTruthy();
    });

    it('should handle pressing different ciders correctly', () => {
      const { getByText } = render(
        <>
          {mockCiderRecords.slice(0, 2).map(cider => (
            <CiderCard key={cider.id} cider={cider} onPress={mockOnPress} />
          ))}
        </>
      );

      fireEvent.press(getByText('Scrumpy Jack Original'));
      fireEvent.press(getByText('Strongbow Original'));

      expect(mockOnPress).toHaveBeenCalledTimes(2);
      expect(mockOnPress).toHaveBeenNthCalledWith(1, mockCiderRecords[0]);
      expect(mockOnPress).toHaveBeenNthCalledWith(2, mockCiderRecords[1]);
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', () => {
      const { getByText } = render(
        <CiderCard cider={mockCiderRecord} onPress={mockOnPress} />
      );

      const card = getByText('Test Cider').parent?.parent;
      expect(card).toHaveProp('accessible');
    });

    it('should have proper accessibility role', () => {
      const { getByText } = render(
        <CiderCard cider={mockCiderRecord} onPress={mockOnPress} />
      );

      const card = getByText('Test Cider').parent?.parent;
      expect(card).toHaveProp('accessibilityRole', 'button');
    });

    it('should provide meaningful accessibility label', () => {
      const { getByText } = render(
        <CiderCard cider={mockCiderRecord} onPress={mockOnPress} />
      );

      const card = getByText('Test Cider').parent?.parent;
      const expectedLabel = `${mockCiderRecord.name} by ${mockCiderRecord.brand}, ${mockCiderRecord.abv}% ABV, rated ${mockCiderRecord.overallRating} out of 10`;
      expect(card).toHaveProp('accessibilityLabel', expectedLabel);
    });
  });
});