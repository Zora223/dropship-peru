// src/lib/reviews.ts
import { supabase } from './supabase';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface ProductReview {
  id: string;
  product_id: string;
  store_id: string;
  order_id?: string | null;
  customer_name: string;
  customer_email?: string | null;
  customer_user_id?: string | null;
  rating: number;
  title?: string | null;
  comment?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  is_approved: boolean;
  is_verified_purchase: boolean;
  helpful_count: number;
  ip_hash?: string | null;
  created_at: string;
  updated_at: string;
  product_name?: string;
  product_images?: string[];
}

export interface ReviewStats {
  avg_rating: number;
  review_count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface WriteReviewPayload {
  product_id: string;
  store_id: string;
  reviewer_name: string;
  reviewer_email: string;
  rating: number;
  title?: string;
  comment: string;
}

export interface StoreReviewStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  avg_rating: number;
}

// ─────────────────────────────────────────────
// ANTI-SPAM
// ─────────────────────────────────────────────

const BLOCKED_WORDS = ['spam', 'fraude', 'estafa', 'scam', 'fake'];

const BLOCKED_PATTERNS = [
  /https?:\/\//i,
  /www\./i,
  /\b\d{9,}\b/,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
];

function containsSpam(text: string): boolean {
  const lower = text.toLowerCase();
  if (BLOCKED_WORDS.some((w) => lower.includes(w))) return true;
  if (BLOCKED_PATTERNS.some((p) => p.test(text))) return true;
  return false;
}

// ─────────────────────────────────────────────
// LEER RESEÑAS PÚBLICAS
// ─────────────────────────────────────────────

