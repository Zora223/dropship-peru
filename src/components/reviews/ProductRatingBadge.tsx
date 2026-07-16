// src/components/reviews/ProductRatingBadge.tsx
import React from 'react';
import { StarRating } from './StarRating';

interface ProductRatingBadgeProps {
  avgRating: number;
  reviewCount: number;
  size?: 'sm' | 'md';
  showCount?: boolean;
  className?: string;
}

export const ProductRatingBadge: React.FC<ProductRatingBadgeProps> = ({
  avgRating,
  reviewCount,
  size = 'sm',
  showCount = true,
  className = '',
}) => {
  if (reviewCount === 0) return null;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <StarRating rating={avgRating} size={size === 'sm' ? 'xs' : 'sm'} />
      <span
        className={`text-amber-600 font-semibold ${
          size === 'sm' ? 'text-xs' : 'text-sm'
        }`}
      >
        {avgRating.toFixed(1)}
      </span>
      {showCount && (
        <span
          className={`text-gray-400 ${
            size === 'sm' ? 'text-xs' : 'text-sm'
          }`}
        >
          ({reviewCount})
        </span>
      )}
    </div>
  );
};

export default ProductRatingBadge;