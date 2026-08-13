// ============================================================
// SUPPLIER PRODUCTS PAGE — Panel de productos del proveedor
// v22.7 — Botones "Marcar Agotado" y "Reponer Stock" + Sync automático
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../contexts/ToastContext";
import { getMySupplierProfile } from "../../lib/suppliers";
import {
  listSupplierProducts,
  calculateStats,
  deleteProduct,
  toggleActive,
  markAsOutOfStock,
  restoreStock,
  type SupplierProduct,
} from "../../lib/supplier-products";
import ProductFormModal from "../../components/supplier/ProductFormModal";

export default function SupplierProductsPage() {
  const toast = useToast();

  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive" | "out_of_stock">("all");

  // Modal formulario
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SupplierProduct | null>(null);

  // 🆕 Modal reponer stock
  const [restockModal, setRestockModal] = useState<SupplierProduct | null>(null);
  const [restockAmount, setRestockAmount] = useState("");
  const [restocking, setRestocking] = useState(false);

  // 🆕 Loading state para "Marcar agotado"
  const [markingOutOfStock, setMarkingOutOfStock] = useState<string | null>(null);

  // Cargar datos
  async function loadData() {
    try {
      setLoading(true);

      const profile = await getMySupplierProfile();
      if (!profile) {
        toast.error("Sin perfil", "No tienes perfil de proveedor activo.");
        return;
      }

      setSupplierId(profile.id);

      const items = await listSupplierProducts(profile.id);
      setProducts(items);
    } catch (err) {
      console.error(err);
      toast.error(
        "Error",
        err instanceof Error ? err.message : "No se pudieron cargar los productos."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (filterCategory !== "all" && p.category !== filterCategory) return false;

      if (filterStatus === "active" && !p.is_active) return false;
      if (filterStatus === "inactive" && p.is_active) return false;
      if (filterStatus === "out_of_stock" && p.stock > 0) return false;

      return true;
    });
  }, [products, search, filterCategory, filterStatus]);

  const stats = useMemo(() => calculateStats(products), [products]);

  function handleCreate() {
    setEditingProduct(null);
    setModalOpen(true);
  }

  function handleEdit(product: SupplierProduct) {
    setEditingProduct(product);
    setModalOpen(true);
  }

  async function handleDelete(product: SupplierProduct) {
    const vendorsCount = product.vendors_count ?? 0;

    const msg =
      vendorsCount > 0
        ? `⚠️ ATENCIÓN\n\n"${product.name}" está siendo usado por ${vendorsCount} vendor(s).\n\nAl eliminarlo:\n• Ya no aparecerá en tu catálogo\n• Los vendors verán "producto no disponible"\n• Los pedidos históricos se mantienen intactos\n\n¿Continuar?`
        : `¿Eliminar "${product.name}"?\n\nEsta acción se puede revertir contactando a soporte.`;

    if (!confirm(msg)) return;

    try {
      await deleteProduct(product.id);
      toast.success(
        "Producto eliminado",
        `${product.name} fue removido de tu catálogo.`
      );
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Error", "No se pudo eliminar el producto.");
    }
  }

  async function handleToggleActive(product: SupplierProduct) {
    try {
      await toggleActive(product.id, !product.is_active);
      toast.success(
        product.is_active ? "Desactivado" : "Activado",
        `${product.name} ${product.is_active ? "desactivado" : "activado"}.`
      );
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Error", "No se pudo cambiar el estado.");
    }
  }

  // 🆕 Marcar como agotado (stock = 0)
  async function handleMarkOutOfStock(product: SupplierProduct) {
    const vendorsCount = product.vendors_count ?? 0;

    const msg = vendorsCount > 0
      ? `🚫 ¿Marcar "${product.name}" como agotado?\n\n📊 Impacto:\n• ${vendorsCount} vendor(s) verán este producto como AGOTADO\n• Los clientes no podrán comprarlo\n• Podrás reponer stock cuando tengas más\n\n¿Confirmas?`
      : `🚫 ¿Marcar "${product.name}" como agotado?\n\nLos clientes no podrán comprarlo hasta que repongas stock.`;

    if (!confirm(msg)) return;

    try {
      setMarkingOutOfStock(product.id);
      await markAsOutOfStock(product.id);
      toast.success(
        "🚫 Marcado como agotado",
        vendorsCount > 0
          ? `Sincronizado en ${vendorsCount} tienda(s) de vendors.`
          : `${product.name} ya no está disponible.`
      );
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Error", "No se pudo marcar como agotado.");
    } finally {
      setMarkingOutOfStock(null);
    }
  }

  // 🆕 Abrir modal de reposición
  function openRestockModal(product: SupplierProduct) {
    setRestockModal(product);
    setRestockAmount("10"); // Valor por defecto
  }

  // 🆕 Confirmar reposición de stock
  async function confirmRestock() {
    if (!restockModal) return;

    const amount = parseInt(restockAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Cantidad inválida", "Ingresa un número mayor a 0.");
      return;
    }

    try {
      setRestocking(true);
      await restoreStock(restockModal.id, amount);

      const vendorsCount = restockModal.vendors_count ?? 0;
      toast.success(
        "✅ Stock repuesto",
        vendorsCount > 0
          ? `${amount} unidades. Sincronizado en ${vendorsCount} tienda(s).`
          : `${amount} unidades agregadas al catálogo.`
      );

      setRestockModal(null);
      setRestockAmount("");
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Error", "No se pudo reponer el stock.");
    } finally {
      setRestocking(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
            🛒 Mis productos
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona tu catálogo mayorista — los cambios se sincronizan automáticamente
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
        >
          + Nuevo producto
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            📦 Total
          </div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            ✅ Activos
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">{stats.active}</div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-red-600">
            ⚠️ Sin stock
          </div>
          <div className="mt-1 text-2xl font-bold text-red-600">{stats.outOfStock}</div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            👥 Vendors
          </div>
          <div className="mt-1 text-2xl font-bold text-blue-600">{stats.totalVendors}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="min-w-60 flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Buscar por nombre, SKU o categoría..."
            className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-amber-400"
        >
          <option value="all">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "inactive" | "out_of_stock")}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-amber-400"
        >
          <option value="all">Todos</option>
          <option value="active">Solo activos</option>
          <option value="inactive">Solo inactivos</option>
          <option value="out_of_stock">🚫 Solo agotados</option>
        </select>
      </div>

      {/* Listado */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <div className="text-6xl">📦</div>
          <h3 className="mt-4 text-lg font-bold text-gray-900">
            {products.length === 0 ? "Aún no tienes productos" : "Sin resultados"}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {products.length === 0
              ? "Crea tu primer producto para comenzar a vender."
              : "Intenta cambiar los filtros o la búsqueda."}
          </p>
          {products.length === 0 && (
            <button
              onClick={handleCreate}
              className="mt-4 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
            >
              + Crear primer producto
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => {
            const image = product.images?.[0];
            const margin =
              product.base_price > 0
                ? (
                    ((product.suggested_price - product.base_price) /
                      product.base_price) *
                    100
                  ).toFixed(0)
                : "0";

            const isOutOfStock = product.stock === 0;
            const vendorsCount = product.vendors_count ?? 0;

            return (
              <div
                key={product.id}
                className={`overflow-hidden rounded-2xl bg-white p-4 shadow-sm transition ${
                  !product.is_active ? "opacity-60" : ""
                } ${isOutOfStock ? "border-2 border-red-200 bg-red-50/30" : ""}`}
              >
                <div className="flex flex-wrap items-start gap-4">
                  {/* Imagen con overlay AGOTADO */}
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                    {image ? (
                      <img
                        src={image}
                        alt={product.name}
                        className={`h-full w-full object-cover ${isOutOfStock ? "grayscale" : ""}`}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl text-gray-300">
                        📦
                      </div>
                    )}
                    {isOutOfStock && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-500/70">
                        <span className="rotate-[-15deg] rounded bg-white px-1.5 py-0.5 text-[9px] font-black text-red-700">
                          AGOTADO
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900">
                        {product.name}
                      </h3>

                      {!product.is_active && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">
                          Inactivo
                        </span>
                      )}

                      {isOutOfStock && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow-sm">
                          🚫 Agotado
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-xs text-gray-500">
                      SKU: {product.sku} • {product.category}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-3 text-sm">
                      <span className="font-semibold text-gray-900">
                        S/. {product.base_price.toFixed(2)}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="font-semibold text-emerald-600">
                        S/. {product.suggested_price.toFixed(2)}
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        +{margin}%
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span
                        className={`rounded-full px-2 py-1 font-semibold ${
                          isOutOfStock
                            ? "bg-red-100 text-red-700"
                            : product.stock <= 10
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        📦 Stock: {product.stock}
                      </span>
                      {vendorsCount > 0 && (
                        <span className="rounded-full bg-purple-50 px-2 py-1 text-purple-700">
                          👥 {vendorsCount} vendor{vendorsCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {vendorsCount > 0 && (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                          🔄 Auto-sync
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-2">
                    {/* 🆕 Botón principal según estado del stock */}
                    {isOutOfStock ? (
                      <button
                        onClick={() => openRestockModal(product)}
                        className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-600"
                        title="Reponer stock"
                      >
                        ➕ Reponer stock
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMarkOutOfStock(product)}
                        disabled={markingOutOfStock === product.id}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                        title="Marcar como agotado"
                      >
                        {markingOutOfStock === product.id ? "⏳..." : "🚫 Agotado"}
                      </button>
                    )}

                    <button
                      onClick={() => handleEdit(product)}
                      className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                    >
                      ✏️ Editar
                    </button>

                    <button
                      onClick={() => handleToggleActive(product)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        product.is_active
                          ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {product.is_active ? "⏸️ Pausar" : "▶️ Activar"}
                    </button>

                    <button
                      onClick={() => handleDelete(product)}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                      title="Eliminar producto"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal formulario producto */}
      {supplierId && (
        <ProductFormModal
          supplierId={supplierId}
          product={editingProduct}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingProduct(null);
          }}
          onSaved={loadData}
        />
      )}

      {/* 🆕 Modal Reponer Stock */}
      {restockModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => !restocking && setRestockModal(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                  ➕ Reponer stock
                </div>
                <h2 className="mt-1 truncate text-xl font-bold text-gray-900">
                  {restockModal.name}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Stock actual: <strong className="text-red-600">0 unidades</strong>
                </p>
              </div>
              <button
                onClick={() => !restocking && setRestockModal(null)}
                className="shrink-0 text-2xl text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-700">
                📦 Nueva cantidad de stock
              </label>
              <p className="mt-1 text-xs text-gray-500">
                ¿Cuántas unidades tienes disponibles ahora?
              </p>
              <input
                type="number"
                min="1"
                value={restockAmount}
                onChange={(e) => setRestockAmount(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-lg font-bold outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Ej: 20"
                autoFocus
              />

              <div className="mt-3 grid grid-cols-4 gap-2">
                {[5, 10, 20, 50].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRestockAmount(String(n))}
                    className="rounded-lg bg-gray-100 py-2 text-xs font-bold text-gray-700 transition hover:bg-emerald-100 hover:text-emerald-700"
                  >
                    +{n}
                  </button>
                ))}
              </div>
            </div>

            {(restockModal.vendors_count ?? 0) > 0 && (
              <div className="mt-4 rounded-xl bg-emerald-50 border-l-4 border-emerald-500 p-3">
                <p className="text-xs font-bold text-emerald-900">
                  ✅ Se sincronizará automáticamente
                </p>
                <p className="mt-0.5 text-[11px] text-emerald-700">
                  {restockModal.vendors_count} vendor(s) verán el nuevo stock disponible.
                </p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => !restocking && setRestockModal(null)}
                disabled={restocking}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRestock}
                disabled={restocking || !restockAmount || parseInt(restockAmount) <= 0}
                className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {restocking ? "⏳ Guardando..." : "✅ Reponer stock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}