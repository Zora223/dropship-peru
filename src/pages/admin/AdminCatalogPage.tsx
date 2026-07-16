import { useEffect, useMemo, useState } from "react";
import CatalogProductForm from "../../components/admin/CatalogProductForm";
import {
  fetchCatalogProducts,
  deleteCatalogProduct,
  toggleCatalogProductActive,
} from "../../lib/catalog";
import { fetchSuppliers } from "../../lib/suppliers";
import type { DbCatalogProduct, DbSupplier } from "../../types/database";

export default function AdminCatalogPage() {
  const [products, setProducts] = useState<DbCatalogProduct[]>([]);
  const [suppliers, setSuppliers] = useState<DbSupplier[]>([]);

  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DbCatalogProduct | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [productsData, suppliersData] = await Promise.all([
        fetchCatalogProducts(),
        fetchSuppliers(),
      ]);

      setProducts(productsData);
      setSuppliers(suppliersData);
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
      ...new Set(
        products
          .map((product) => product.category)
          .filter(Boolean)
      ),
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

      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, categoryFilter]);

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
        return prev.map((product) =>
          product.id === saved.id ? saved : product
        );
      }

      return [saved, ...prev];
    });

    setSuccess(editing ? "Producto actualizado." : "Producto creado.");

    setTimeout(() => {
      setSuccess(null);
    }, 3000);
  }

  async function handleToggle(product: DbCatalogProduct) {
    try {
      setActionLoadingId(product.id);
      setError(null);
      setSuccess(null);

      await toggleCatalogProductActive(product.id, !product.is_active);

      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id
            ? { ...item, is_active: !product.is_active }
            : item
        )
      );

      setSuccess(
        product.is_active
          ? "Producto desactivado correctamente."
          : "Producto activado correctamente."
      );

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Error al cambiar estado"
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDelete(product: DbCatalogProduct) {
    const confirmed = window.confirm(
      `¿Eliminar "${product.name}" del catálogo maestro? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    try {
      setActionLoadingId(product.id);
      setError(null);
      setSuccess(null);

      await deleteCatalogProduct(product.id);

      setProducts((prev) => prev.filter((item) => item.id !== product.id));

      setSuccess("Producto eliminado correctamente.");

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Error al eliminar producto"
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-rose-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          title={suppliers.length === 0 ? "Primero crea un proveedor" : ""}
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
          ⚠️ <strong>No tienes proveedores registrados.</strong> Ve a la sección
          “Proveedores” y crea al menos uno antes de agregar productos al catálogo.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Productos totales
          </div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {stats.total}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Activos
          </div>
          <div className="mt-2 text-3xl font-bold text-emerald-600">
            {stats.active}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            {stats.inactive} inactivos
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Stock total
          </div>
          <div className="mt-2 text-3xl font-bold text-blue-600">
            {stats.totalStock}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Alertas stock
          </div>
          <div className="mt-2 text-3xl font-bold text-orange-600">
            {stats.criticalStock + stats.outOfStock}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            {stats.outOfStock} agotados
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Buscar por nombre, SKU o categoría..."
          className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900/10"
        />

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="rounded-full border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm font-medium outline-none transition focus:border-gray-900 focus:bg-white"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <CatalogProductForm
          onClose={closeForm}
          onSaved={handleSaved}
          suppliers={suppliers.map((supplier) => ({
            id: supplier.id,
            name: supplier.name,
          }))}
          initial={editing}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
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
              {filteredProducts.map((product) => (
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
                        <div className="font-semibold text-gray-900">
                          {product.name}
                        </div>

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
                        className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          product.stock === 0
                            ? "bg-red-100 text-red-800"
                            : product.stock <= 5
                            ? "bg-orange-100 text-orange-800"
                            : product.stock <= 10
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {product.stock === 0 ? "AGOTADO" : product.stock}
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
              ))}

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