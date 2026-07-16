// src/components/reviews/StarRating.tsx
import React from 'react';

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

const sizeMap = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
  xl: 'w-10 h-10',
};

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  max = 5,
  size = 'md',
  interactive = false,
  onChange,
  className = '',
}) => {
  const [hovered, setHovered] = React.useState(0);
  const displayRating = interactive && hovered > 0 ? hovered : rating;
  const starSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const fill =
          displayRating >= starValue
            ? 100
            : displayRating >= starValue - 0.5
            ? 50
            : 0;

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(starValue)}
            onMouseEnter={() => interactive && setHovered(starValue)}
            onMouseLeave={() => interactive && setHovered(0)}
            className={`relative ${starSize} ${
              interactive
                ? 'cursor-pointer hover:scale-110 transition-transform'
                : 'cursor-default'
            }`}
            aria-label={`${starValue} estrella${starValue > 1 ? 's' : ''}`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`absolute inset-0 ${starSize}`}
              fill="none"
            >
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                stroke="#d1d5db"
                strokeWidth="1.5"
                fill="#f3f4f6"
              />
            </svg>
            <svg
              viewBox="0 0 24 24"
              className={`absolute inset-0 ${starSize}`}
              style={{ clipPath: `inset(0 ${100 - fill}% 0 0)` }}
            >
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill="#f59e0b"
                stroke="#f59e0b"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;