import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMyStore } from "../../hooks/useMyStore";
import { useToast } from "../../contexts/ToastContext";
import {
  fetchMyProducts,
  deleteMyProduct,
  toggleMyProductActive,
} from "../../lib/vendor-products";
import type { VendorProductWithRealStock } from "../../lib/vendor-products";
import ProductForm from "../../components/vendor/ProductForm";
import type { DbProduct } from "../../types/database";

type Tab = "all" | "imported" | "own";

function normalizeImages(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images.filter((img): img is string => typeof img === "string");
  }
  return [];
}

function getStockConfig(stock: number) {
  if (stock === 0) {
    return {
      bg: "bg-red-100",
      text: "text-red-800",
      label: "AGOTADO",
      emoji: "❌",
    };
  }
  if (stock <= 5) {
    return {
      bg: "bg-orange-100",
      text: "text-orange-800",
      label: `${stock} unidades`,
      emoji: "⚠️",
    };
  }
  if (stock <= 10) {
    return {
      bg: "bg-amber-50",
      text: "text-amber-700",
      label: `${stock} unidades`,
      emoji: "📦",
    };
  }
  return {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    label: `${stock} unidades`,
    emoji: "✅",
  };
}

export default function VendorProductsPage() {
  const { store, loading: loadingStore } = useMyStore();
  const toast = useToast();
  const [products, setProducts] = useState<VendorProductWithRealStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DbProduct | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadProducts = async () => {
    if (!store) return;
    try {
      setLoading(true);
      const data = await fetchMyProducts(store.id);
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error(
        "Error al cargar productos",
        err instanceof Error ? err.message : "Intenta recargar la página"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (store) loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  const counts = useMemo(() => {
    return {
      all: products.length,
      imported: products.filter((p) => p.source === "catalog").length,
      own: products.filter((p) => p.source === "own").length,
    };
  }, [products]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "imported" && product.source === "catalog") ||
        (activeTab === "own" && product.source === "own");

      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        (product.sku?.toLowerCase().includes(query) ?? false) ||
        (product.category?.toLowerCase().includes(query) ?? false);

      return matchesTab && matchesSearch;
    });
  }, [products, activeTab, searchQuery]);

  const handleSaved = async () => {
    await loadProducts();
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await toggleMyProductActive(id, !current);
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: !current } : p))
      );
      toast.success(
        current ? "Producto ocultado" : "Producto publicado",
        current
          ? "Ya no aparece en tu tienda"
          : "Ya está disponible para tus clientes"
      );
    } catch (err) {
      toast.error(
        "No se pudo actualizar",
        err instanceof Error ? err.message : "Intenta de nuevo"
      );
    }
  };

  const handleDelete = async (product: VendorProductWithRealStock) => {
    const isImported = product.source === "catalog";
    const message = isImported
      ? `¿Quitar "${product.name}" de tu tienda? El producto seguirá disponible en el catálogo del marketplace.`
      : `¿Eliminar "${product.name}" definitivamente? Esta acción no se puede deshacer y se borrarán también sus fotos.`;

    if (!confirm(message)) return;

    try {
      await deleteMyProduct(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast.success(
        isImported ? "Producto quitado" : "Producto eliminado",
        isImported
          ? `"${product.name}" ya no está en tu tienda`
          : `"${product.name}" se eliminó permanentemente`
      );
    } catch (err) {
      toast.error(
        "No se pudo eliminar",
        err instanceof Error ? err.message : "Intenta de nuevo"
      );
    }
  };

  const openNew = () => {
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (product: VendorProductWithRealStock) => {
    setEditing(product);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  if (loadingStore || loading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-rose-500" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
        <div className="text-6xl">🏪</div>
        <h2 className="mt-4 text-xl font-bold text-gray-900">
          Aún no tienes tienda
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Primero crea tu tienda para poder agregar productos.
        </p>
        <Link
          to="/vendor/settings"
          className="mt-6 inline-block rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-gray-800"
        >
          Crear mi tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Mis productos
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Productos en tu tienda: importados del catálogo + tus propios.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            to="/vendor/catalog"
            className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            📚 Catálogo
          </Link>

          <button
            onClick={openNew}
            className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-gray-800"
          >
            + Nuevo
          </button>
        </div>
      </div>

      {/* Tabs — scroll horizontal en móvil */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2 border-b border-gray-200">
          {[
            { id: "all" as const, label: "Todos", count: counts.all },
            {
              id: "imported" as const,
              label: "🔗 Importados",
              count: counts.imported,
            },
            {
              id: "own" as const,
              label: "✨ Propios",
              count: counts.own,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative shrink-0 px-4 py-3 text-sm font-semibold transition sm:px-5 ${
                activeTab === tab.id
                  ? "text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  activeTab === tab.id
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {tab.count}
              </span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Buscador */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="🔍 Buscar por nombre, SKU o categoría..."
          className="w-full rounded-full border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900/10"
        />
      </div>

      {/* Modal de formulario */}
      {showForm && (
        <ProductForm
          storeId={store.id}
          onClose={closeForm}
          onSaved={handleSaved}
          initial={editing}
        />
      )}

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
          <div className="text-6xl">📦</div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">
            {searchQuery
              ? "Sin resultados"
              : activeTab === "imported"
              ? "Aún no has importado productos"
              : activeTab === "own"
              ? "Aún no has creado productos propios"
              : "Tu tienda está vacía"}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {searchQuery
              ? "Intenta con otro término de búsqueda."
              : activeTab === "imported" || activeTab === "all"
              ? "Importa productos del catálogo del marketplace o crea los tuyos."
              : "Crea tu primer producto exclusivo."}
          </p>

          {!searchQuery && (
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              {(activeTab === "all" || activeTab === "imported") && (
                <Link
                  to="/vendor/catalog"
                  className="rounded-full bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-rose-600"
                >
                  Ver catálogo
                </Link>
              )}

              {(activeTab === "all" || activeTab === "own") && (
                <button
                  onClick={openNew}
                  className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-gray-800"
                >
                  + Crear producto propio
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 🖥️ VISTA DESKTOP: Tabla (oculta en <lg) */}
          <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Producto</th>
                    <th className="px-6 py-4 font-medium">Origen</th>
                    <th className="px-6 py-4 font-medium">Precio</th>
                    <th className="px-6 py-4 font-medium">Stock</th>
                    <th className="px-6 py-4 font-medium">Estado</th>
                    <th className="px-6 py-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((product) => {
                    const images = normalizeImages(product.images);
                    const stockConfig = getStockConfig(product.real_stock);

                    return (
                      <tr
                        key={product.id}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-lg">
                              {images[0] ? (
                                <img
                                  src={images[0]}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                "📦"
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-900">
                                {product.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {product.sku ?? "—"} ·{" "}
                                {product.category ?? "Sin categoría"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {product.source === "catalog" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                              🔗 Catálogo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                              ✨ Propio
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              S/ {Number(product.price).toFixed(2)}
                            </span>
                            {product.compare_at_price && (
                              <span className="text-xs text-gray-400 line-through">
                                S/{" "}
                                {Number(product.compare_at_price).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${stockConfig.bg} ${stockConfig.text}`}
                            >
                              {stockConfig.emoji} {stockConfig.label}
                            </span>

                            {product.source === "catalog" && (
                              <span
                                className="text-[10px] font-medium text-purple-600"
                                title="El stock lo gestiona el marketplace"
                              >
                                🔒 Stock del marketplace
                              </span>
                            )}

                            {product.catalog_inactive && (
                              <span className="text-[10px] font-bold text-red-600">
                                ❌ Desactivado por marketplace
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() =>
                              handleToggle(product.id, product.is_active)
                            }
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition ${
                              product.is_active
                                ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {product.is_active ? "Activo" : "Inactivo"}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            {product.source === "own" && (
                              <button
                                onClick={() => openEdit(product)}
                                className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                              >
                                Editar
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(product)}
                              className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100"
                            >
                              {product.source === "catalog"
                                ? "Quitar"
                                : "🗑 Eliminar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 📱 VISTA MÓVIL: Cards (oculta en ≥lg) */}
          <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {filtered.map((product) => {
              const images = normalizeImages(product.images);
              const stockConfig = getStockConfig(product.real_stock);
              const discount =
                product.compare_at_price &&
                Number(product.compare_at_price) > Number(product.price)
                  ? Math.round(
                      ((Number(product.compare_at_price) -
                        Number(product.price)) /
                        Number(product.compare_at_price)) *
                        100
                    )
                  : null;

              return (
                <div
                  key={product.id}
                  className={`overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ${
                    !product.is_active ? "opacity-60" : ""
                  }`}
                >
                  {/* Imagen + badges */}
                  <div className="relative aspect-square bg-gray-100">
                    {images[0] ? (
                      <img
                        src={images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-6xl text-gray-300">
                        📦
                      </div>
                    )}

                    {/* Badges arriba izquierda */}
                    <div className="absolute left-2 top-2 flex flex-col gap-1">
                      {product.source === "catalog" ? (
                        <span className="rounded-full bg-purple-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                          🔗 Catálogo
                        </span>
                      ) : (
                        <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                          ✨ Propio
                        </span>
                      )}

                      {discount && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                          -{discount}%
                        </span>
                      )}
                    </div>

                    {/* Estado arriba derecha */}
                    <div className="absolute right-2 top-2">
                      <button
                        onClick={() =>
                          handleToggle(product.id, product.is_active)
                        }
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold shadow ${
                          product.is_active
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-400 text-white"
                        }`}
                      >
                        {product.is_active ? "● Activo" : "○ Inactivo"}
                      </button>
                    </div>

                    {/* Stock abajo derecha */}
                    <div className="absolute bottom-2 right-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold shadow ${stockConfig.bg} ${stockConfig.text}`}
                      >
                        {stockConfig.emoji} {stockConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="line-clamp-2 text-sm font-bold text-gray-900">
                      {product.name}
                    </h3>

                    {product.category && (
                      <div className="mt-1 text-[11px] text-gray-500">
                        📂 {product.category}
                      </div>
                    )}

                    {product.sku && (
                      <div className="mt-0.5 text-[11px] font-mono text-gray-400">
                        {product.sku}
                      </div>
                    )}

                    {/* Precios */}
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-lg font-black text-gray-900">
                        S/ {Number(product.price).toFixed(2)}
                      </span>
                      {product.compare_at_price && (
                        <span className="text-xs text-gray-400 line-through">
                          S/ {Number(product.compare_at_price).toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Warnings del catálogo */}
                    {product.source === "catalog" && (
                      <div className="mt-2 text-[10px] font-medium text-purple-600">
                        🔒 Stock del marketplace
                      </div>
                    )}

                    {product.catalog_inactive && (
                      <div className="mt-1 text-[10px] font-bold text-red-600">
                        ❌ Desactivado por marketplace
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="mt-4 flex gap-2">
                      {product.source === "own" && (
                        <button
                          onClick={() => openEdit(product)}
                          className="flex-1 rounded-xl bg-gray-900 py-2 text-xs font-bold text-white transition hover:bg-gray-800"
                        >
                          ✏️ Editar
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(product)}
                        className={`rounded-xl bg-red-50 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 ${
                          product.source === "own" ? "px-3" : "flex-1"
                        }`}
                      >
                        {product.source === "catalog"
                          ? "Quitar de mi tienda"
                          : "🗑"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}