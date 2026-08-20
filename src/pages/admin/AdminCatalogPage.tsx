// src/pages/admin/AdminCatalogPage.tsx
// 🆕 v22.30 - Catálogo admin 100% responsive (cards móvil + tabla desktop)

import { useEffect, useMemo, useState } from "react";
import CatalogProductForm from "../../components/admin/CatalogProductForm";
import {
  fetchCatalogProducts,
  deleteCatalogProduct,
  toggleCatalogProductActive,
} from "../../lib/catalog";
import { getActiveSupplierProfiles } from "../../lib/suppliers";
import type { DbCatalogProduct } from "../../types/database";

export default function AdminCatalogPage() {
  const [products, setProducts] = useState<DbCatalogProduct[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; business_name: string }[]>([]);

  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DbCatalogProduct | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [productsData, suppliersData] = await Promise.all([
        fetchCatalogProducts(),
        getActiveSupplierProfiles(),
      ]);

      setProducts(productsData);
      setSuppliers(
        suppliersData.map((s) => ({
          id: s.id,
          business_name: s.business_name,
        }))
      );
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const categories = useMemo(() => {
    return [
      "Todas",
      ...new Set(products.map((product) => product.category).filter(Boolean)),
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);

      const matchesCategory =
        categoryFilter === "Todas" || product.category === categoryFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && product.is_active) ||
        (statusFilter === "inactive" && !product.is_active);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: products.length,
      active: products.filter((product) => product.is_active).length,
      inactive: products.filter((product) => !product.is_active).length,
      totalStock: products.reduce(
        (sum, product) => sum + Number(product.stock || 0),
        0
      ),
      criticalStock: products.filter(
        (product) => product.stock > 0 && product.stock <= 5
      ).length,
      outOfStock: products.filter((product) => product.stock === 0).length,
    };
  }, [products]);

  function openNew() {
    setEditing(null);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }

  function openEdit(product: DbCatalogProduct) {
    setEditing(product);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  function handleSaved(saved: DbCatalogProduct) {
    setProducts((prev) => {
      const exists = prev.some((product) => product.id === saved.id);
      if (exists) {
        return prev.map((product) => (product.id === saved.id ? saved : product));
      }
      return [saved, ...prev];
    });

    setSuccess(editing ? "Producto actualizado." : "Producto creado.");
    setTimeout(() => setSuccess(null), 3000);
  }

  async function handleToggle(product: DbCatalogProduct) {
    try {
      setActionLoadingId(product.id);
      setError(null);
      setSuccess(null);

      await toggleCatalogProductActive(product.id, !product.is_active);

      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id ? { ...item, is_active: !product.is_active } : item
        )
      );

      setSuccess(
        product.is_active
          ? "Producto desactivado correctamente."
          : "Producto activado correctamente."
      );
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al cambiar estado");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDelete(product: DbCatalogProduct) {
    const confirmed = window.confirm(
      `¿Eliminar "${product.name}" del catálogo maestro?\n\nSe marcará como eliminado (soft delete). Los pedidos históricos se mantienen.`
    );
    if (!confirmed) return;

    try {
      setActionLoadingId(product.id);
      setError(null);
      setSuccess(null);

      await deleteCatalogProduct(product.id);
      setProducts((prev) => prev.filter((item) => item.id !== product.id));
      setSuccess("Producto eliminado correctamente.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al eliminar producto");
    } finally {
      setActionLoadingId(null);
    }
  }

  function stockBadge(stock: number) {
    if (stock === 0) {
      return {
        className: "bg-red-100 text-red-800",
        label: "AGOTADO",
      };
    }
    if (stock <= 5) {
      return {
        className: "bg-orange-100 text-orange-800",
        label: `${stock} uds`,
      };
    }
    if (stock <= 10) {
      return {
        className: "bg-amber-50 text-amber-700",
        label: `${stock} uds`,
      };
    }
    return {
      className: "bg-emerald-50 text-emerald-700",
      label: `${stock} uds`,
    };
  }

  if (loading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-rose-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Catálogo maestro
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Productos base disponibles para que los vendors importen a sus tiendas.
          </p>
        </div>

        <button
          onClick={openNew}
          disabled={suppliers.length === 0}
          className="w-full sm:w-auto rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white shadow transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
          title={
            suppliers.length === 0 ? "Primero necesitas proveedores activos" : ""
          }
        >
          + Nuevo producto
        </button>
      </div>

      {success && (
        <div className="rounded-2xl border-l-4 border-emerald-500 bg-emerald-50 p-4 text-sm text-emerald-800">
          ✅ {success}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {suppliers.length === 0 && (
        <div className="rounded-2xl border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-amber-900">
          ⚠️ <strong>No hay proveedores activos.</strong> Los proveedores deben
          registrarse y ser aprobados antes de que puedas crear productos.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-xs">
            Productos
          </div>
          <div className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
            {stats.total}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-xs">
            Activos
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-600 sm:text-3xl">
            {stats.active}
          </div>
          <div className="mt-1 text-[10px] text-gray-400 sm:text-xs">
            {stats.inactive} inactivos
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-xs">
            Stock total
          </div>
          <div className="mt-1 text-2xl font-bold text-blue-600 sm:text-3xl">
            {stats.totalStock}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-xs">
            Alertas
          </div>
          <div className="mt-1 text-2xl font-bold text-orange-600 sm:text-3xl">
            {stats.criticalStock + stats.outOfStock}
          </div>
          <div className="mt-1 text-[10px] text-gray-400 sm:text-xs">
            {stats.outOfStock} agotados
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="🔍 Buscar por nombre, SKU o categoría..."
          className="w-full rounded-full border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900/10"
        />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-gray-900 focus:bg-white"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "Todas" ? "📂 Todas las categorías" : category}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | "active" | "inactive")
            }
            className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-gray-900 focus:bg-white"
          >
            <option value="all">🔘 Todos los estados</option>
            <option value="active">✅ Solo activos</option>
            <option value="inactive">⏸️ Solo inactivos</option>
          </select>
        </div>

        <div className="text-xs text-gray-500">
          Mostrando <strong>{filteredProducts.length}</strong> de {products.length} productos
        </div>
      </div>

      {showForm && (
        <CatalogProductForm
          onClose={closeForm}
          onSaved={handleSaved}
          suppliers={suppliers}
          initial={editing}
        />
      )}

      {/* 📱 MÓVIL: CARDS */}
      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {filteredProducts.map((product) => {
          const stock = stockBadge(product.stock);
          return (
            <div
              key={product.id}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <div className="relative aspect-square bg-gray-50">
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl">
                    📦
                  </div>
                )}

                <div className="absolute left-2 top-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold shadow ${
                      product.is_active
                        ? "bg-blue-500 text-white"
                        : "bg-gray-500 text-white"
                    }`}
                  >
                    {product.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>

                <div className="absolute bottom-2 right-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold shadow ${stock.className}`}
                  >
                    {stock.label}
                  </span>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div>
                  <h3 className="line-clamp-2 text-sm font-bold text-gray-900">
                    {product.name}
                  </h3>
                  <p className="mt-1 text-[11px] text-gray-500">
                    {product.sku} · {product.category}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-2.5 text-center">
                  <div>
                    <div className="text-[10px] uppercase text-gray-400">Base</div>
                    <div className="text-sm font-black text-gray-900">
                      S/ {Number(product.base_price).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-gray-400">Sugerido</div>
                    <div className="text-sm font-black text-emerald-600">
                      S/ {Number(product.suggested_price).toFixed(2)}
                    </div>
                  </div>
                </div>

                {product.stock > 0 && product.stock <= 5 && (
                  <div className="rounded-lg bg-orange-50 px-2 py-1 text-[11px] font-semibold text-orange-700">
                    ⚠️ Stock crítico
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => openEdit(product)}
                    className="rounded-xl border border-gray-200 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleToggle(product)}
                    disabled={actionLoadingId === product.id}
                    className={`rounded-xl py-2.5 text-xs font-bold disabled:opacity-60 ${
                      product.is_active
                        ? "bg-blue-50 text-blue-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {actionLoadingId === product.id
                      ? "..."
                      : product.is_active
                      ? "Pausar"
                      : "Activar"}
                  </button>
                  <button
                    onClick={() => handleDelete(product)}
                    disabled={actionLoadingId === product.id}
                    className="col-span-2 rounded-xl bg-red-50 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    {actionLoadingId === product.id ? "..." : "🗑 Eliminar"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="col-span-full rounded-2xl bg-white p-12 text-center shadow-sm">
            <div className="text-5xl">📦</div>
            <p className="mt-3 text-sm text-gray-500">
              {products.length === 0
                ? "Aún no hay productos en el catálogo."
                : "No se encontraron productos con esos filtros."}
            </p>
          </div>
        )}
      </div>

      {/* 🖥️ DESKTOP: TABLA */}
      <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-225 text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Producto</th>
                <th className="px-6 py-4 font-medium">Precio base</th>
                <th className="px-6 py-4 font-medium">Sugerido</th>
                <th className="px-6 py-4 font-medium">Stock</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((product) => {
                const stock = stockBadge(product.stock);
                return (
                  <tr key={product.id} className="transition hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 text-xl">
                          {product.images?.[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            "📦"
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-500">
                            {product.sku} · {product.category}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-semibold text-gray-900">
                      S/ {Number(product.base_price).toFixed(2)}
                    </td>

                    <td className="px-6 py-4 font-semibold text-emerald-600">
                      S/ {Number(product.suggested_price).toFixed(2)}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${stock.className}`}
                        >
                          {stock.label}
                        </span>
                        {product.stock > 0 && product.stock <= 5 && (
                          <span className="text-[10px] font-semibold text-orange-600">
                            ⚠️ Stock crítico
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggle(product)}
                        disabled={actionLoadingId === product.id}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition disabled:opacity-60 ${
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
                        <button
                          onClick={() => openEdit(product)}
                          className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          disabled={actionLoadingId === product.id}
                          className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                        >
                          {actionLoadingId === product.id ? "..." : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="text-4xl">📦</div>
                    <p className="mt-3 text-sm text-gray-500">
                      {products.length === 0
                        ? "Aún no hay productos en el catálogo. Crea el primero."
                        : "No se encontraron productos con esos filtros."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}