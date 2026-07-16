// src/pages/vendor/VendorReviewsPage.tsx
import { useEffect, useState, useCallback, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import {
  getStoreReviews,
  approveReview,
  rejectReview,
  deleteReview,
  getStoreReviewStats,
  type ProductReview,
  type StoreReviewStats,
} from '../../lib/reviews';
import { ReviewCard } from '../../components/reviews/ReviewCard';

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

export default function VendorReviewsPage() {
  // 👇 Usamos el context directamente
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;

  const toast = useToast();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [stats, setStats] = useState<StoreReviewStats | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Cargar tienda del vendor
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setStoreId(data.id);
      });
  }, [user]);

  const loadReviews = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [reviewsData, statsData] = await Promise.all([
        getStoreReviews(storeId, activeTab === 'all' ? undefined : activeTab),
        getStoreReviewStats(storeId),
      ]);
      setReviews(reviewsData);
      setStats(statsData);
    } catch (err) {
      console.error(err);
      toast.error('Error', 'No se pudieron cargar las reseñas');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, activeTab]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  async function handleApprove(id: string) {
    setActionLoading(id);
    try {
      await approveReview(id);
      toast.success('Reseña aprobada', 'Ya es visible en tu tienda ✅');
      loadReviews();
    } catch {
      toast.error('Error', 'No se pudo aprobar la reseña');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(id: string) {
    setActionLoading(id);
    try {
      await rejectReview(id);
      toast.warning('Reseña rechazada', 'No será visible para el público');
      loadReviews();
    } catch {
      toast.error('Error', 'No se pudo rechazar la reseña');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      '¿Eliminar esta reseña permanentemente? Esta acción no se puede deshacer.'
    );
    if (!confirmed) return;

    setActionLoading(id);
    try {
      await deleteReview(id);
      toast.info('Reseña eliminada');
      loadReviews();
    } catch {
      toast.error('Error', 'No se pudo eliminar la reseña');
    } finally {
      setActionLoading(null);
    }
  }

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'all', label: '📋 Todas', count: stats?.total },
    { key: 'pending', label: '⏳ Pendientes', count: stats?.pending },
    { key: 'approved', label: '✅ Aprobadas', count: stats?.approved },
    { key: 'rejected', label: '❌ Rechazadas', count: stats?.rejected },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">⭐ Reseñas</h1>
        <p className="text-gray-500 text-sm mt-1">
          Modera las opiniones de tus clientes
        </p>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
            <div className="text-xs text-gray-500 mt-1">Total</div>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 shadow-sm text-center">
            <div className="text-2xl font-bold text-amber-600">
              {stats.pending}
            </div>
            <div className="text-xs text-amber-500 mt-1">Pendientes</div>
          </div>
          <div className="bg-green-50 rounded-2xl p-4 border border-green-100 shadow-sm text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.approved}
            </div>
            <div className="text-xs text-green-500 mt-1">Aprobadas</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl font-bold text-gray-800">
                {stats.avg_rating > 0 ? stats.avg_rating.toFixed(1) : '—'}
              </span>
              {stats.avg_rating > 0 && (
                <span className="text-amber-400">⭐</span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">Promedio</div>
          </div>
        </div>
      )}

      {/* Alerta pendientes */}
      {stats && stats.pending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">⏳</span>
          <div>
            <p className="font-semibold text-amber-800">
              {stats.pending} reseña{stats.pending !== 1 ? 's' : ''} pendiente
              {stats.pending !== 1 ? 's' : ''} de revisión
            </p>
            <p className="text-sm text-amber-600">
              Revísalas y apruébalas o recházalas para mantener la calidad de tu tienda.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === tab.key
                ? 'bg-rose-500 text-white shadow-md'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-rose-300'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-gray-100 rounded-xl h-40 animate-pulse"
            />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">
            {activeTab === 'pending' ? '🎉' : '💬'}
          </div>
          <p className="text-gray-500 font-medium">
            {activeTab === 'pending'
              ? '¡Sin pendientes! Todo al día.'
              : 'No hay reseñas en esta categoría.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className={`transition-opacity ${
                actionLoading === review.id
                  ? 'opacity-50 pointer-events-none'
                  : ''
              }`}
            >
              <ReviewCard
                review={review}
                showActions
                onApprove={handleApprove}
                onReject={handleReject}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}

      {/* Info política */}
      <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-600">📋 Política de moderación</p>
        <p>
          • Las reseñas <strong>pendientes</strong> no son visibles para el público.
        </p>
        <p>
          • Al <strong>aprobar</strong> una reseña, se publica y afecta el promedio del producto.
        </p>
        <p>
          • Al <strong>rechazar</strong>, se oculta pero puedes revertirlo aprobándola después.
        </p>
        <p>
          • Al <strong>eliminar</strong>, se borra permanentemente.
        </p>
      </div>
    </div>
  );
}