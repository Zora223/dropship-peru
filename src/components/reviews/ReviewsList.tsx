// src/components/reviews/ReviewsList.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { StarRating } from './StarRating';
import { ReviewCard } from './ReviewCard';
import {
  getProductReviews,
  getProductReviewStats,
  type ProductReview,
  type ReviewStats,
} from '../../lib/reviews';

interface ReviewsListProps {
  productId: string;
  storeId: string;
  onWriteReview?: () => void;
}

export const ReviewsList: React.FC<ReviewsListProps> = ({
  productId,
  onWriteReview,
}) => {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [filterRating, setFilterRating] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reviewsData, statsData] = await Promise.all([
        getProductReviews(productId, filterRating),
        getProductReviewStats(productId),
      ]);
      setReviews(reviewsData);
      setStats(statsData);
    } catch (err) {
      console.error('Error cargando reseñas:', err);
    } finally {
      setLoading(false);
    }
  }, [productId, filterRating]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-100 rounded-xl h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {stats && stats.review_count > 0 && (
        <div className="bg-linear-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-amber-500">
                {stats.avg_rating.toFixed(1)}
              </div>
              <StarRating
                rating={stats.avg_rating}
                size="md"
                className="justify-center mt-1"
              />
              <div className="text-sm text-gray-500 mt-1">
                {stats.review_count} reseña
                {stats.review_count !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="flex-1 w-full space-y-1.5">
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const count = stats.distribution[star] || 0;
                const pct =
                  stats.review_count > 0
                    ? Math.round((count / stats.review_count) * 100)
                    : 0;

                return (
                  <button
                    key={star}
                    onClick={() =>
                      setFilterRating(filterRating === star ? undefined : star)
                    }
                    className={`w-full flex items-center gap-2 group hover:bg-amber-100 rounded-lg p-1 transition-colors ${
                      filterRating === star ? 'bg-amber-100' : ''
                    }`}
                  >
                    <span className="text-xs text-gray-600 w-4 text-right">
                      {star}
                    </span>
                    <span className="text-amber-400 text-xs">⭐</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">
                      {pct}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {filterRating && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="text-sm text-amber-700">
                Mostrando reseñas de {filterRating} ⭐
              </span>
              <button
                onClick={() => setFilterRating(undefined)}
                className="text-xs text-amber-600 underline hover:no-underline"
              >
                Ver todas
              </button>
            </div>
          )}
        </div>
      )}

      {onWriteReview && (
        <button
          onClick={onWriteReview}
          className="w-full py-3 border-2 border-dashed border-rose-200 rounded-xl text-rose-500 hover:border-rose-400 hover:bg-rose-50 transition-all font-medium text-sm"
        >
          ✍️ Escribir una reseña
        </button>
      )}

      {reviews.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <div className="text-4xl mb-2">💬</div>
          <p className="font-medium">
            {filterRating
              ? `No hay reseñas de ${filterRating} ⭐`
              : 'Aún no hay reseñas'}
          </p>
          {!filterRating && onWriteReview && (
            <p className="text-sm mt-1">¡Sé el primero en opinar!</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} onVote={loadData} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewsList;