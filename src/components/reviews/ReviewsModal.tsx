// src/components/reviews/ReviewsModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { ReviewsList } from './ReviewsList';
import { WriteReviewForm } from './WriteReviewForm';

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  storeId: string;
  productName: string;
  productImage?: string;
}

export const ReviewsModal: React.FC<ReviewsModalProps> = ({
  isOpen,
  onClose,
  productId,
  storeId,
  productName,
  productImage,
}) => {
  const [showForm, setShowForm] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setShowForm(false);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-9999 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col rounded-t-2xl">
        <div className="flex items-center gap-3 p-5 border-b border-gray-100 shrink-0">
          {productImage && (
            <img
              src={productImage}
              alt={productName}
              className="w-12 h-12 object-cover rounded-xl border border-gray-100"
            />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-800 truncate">
              {showForm ? '✍️ Escribir reseña' : '⭐ Reseñas'}
            </h2>
            <p className="text-sm text-gray-500 truncate">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {showForm ? (
            <WriteReviewForm
              productId={productId}
              storeId={storeId}
              productName={productName}
              onSuccess={() => setShowForm(false)}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <ReviewsList
              productId={productId}
              storeId={storeId}
              onWriteReview={() => setShowForm(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewsModal;