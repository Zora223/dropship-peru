import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMyStore } from "../../hooks/useMyStore";
import { fetchCatalogProducts } from "../../lib/catalog";
import type { CatalogProductWithSupplier } from "../../lib/catalog";
import {
  fetchImportedCatalogIds,
  importCatalogProduct,
} from "../../lib/vendor-products";

function normalizeImages(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images.filter((img): img is string => typeof img === "string");
  }
  return [];
}

function formatCurrency(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

export default function VendorCatalogPage() {
  const { store, loading: loadingStore } = useMyStore();
  const [catalog, setCatalog] = useState<CatalogProductWithSupplier[]>([]);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [supplierFilter, setSupplierFilter] = useState("Todos"); // 🆕 v16
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [importModal, setImportModal] = useState<CatalogProductWithSupplier | null>(
    null
  );
  const [importPrice, setImportPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = async () => {
    if (!store) return;
    try {
      setLoading(true);
      const [catalogData, importedSet] = await Promise.all([
        fetchCatalogProducts(),
        fetchImportedCatalogIds(store.id),
      ]);
      setCatalog(
        Array.isArray(catalogData) ? catalogData.filter((p) => p.is_active) : []
      );
      setImportedIds(importedSet ?? new Set());
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al cargar catálogo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (store) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  const categories = useMemo(() => {
    return ["Todas", ...new Set(catalog.map((p) => p.category).filter(Boolean))];
  }, [catalog]);

  // 🆕 Lista de proveedores únicos para filtro
  const suppliersList = useMemo(() => {
    const map = new Map<string, string>();
    catalog.forEach((p) => {
      if (p.supplier?.id && p.supplier?.business_name) {
        map.set(p.supplier.id, p.supplier.business_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [catalog]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return catalog.filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        (product.description?.toLowerCase().includes(query) ?? false) ||
        (product.category?.toLowerCase().includes(query) ?? false) ||
        (product.supplier?.business_name?.toLowerCase().includes(query) ?? false); // 🆕

      const matchesCategory =
        categoryFilter === "Todas" || product.category === categoryFilter;

      const matchesSupplier =
        supplierFilter === "Todos" || product.supplier?.id === supplierFilter; // 🆕

      const matchesAvailability =
        !showOnlyAvailable || !importedIds.has(product.id);

      return (
        matchesSearch && matchesCategory && matchesSupplier && matchesAvailability
      );
    });
  }, [
    catalog,
    searchQuery,
    categoryFilter,
    supplierFilter,
    showOnlyAvailable,
    importedIds,
  ]);

  const stats = useMemo(() => {
    return {
      total: catalog.length,
      imported: catalog.filter((p) => importedIds.has(p.id)).length,
      available: catalog.filter((p) => !importedIds.has(p.id)).length,
    };
  }, [catalog, importedIds]);

  const openImportModal = (product: CatalogProductWithSupplier) => {
    setImportModal(product);
    setImportPrice(Number(product.suggested_price).toFixed(2));
  };

  const confirmImport = async () => {
    if (!importModal || !store) return;

    const price = parseFloat(importPrice);
    if (isNaN(price) || price <= Number(importModal.base_price)) {
      alert("El precio debe ser mayor al precio base.");
      return;
    }

    setImporting(importModal.id);

    try {
      await importCatalogProduct({
        storeId: store.id,
        catalogProductId: importModal.id,
        name: importModal.name,
        description: importModal.description,
        price,
        stock: importModal.stock,
        sku: importModal.sku,
        category: importModal.category,
        images: importModal.images,
      });

      setImportedIds((prev) => new Set(prev).add(importModal.id));
      setSuccess(`✨ "${importModal.name}" agregado a tu tienda`);
      setImportModal(null);
      setImportPrice("");

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      alert("Error al importar: " + (err as Error).message);
    } finally {
      setImporting(null);
    }
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
          Primero crea tu tienda para poder importar productos.
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
            Catálogo disponible
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Importa productos de proveedores verificados a tu tienda con tu propio
            margen.
          </p>
        </div>

        <Link
          to="/vendor/products"
          className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          📦 Mis productos
        </Link>
      </div>

      {/* Alertas */}
      {success && (
        <div className="rounded-2xl border-l-4 border-emerald-500 bg-emerald-50 p-4 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Banner explicativo */}
      <div className="flex items-start gap-3 rounded-2xl border-l-4 border-rose-500 bg-rose-50 p-4">
        <span className="shrink-0 text-2xl">💡</span>
        <div className="text-sm text-rose-900">
          <strong>¿Cómo funciona?</strong> Elige productos del catálogo central,
          ponles tu precio de venta y aparecerán en tu tienda. El stock y la
          logística los maneja el proveedor.
        </div>
      </div>

      {/* Stats rápidos */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Total catálogo
          </div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {stats.total}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Ya en tu tienda
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">
            {stats.imported}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Por importar
          </div>
          <div className="mt-1 text-2xl font-bold text-blue-600">
            {stats.available}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Buscar productos o proveedores..."
          className="w-full rounded-full border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900/10"
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-full border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm font-medium outline-none transition focus:border-gray-900 focus:bg-white"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* 🆕 v16 - Filtro por proveedor */}
            {suppliersList.length > 0 && (
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="rounded-full border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm font-medium outline-none transition focus:border-amber-500 focus:bg-white"
              >
                <option value="Todos">🏭 Todos los proveedores</option>
                {suppliersList.map((s) => (
                  <option key={s.id} value={s.id}>
                    🏭 {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={showOnlyAvailable}
              onChange={(e) => setShowOnlyAvailable(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-gray-300 text-rose-500 focus:ring-rose-500"
            />
            Solo mostrar disponibles
          </label>
        </div>
      </div>

      {/* Grid */}
      {catalog.length === 0 ? (
        <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
          <div className="text-6xl">📦</div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">
            El catálogo está vacío
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Aún no hay productos disponibles para importar. Vuelve más tarde.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
          <div className="text-5xl">🔍</div>
          <p className="mt-4 text-sm text-gray-500">
            No se encontraron productos con esos filtros.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => {
            const isImported = importedIds.has(product.id);
            const images = normalizeImages(product.images);
            const base = Number(product.base_price);
            const suggested = Number(product.suggested_price);
            const margin =
              base > 0 ? (((suggested - base) / base) * 100).toFixed(0) : "0";
            const marginAbs = suggested - base;

            const stockConfig =
              product.stock === 0
                ? { bg: "bg-red-500", text: "text-white", label: "Agotado" }
                : product.stock <= 10
                ? {
                    bg: "bg-orange-500",
                    text: "text-white",
                    label: `${product.stock} disp.`,
                  }
                : {
                    bg: "bg-white/90 backdrop-blur",
                    text: "text-gray-700",
                    label: `Stock: ${product.stock}`,
                  };

            return (
              <div
                key={product.id}
                className={`overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                  isImported ? "ring-2 ring-emerald-400" : ""
                }`}
              >
                {/* Imagen + badges */}
                <div className="relative aspect-4/3 overflow-hidden bg-linear-to-br from-gray-100 to-gray-200">
                  {images[0] ? (
                    <img
                      src={images[0]}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl text-gray-300">
                      📦
                    </div>
                  )}

                  {/* Badge de margen */}
                  <span className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white shadow">
                    +{margin}% margen
                  </span>

                  {/* Badge de stock */}
                  <span
                    className={`absolute right-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow ${stockConfig.bg} ${stockConfig.text}`}
                  >
                    {stockConfig.label}
                  </span>

                  {/* Badge de "ya importado" */}
                  {isImported && (
                    <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 backdrop-blur-[2px]">
                      <div className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-lg">
                        ✓ En tu tienda
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  {product.category && (
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      {product.category}
                    </div>
                  )}

                  <h3 className="mt-0.5 line-clamp-2 text-sm font-bold text-gray-900">
                    {product.name}
                  </h3>

                  {product.description && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-gray-500">
                      {product.description}
                    </p>
                  )}

                  {/* 🆕 v16 - Info del PROVEEDOR */}
                  {product.supplier && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 p-2">
                      {/* Logo */}
                      {product.supplier.logo_url ? (
                        <img
                          src={product.supplier.logo_url}
                          alt={product.supplier.business_name}
                          className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-amber-200"
                        />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-200 text-sm">
                          🏭
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="truncate text-[11px] font-bold text-amber-900">
                            {product.supplier.business_name}
                          </p>
                          {product.supplier.is_verified && (
                            <span
                              className="shrink-0 text-blue-500"
                              title="Proveedor verificado"
                            >
                              ✓
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-amber-700">
                          {product.supplier.city && (
                            <span className="truncate">
                              📍 {product.supplier.city}
                            </span>
                          )}
                          {product.supplier.rating !== null &&
                            product.supplier.rating > 0 && (
                              <span className="shrink-0">
                                ⭐ {product.supplier.rating.toFixed(1)}
                              </span>
                            )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Precios base vs sugerido */}
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-3">
                    <div>
                      <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-500">
                        Base
                      </div>
                      <div className="text-sm font-bold text-gray-900">
                        {formatCurrency(base)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-semibold uppercase tracking-wider text-emerald-600">
                        Sugerido
                      </div>
                      <div className="text-sm font-bold text-emerald-700">
                        {formatCurrency(suggested)}
                      </div>
                    </div>
                  </div>

                  {/* Ganancia estimada */}
                  {marginAbs > 0 && (
                    <div className="mt-2 text-center text-[11px] font-semibold text-emerald-600">
                      💰 Ganas {formatCurrency(marginAbs)} por unidad
                    </div>
                  )}

                  {/* Botón */}
                  {isImported ? (
                    <Link
                      to="/vendor/products"
                      className="mt-3 block w-full rounded-xl bg-emerald-50 py-2.5 text-center text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      ✓ Ver en mis productos
                    </Link>
                  ) : (
                    <button
                      onClick={() => openImportModal(product)}
                      disabled={product.stock === 0}
                      className="mt-3 w-full rounded-xl bg-gray-900 py-2.5 text-xs font-bold text-white shadow transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {product.stock === 0 ? "Sin stock" : "+ Importar"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de importación */}
      {importModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setImportModal(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Importar producto
                </div>
                <h2 className="mt-1 truncate text-xl font-bold text-gray-900">
                  {importModal.name}
                </h2>
              </div>

              <button
                onClick={() => setImportModal(null)}
                className="shrink-0 text-2xl text-gray-400 hover:text-gray-600"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {/* Preview de imagen */}
            {(() => {
              const modalImages = normalizeImages(importModal.images);
              if (modalImages[0]) {
                return (
                  <div className="mt-4 aspect-4/3 overflow-hidden rounded-2xl bg-gray-100">
                    <img
                      src={modalImages[0]}
                      alt={importModal.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                );
              }
              return null;
            })()}

            {/* 🆕 v16 - Info del proveedor en el modal */}
            {importModal.supplier && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-amber-50 p-3">
                {importModal.supplier.logo_url ? (
                  <img
                    src={importModal.supplier.logo_url}
                    alt={importModal.supplier.business_name}
                    className="h-12 w-12 shrink-0 rounded-xl object-cover ring-2 ring-amber-200"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-xl">
                    🏭
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-bold text-amber-900">
                      {importModal.supplier.business_name}
                    </p>
                    {importModal.supplier.is_verified && (
                      <span
                        className="shrink-0 rounded-full bg-blue-500 px-1.5 py-0.5 text-[9px] font-bold text-white"
                        title="Proveedor verificado"
                      >
                        ✓ VERIFICADO
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-amber-700">
                    {importModal.supplier.city && (
                      <span>📍 {importModal.supplier.city}</span>
                    )}
                    {importModal.supplier.rating !== null &&
                      importModal.supplier.rating > 0 && (
                        <span>
                          ⭐ {importModal.supplier.rating.toFixed(1)}
                        </span>
                      )}
                  </div>
                </div>
              </div>
            )}

            {/* Info de precios */}
            <div className="mt-4 rounded-2xl bg-gray-50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Precio base (proveedor)</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(Number(importModal.base_price))}
                </span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-gray-600">Precio sugerido</span>
                <span className="font-bold text-emerald-700">
                  {formatCurrency(Number(importModal.suggested_price))}
                </span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-gray-600">Stock disponible</span>
                <span className="font-bold text-blue-600">
                  {importModal.stock} unidades
                </span>
              </div>
            </div>

            {/* Input precio de venta */}
            <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-700">
                Tu precio de venta (S/)
              </label>
              <input
                type="number"
                step="0.01"
                value={importPrice}
                onChange={(e) => setImportPrice(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base font-bold outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
              />

              {importPrice &&
                parseFloat(importPrice) > Number(importModal.base_price) && (
                  <div className="mt-3 rounded-xl bg-emerald-50 p-3">
                    <p className="text-xs font-bold text-emerald-800">
                      ✅ Ganancia por unidad:{" "}
                      {formatCurrency(
                        parseFloat(importPrice) -
                          Number(importModal.base_price)
                      )}
                    </p>
                    <p className="mt-1 text-[11px] text-emerald-700">
                      Margen:{" "}
                      {(
                        ((parseFloat(importPrice) -
                          Number(importModal.base_price)) /
                          Number(importModal.base_price)) *
                        100
                      ).toFixed(0)}
                      %
                    </p>
                  </div>
                )}

              {importPrice &&
                parseFloat(importPrice) <= Number(importModal.base_price) && (
                  <p className="mt-2 rounded-xl bg-red-50 p-2 text-xs text-red-600">
                    ⚠️ Tu precio debe ser mayor al precio base
                  </p>
                )}
            </div>

            {/* Botones */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setImportModal(null)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmImport}
                disabled={
                  importing === importModal.id ||
                  !importPrice ||
                  parseFloat(importPrice) <= Number(importModal.base_price)
                }
                className="flex-1 rounded-xl bg-gray-900 py-3 text-sm font-bold text-white shadow transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {importing === importModal.id
                  ? "Importando..."
                  : "✓ Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}