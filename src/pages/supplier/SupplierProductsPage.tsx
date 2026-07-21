// ============================================================
// SUPPLIER PRODUCTS PAGE — Panel de productos del proveedor
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../contexts/ToastContext";
import { getMySupplierProfile } from "../../lib/suppliers";
import {
  listSupplierProducts,
  calculateStats,
  deleteProduct,
  toggleActive,
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
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SupplierProduct | null>(null);

  // Cargar datos
  async function loadData() {
    try {
      setLoading(true);

      // Verificar perfil de proveedor (auth interno)
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

  // Categorías únicas
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set).sort();
  }, [products]);

  // Productos filtrados
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
    if (product.vendors_count && product.vendors_count > 0) {
      toast.warning(
        "No se puede eliminar",
        `${product.vendors_count} vendor(s) están usando este producto.`
      );
      return;
    }

    if (!confirm(`¿Eliminar "${product.name}"?\n\nEsta acción no se puede deshacer.`)) return;

    try {
      await deleteProduct(product.id);
      toast.success("Producto eliminado", `${product.name} fue eliminado.`);
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
            Gestiona tu catálogo mayorista
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
          onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "inactive")}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-amber-400"
        >
          <option value="all">Todos</option>
          <option value="active">Solo activos</option>
          <option value="inactive">Solo inactivos</option>
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

            return (
              <div
                key={product.id}
                className={`overflow-hidden rounded-2xl bg-white p-4 shadow-sm transition ${
                  product.is_active ? "" : "opacity-60"
                }`}
              >
                <div className="flex flex-wrap items-start gap-4">
                  {/* Imagen */}
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                    {image ? (
                      <img
                        src={image}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl text-gray-300">
                        📦
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

                      {product.stock === 0 && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-700">
                          Sin stock
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
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                        📦 Stock: {product.stock}
                      </span>
                      <span className="rounded-full bg-purple-50 px-2 py-1 text-purple-700">
                        👥 {product.vendors_count ?? 0} vendors
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-2">
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
                      disabled={(product.vendors_count ?? 0) > 0}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                      title={
                        (product.vendors_count ?? 0) > 0
                          ? "No se puede eliminar (en uso por vendors)"
                          : "Eliminar producto"
                      }
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

      {/* Modal */}
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
    </div>
  );
}