// src/components/reviews/WriteReviewForm.tsx
import React, { useState } from 'react';
import { StarRating } from './StarRating';
import { submitReview, type WriteReviewPayload } from '../../lib/reviews';
import { useToast } from '../../contexts/ToastContext';

interface WriteReviewFormProps {
  productId: string;
  storeId: string;
  productName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const MIN_COMMENT_LENGTH = 20;
const MAX_COMMENT_LENGTH = 500;

export const WriteReviewForm: React.FC<WriteReviewFormProps> = ({
  productId,
  storeId,
  productName,
  onSuccess,
  onCancel,
}) => {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const commentLen = comment.trim().length;
  const isValid =
    rating > 0 &&
    name.trim().length >= 2 &&
    email.includes('@') &&
    commentLen >= MIN_COMMENT_LENGTH;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    const payload: WriteReviewPayload = {
      product_id: productId,
      store_id: storeId,
      reviewer_name: name,
      reviewer_email: email,
      rating,
      title: title || undefined,
      comment,
    };

    const result = await submitReview(payload);
    setLoading(false);

    if (result.success) {
      setSubmitted(true);
      toast.success('¡Reseña enviada!', 'Será publicada tras revisión. 🎉');
      setTimeout(() => onSuccess?.(), 2000);
    } else {
      toast.error('Error', result.error || 'No se pudo enviar la reseña');
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-10">
        <div className="text-5xl mb-3">🎉</div>
        <h3 className="text-lg font-bold text-gray-800 mb-1">
          ¡Gracias por tu reseña!
        </h3>
        <p className="text-gray-500 text-sm">
          Será revisada y publicada pronto.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
        📦 Reseñando: <strong className="text-gray-800">{productName}</strong>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          ⭐ Calificación <span className="text-red-500">*</span>
        </label>
        <StarRating rating={rating} size="xl" interactive onChange={setRating} />
        {rating > 0 && (
          <p className="text-sm text-amber-600 mt-1">
            {['', '😞 Muy malo', '😕 Malo', '😐 Regular', '😊 Bueno', '🤩 ¡Excelente!'][rating]}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            👤 Tu nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: María García"
            minLength={2}
            maxLength={60}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            📧 Tu email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
          <p className="text-xs text-gray-400 mt-1">
            No se muestra públicamente
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          📝 Título (opcional)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Excelente producto, lo recomiendo"
          maxLength={100}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          💬 Tu opinión <span className="text-red-500">*</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={MAX_COMMENT_LENGTH}
          placeholder="Cuéntanos tu experiencia con el producto. ¿Qué te gustó? ¿Qué mejorarías?"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
        />
        <div className="flex items-center justify-between mt-1">
          <div className="flex-1 bg-gray-100 rounded-full h-1 mr-3 overflow-hidden">
            <div
              className={`h-1 rounded-full transition-all duration-300 ${
                commentLen < MIN_COMMENT_LENGTH
                  ? 'bg-red-400'
                  : commentLen < 100
                  ? 'bg-amber-400'
                  : 'bg-green-400'
              }`}
              style={{
                width: `${Math.min((commentLen / MAX_COMMENT_LENGTH) * 100, 100)}%`,
              }}
            />
          </div>
          <span
            className={`text-xs ${
              commentLen < MIN_COMMENT_LENGTH ? 'text-red-400' : 'text-gray-400'
            }`}
          >
            {commentLen}/{MAX_COMMENT_LENGTH}
          </span>
        </div>
        {commentLen > 0 && commentLen < MIN_COMMENT_LENGTH && (
          <p className="text-xs text-red-400 mt-1">
            Mínimo {MIN_COMMENT_LENGTH} caracteres (
            {MIN_COMMENT_LENGTH - commentLen} faltan)
          </p>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
        ℹ️ Tu reseña será revisada antes de publicarse. No incluyas links, emails ni datos personales en tu opinión.
      </div>

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={!isValid || loading}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
            isValid && !loading
              ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-md hover:shadow-lg'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Enviando...
            </span>
          ) : (
            '⭐ Enviar reseña'
          )}
        </button>
      </div>
    </form>
  );
};

export default WriteReviewForm;