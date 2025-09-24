import React from 'react';
import { render, fireEvent } from '../../../__tests__/utils/testUtils';
import RatingInput from '../RatingInput';

describe('RatingInput Component', () => {
  const mockOnRatingChange = jest.fn();
  const defaultProps = {
    rating: 5,
    onRatingChange: mockOnRatingChange,
  };

  beforeEach(() => {
    mockOnRatingChange.mockClear();
  });

  describe('Basic Functionality', () => {
    it('should render with correct number of stars (default 10)', () => {
      const { getAllByTestId } = render(<RatingInput {...defaultProps} />);

      const stars = getAllByTestId(/star-/);
      expect(stars).toHaveLength(10);
    });

    it('should render with custom maxRating', () => {
      const { getAllByTestId } = render(
        <RatingInput {...defaultProps} maxRating={5} />
      );

      const stars = getAllByTestId(/star-/);
      expect(stars).toHaveLength(5);
    });

    it('should display current rating correctly', () => {
      const { getByText } = render(<RatingInput {...defaultProps} rating={7} />);

      expect(getByText('7/10')).toBeTruthy();
    });

    it('should display custom maxRating in text', () => {
      const { getByText } = render(
        <RatingInput {...defaultProps} rating={3} maxRating={5} />
      );

      expect(getByText('3/5')).toBeTruthy();
    });
  });

  describe('Star Display', () => {
    it('should show filled stars for current rating', () => {
      const { getAllByTestId } = render(
        <RatingInput {...defaultProps} rating={6} maxRating={10} />
      );

      // First 6 stars should be filled
      for (let i = 1; i <= 6; i++) {
        const star = getAllByTestId(`star-${i}`)[0];
        expect(star).toHaveProp('name', 'star');
      }

      // Remaining stars should be outline
      for (let i = 7; i <= 10; i++) {
        const star = getAllByTestId(`star-${i}`)[0];
        expect(star).toHaveProp('name', 'star-outline');
      }
    });

    it('should show correct colors for filled and outline stars', () => {
      const { getAllByTestId } = render(
        <RatingInput {...defaultProps} rating={3} maxRating={5} />
      );

      // First 3 stars should be gold
      for (let i = 1; i <= 3; i++) {
        const star = getAllByTestId(`star-${i}`)[0];
        expect(star).toHaveProp('color', '#FFD700');
      }

      // Remaining stars should be gray
      for (let i = 4; i <= 5; i++) {
        const star = getAllByTestId(`star-${i}`)[0];
        expect(star).toHaveProp('color', '#DDD');
      }
    });

    it('should handle zero rating', () => {
      const { getAllByTestId } = render(
        <RatingInput {...defaultProps} rating={0} maxRating={5} />
      );

      // All stars should be outline
      for (let i = 1; i <= 5; i++) {
        const star = getAllByTestId(`star-${i}`)[0];
        expect(star).toHaveProp('name', 'star-outline');
        expect(star).toHaveProp('color', '#DDD');
      }
    });

    it('should handle maximum rating', () => {
      const { getAllByTestId } = render(
        <RatingInput {...defaultProps} rating={5} maxRating={5} />
      );

      // All stars should be filled
      for (let i = 1; i <= 5; i++) {
        const star = getAllByTestId(`star-${i}`)[0];
        expect(star).toHaveProp('name', 'star');
        expect(star).toHaveProp('color', '#FFD700');
      }
    });
  });

  describe('User Interaction', () => {
    it('should call onRatingChange when star is pressed', () => {
      const { getAllByTestId } = render(<RatingInput {...defaultProps} />);

      const thirdStar = getAllByTestId('star-3')[0];
      fireEvent.press(thirdStar);

      expect(mockOnRatingChange).toHaveBeenCalledWith(3);
      expect(mockOnRatingChange).toHaveBeenCalledTimes(1);
    });

    it('should handle pressing different stars', () => {
      const { getAllByTestId } = render(<RatingInput {...defaultProps} />);

      const firstStar = getAllByTestId('star-1')[0];
      const lastStar = getAllByTestId('star-10')[0];

      fireEvent.press(firstStar);
      expect(mockOnRatingChange).toHaveBeenCalledWith(1);

      fireEvent.press(lastStar);
      expect(mockOnRatingChange).toHaveBeenCalledWith(10);

      expect(mockOnRatingChange).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid star presses', () => {
      const { getAllByTestId } = render(<RatingInput {...defaultProps} />);

      const stars = getAllByTestId(/star-/);

      // Press multiple stars quickly
      fireEvent.press(stars[0]); // star 1
      fireEvent.press(stars[4]); // star 5
      fireEvent.press(stars[8]); // star 9

      expect(mockOnRatingChange).toHaveBeenCalledTimes(3);
      expect(mockOnRatingChange).toHaveBeenNthCalledWith(1, 1);
      expect(mockOnRatingChange).toHaveBeenNthCalledWith(2, 5);
      expect(mockOnRatingChange).toHaveBeenNthCalledWith(3, 9);
    });

    it('should have proper touch area (hitSlop)', () => {
      const { getAllByTestId } = render(<RatingInput {...defaultProps} />);

      const star = getAllByTestId('star-1')[0];
      const touchableOpacity = star.parent;

      expect(touchableOpacity).toHaveProp('hitSlop', {
        top: 10,
        bottom: 10,
        left: 5,
        right: 5,
      });
    });
  });

  describe('Label Display', () => {
    it('should show label when provided', () => {
      const { getByText } = render(
        <RatingInput {...defaultProps} label="Rate this cider" />
      );

      expect(getByText('Rate this cider')).toBeTruthy();
    });

    it('should not show label when not provided', () => {
      const { queryByText } = render(<RatingInput {...defaultProps} />);

      expect(queryByText('Rate this cider')).toBeNull();
    });

    it('should style label correctly', () => {
      const { getByText } = render(
        <RatingInput {...defaultProps} label="Test Label" />
      );

      const label = getByText('Test Label');
      expect(label).toHaveStyle({
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 8,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rating higher than maxRating', () => {
      const { getAllByTestId, getByText } = render(
        <RatingInput rating={15} onRatingChange={mockOnRatingChange} maxRating={10} />
      );

      // Should still render 10 stars
      const stars = getAllByTestId(/star-/);
      expect(stars).toHaveLength(10);

      // All stars should be filled (15 > 10, so all 10 stars are filled)
      stars.forEach((star) => {
        expect(star).toHaveProp('name', 'star');
        expect(star).toHaveProp('color', '#FFD700');
      });

      // Should display the actual rating value
      expect(getByText('15/10')).toBeTruthy();
    });

    it('should handle negative rating', () => {
      const { getAllByTestId, getByText } = render(
        <RatingInput rating={-5} onRatingChange={mockOnRatingChange} maxRating={10} />
      );

      // All stars should be outline (negative rating means no stars filled)
      const stars = getAllByTestId(/star-/);
      stars.forEach((star) => {
        expect(star).toHaveProp('name', 'star-outline');
        expect(star).toHaveProp('color', '#DDD');
      });

      // Should display the actual rating value
      expect(getByText('-5/10')).toBeTruthy();
    });

    it('should handle decimal ratings', () => {
      const { getAllByTestId, getByText } = render(
        <RatingInput rating={3.7} onRatingChange={mockOnRatingChange} maxRating={5} />
      );

      // Should fill stars based on integer part (3 stars filled)
      const stars = getAllByTestId(/star-/);

      for (let i = 0; i < 3; i++) {
        expect(stars[i]).toHaveProp('name', 'star');
        expect(stars[i]).toHaveProp('color', '#FFD700');
      }

      for (let i = 3; i < 5; i++) {
        expect(stars[i]).toHaveProp('name', 'star-outline');
        expect(stars[i]).toHaveProp('color', '#DDD');
      }

      // Should display the actual decimal rating
      expect(getByText('3.7/5')).toBeTruthy();
    });

    it('should handle very large maxRating', () => {
      const { getAllByTestId } = render(
        <RatingInput rating={50} onRatingChange={mockOnRatingChange} maxRating={100} />
      );

      const stars = getAllByTestId(/star-/);
      expect(stars).toHaveLength(100);
    });

    it('should handle maxRating of 1', () => {
      const { getAllByTestId, getByText } = render(
        <RatingInput rating={1} onRatingChange={mockOnRatingChange} maxRating={1} />
      );

      const stars = getAllByTestId(/star-/);
      expect(stars).toHaveLength(1);
      expect(getByText('1/1')).toBeTruthy();
    });

    it('should handle maxRating of 0', () => {
      const { getAllByTestId } = render(
        <RatingInput rating={0} onRatingChange={mockOnRatingChange} maxRating={0} />
      );

      const stars = getAllByTestId(/star-/);
      expect(stars).toHaveLength(0);
    });
  });

  describe('Styling and Layout', () => {
    it('should have proper container layout', () => {
      const { getByText } = render(
        <RatingInput {...defaultProps} label="Test" />
      );

      const container = getByText('Test').parent;
      expect(container).toHaveStyle({ marginBottom: 16 });
    });

    it('should have proper stars container layout', () => {
      const { getByText } = render(
        <RatingInput {...defaultProps} rating={5} />
      );

      const starsContainer = getByText('5/10').parent;
      expect(starsContainer).toHaveStyle({
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
      });
    });

    it('should have proper star spacing', () => {
      const { getAllByTestId } = render(<RatingInput {...defaultProps} />);

      const firstStar = getAllByTestId('star-1')[0];
      const starContainer = firstStar.parent;

      expect(starContainer).toHaveStyle({ marginRight: 4 });
    });

    it('should have proper rating text styling', () => {
      const { getByText } = render(<RatingInput {...defaultProps} rating={7} />);

      const ratingText = getByText('7/10');
      expect(ratingText).toHaveStyle({
        marginLeft: 12,
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
      });
    });

    it('should have proper star size', () => {
      const { getAllByTestId } = render(<RatingInput {...defaultProps} />);

      const star = getAllByTestId('star-1')[0];
      expect(star).toHaveProp('size', 24);
    });
  });
});