export async function getProductReviews(
  productId: string,
  filterRating?: number
): Promise<ProductReview[]> {
  let query = supabase
    .from('product_reviews')
    .select('*')
    .eq('product_id', productId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (filterRating) {
    query = query.eq('rating', filterRating);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as ProductReview[];
}

export async function getProductReviewStats(
  productId: string
): Promise<ReviewStats> {
  const { data, error } = await supabase
    .from('product_reviews')
    .select('rating')
    .eq('product_id', productId)
    .eq('status', 'approved');

  if (error) throw error;

  const reviews = data || [];
  const count = reviews.length;

  if (count === 0) {
    return {
      avg_rating: 0,
      review_count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<
    1 | 2 | 3 | 4 | 5,
    number
  >;
  let total = 0;

  reviews.forEach((r) => {
    const rating = r.rating as 1 | 2 | 3 | 4 | 5;
    distribution[rating] = (distribution[rating] || 0) + 1;
    total += r.rating;
  });

  return {
    avg_rating: Math.round((total / count) * 10) / 10,
    review_count: count,
    distribution,
  };
}

// ─────────────────────────────────────────────
// ESCRIBIR RESEÑA
// ─────────────────────────────────────────────

export async function submitReview(
  payload: WriteReviewPayload
): Promise<{ success: boolean; error?: string }> {
  if (containsSpam(payload.comment)) {
    return {
      success: false,
      error:
        'Tu reseña contiene contenido no permitido (links, emails o palabras prohibidas).',
    };
  }
  if (payload.title && containsSpam(payload.title)) {
    return { success: false, error: 'El título contiene contenido no permitido.' };
  }

  // Rate limit
  const { data: existing } = await supabase
    .from('product_reviews')
    .select('id')
    .eq('product_id', payload.product_id)
    .eq('customer_email', payload.reviewer_email.toLowerCase())
    .maybeSingle();

  if (existing) {
    return { success: false, error: 'Ya escribiste una reseña para este producto.' };
  }

  // Verificar compra
  let verifiedPurchase = false;
  try {
    const { data: verifiedData } = await supabase.rpc('is_verified_purchase', {
      p_email: payload.reviewer_email.toLowerCase(),
      p_product_id: payload.product_id,
    });
    verifiedPurchase = verifiedData === true;
  } catch {
    verifiedPurchase = false;
  }

  const { error } = await supabase.from('product_reviews').insert({
    product_id: payload.product_id,
    store_id: payload.store_id,
    customer_name: payload.reviewer_name.trim(),
    customer_email: payload.reviewer_email.toLowerCase().trim(),
    rating: payload.rating,
    title: payload.title?.trim() || null,
    comment: payload.comment.trim(),
    status: 'pending',
    is_approved: false,
    is_verified_purchase: verifiedPurchase,
    helpful_count: 0,
  });

  if (error) {
    console.error('Error al enviar reseña:', error);
    return { success: false, error: 'Error al enviar la reseña. Intenta nuevamente.' };
  }

  return { success: true };
}

// ─────────────────────────────────────────────
// VOTOS ÚTIL
// ─────────────────────────────────────────────

function getBrowserFingerprint(): string {
  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
  ].join('|');

  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export async function voteHelpful(
  reviewId: string
): Promise<{ success: boolean; error?: string }> {
  const fingerprint = getBrowserFingerprint();
  const voteKey = `helpful_${reviewId}`;

  if (localStorage.getItem(voteKey)) {
    return { success: false, error: 'Ya marcaste esta reseña como útil.' };
  }

  const { error } = await supabase.from('review_helpful_votes').insert({
    review_id: reviewId,
    voter_fingerprint: fingerprint,
  });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Ya votaste por esta reseña.' };
    }
    return { success: false, error: 'Error al registrar tu voto.' };
  }

  try {
    await supabase.rpc('increment_helpful_count', { review_id: reviewId });
  } catch {
    const { data } = await supabase
      .from('product_reviews')
      .select('helpful_count')
      .eq('id', reviewId)
      .maybeSingle();
    if (data) {
      await supabase
        .from('product_reviews')
        .update({ helpful_count: (data.helpful_count || 0) + 1 })
        .eq('id', reviewId);
    }
  }

  localStorage.setItem(voteKey, '1');
  return { success: true };
}

// ─────────────────────────────────────────────
// MODERACIÓN (vendor/admin)
// ─────────────────────────────────────────────

export async function getStoreReviews(
  storeId: string,
  status?: 'pending' | 'approved' | 'rejected'
): Promise<ProductReview[]> {
  let query = supabase
    .from('product_reviews')
    .select(
      `
      *,
      products!inner(name, images)
    `
    )
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((r: any) => ({
    ...r,
    product_name: r.products?.name,
    product_images: r.products?.images,
  })) as ProductReview[];
}

export async function approveReview(reviewId: string): Promise<void> {
  const { error } = await supabase
    .from('product_reviews')
    .update({
      status: 'approved',
      is_approved: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId);
  if (error) throw error;
}

export async function rejectReview(reviewId: string): Promise<void> {
  const { error } = await supabase
    .from('product_reviews')
    .update({
      status: 'rejected',
      is_approved: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId);
  if (error) throw error;
}

export async function deleteReview(reviewId: string): Promise<void> {
  const { error } = await supabase
    .from('product_reviews')
    .delete()
    .eq('id', reviewId);
  if (error) throw error;
}

export async function getStoreReviewStats(
  storeId: string
): Promise<StoreReviewStats> {
  const { data, error } = await supabase
    .from('product_reviews')
    .select('status, rating')
    .eq('store_id', storeId);

  if (error) throw error;

  const reviews = data || [];
  const pending = reviews.filter((r) => r.status === 'pending').length;
  const approved = reviews.filter((r) => r.status === 'approved').length;
  const rejected = reviews.filter((r) => r.status === 'rejected').length;
  const approvedRatings = reviews.filter((r) => r.status === 'approved');
  const avg =
    approvedRatings.length > 0
      ? approvedRatings.reduce((sum, r) => sum + r.rating, 0) /
        approvedRatings.length
      : 0;

  return {
    total: reviews.length,
    pending,
    approved,
    rejected,
    avg_rating: Math.round(avg * 10) / 10,
  };
}