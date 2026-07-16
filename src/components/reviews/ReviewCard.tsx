// src/components/reviews/ReviewCard.tsx
import React, { useState } from 'react';
import { StarRating } from './StarRating';
import { voteHelpful, type ProductReview } from '../../lib/reviews';
import { useToast } from '../../contexts/ToastContext';

interface ReviewCardProps {
  review: ProductReview;
  onVote?: () => void;
  showActions?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onDelete?: (id: string) => void;
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-rose-500', 'bg-pink-500', 'bg-purple-500', 'bg-indigo-500',
    'bg-blue-500', 'bg-cyan-500', 'bg-teal-500', 'bg-green-500',
    'bg-amber-500', 'bg-orange-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const masked = local.slice(0, 2) + '***';
  return `${masked}@${domain}`;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  onVote,
  showActions = false,
  onApprove,
  onReject,
  onDelete,
}) => {
  const toast = useToast();
  const [votingLoading, setVotingLoading] = useState(false);
  const [localHelpful, setLocalHelpful] = useState(review.helpful_count);
  const alreadyVoted = !!localStorage.getItem(`helpful_${review.id}`);

  const displayName = review.customer_name || 'Anónimo';
  const avatarColor = getAvatarColor(displayName);
  const initial = displayName.charAt(0).toUpperCase();

  async function handleVote() {
    if (alreadyVoted) {
      toast.info('Ya marcaste esta reseña como útil');
      return;
    }
    setVotingLoading(true);
    const result = await voteHelpful(review.id);
    setVotingLoading(false);

    if (result.success) {
      setLocalHelpful((prev) => prev + 1);
      toast.success('¡Gracias por tu voto! 👍');
      onVote?.();
    } else {
      toast.error(result.error || 'Error al votar');
    }
  }

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  const statusLabels = {
    pending: '⏳ Pendiente',
    approved: '✅ Aprobada',
    rejected: '❌ Rechazada',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-white font-bold text-sm shrink-0`}
          >
            {initial}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-800 text-sm">
                {displayName}
              </span>
              {review.is_verified_purchase && (
                <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Compra verificada
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <StarRating rating={review.rating} size="xs" />
              <span className="text-xs text-gray-400">
                {formatDate(review.created_at)}
              </span>
            </div>
          </div>
        </div>

        {showActions && (
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[review.status]}`}
          >
            {statusLabels[review.status]}
          </span>
        )}
      </div>

      {showActions && review.product_name && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded-lg">
          {review.product_images?.[0] && (
            <img
              src={review.product_images[0]}
              alt={review.product_name}
              className="w-8 h-8 object-cover rounded"
            />
          )}
          <span className="text-xs text-gray-600 font-medium">
            📦 {review.product_name}
          </span>
        </div>
      )}

      {review.title && (
        <h4 className="font-semibold text-gray-800 text-sm mb-1">
          {review.title}
        </h4>
      )}

      <p className="text-gray-600 text-sm leading-relaxed mb-3">
        {review.comment || <em className="text-gray-400">Sin comentario</em>}
      </p>

      <div className="flex items-center justify-between flex-wrap gap-2">
        {!showActions && (
          <button
            onClick={handleVote}
            disabled={votingLoading || alreadyVoted}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
              alreadyVoted
                ? 'border-rose-200 bg-rose-50 text-rose-500 cursor-default'
                : 'border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50'
            }`}
          >
            <span>👍</span>
            <span>Útil ({localHelpful})</span>
          </button>
        )}

        {showActions && review.customer_email && (
          <span className="text-xs text-gray-400">
            {maskEmail(review.customer_email)}
          </span>
        )}

        {showActions && (
          <div className="flex items-center gap-2 flex-wrap">
            {review.status !== 'approved' && (
              <button
                onClick={() => onApprove?.(review.id)}
                className="text-xs px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
              >
                ✅ Aprobar
              </button>
            )}
            {review.status !== 'rejected' && (
              <button
                onClick={() => onReject?.(review.id)}
                className="text-xs px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors font-medium"
              >
                ⚠️ Rechazar
              </button>
            )}
            <button
              onClick={() => onDelete?.(review.id)}
              className="text-xs px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
            >
              🗑️ Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewCard;