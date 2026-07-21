// ============================================================
// PRODUCT FORM MODAL — Modal para crear/editar productos
// ============================================================
// Formulario completo con:
// - Upload de imágenes (drag & drop)
// - Preview de imágenes
// - Cálculo automático de margen
// - Validaciones
// ============================================================

import { useEffect, useState } from "react";
import { useToast } from "../../contexts/ToastContext";
import {
  createProduct,
  updateProduct,
  uploadProductImage,
  deleteProductImage,
  type ProductFormData,
  type SupplierProduct,
} from "../../lib/supplier-products";

interface ProductFormModalProps {
  supplierId: string;
  product: SupplierProduct | null; // null = crear, objeto = editar
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY_FORM: ProductFormData = {
  name: "",
  description: "",
  base_price: 0,
  suggested_price: 0,
  stock: 0,
  sku: "",
  category: "",
  images: [],
  is_active: true,
};

export default function ProductFormModal({
  supplierId,
  product,
  isOpen,
  onClose,
  onSaved,
}: ProductFormModalProps) {
  const toast = useToast();
  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Cargar producto si estamos editando
  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        description: product.description ?? "",
        base_price: product.base_price,
        suggested_price: product.suggested_price,
        stock: product.stock,
        sku: product.sku,
        category: product.category,
        images: product.images ?? [],
        is_active: product.is_active,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [product, isOpen]);

  // Cálculo de margen sugerido
  const margin =
    form.base_price > 0 && form.suggested_price > form.base_price
      ? (
          ((form.suggested_price - form.base_price) / form.base_price) *
          100
        ).toFixed(1)
      : "0";

  // Subir imagen
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const newUrls: string[] = [];

      for (const file of Array.from(files)) {
        const url = await uploadProductImage(file);
        newUrls.push(url);
      }

      setForm((prev) => ({
        ...prev,
        images: [...prev.images, ...newUrls],
      }));

      toast.success("Imagen subida", `Se subieron ${newUrls.length} imagen(es).`);
    } catch (err) {
      console.error(err);
      toast.error(
        "Error al subir",
        err instanceof Error ? err.message : "No se pudo subir la imagen."
      );
    } finally {
      setUploading(false);
      e.target.value = ""; // reset input
    }
  }

  // Quitar imagen
  async function handleRemoveImage(url: string) {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img !== url),
    }));

    // Borrar del storage en background
    await deleteProductImage(url);
  }

  // Guardar producto
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validaciones
    if (!form.name.trim()) {
      toast.error("Nombre requerido", "Ingresa un nombre para el producto.");
      return;
    }

    if (!form.sku.trim()) {
      toast.error("SKU requerido", "Ingresa un código SKU.");
      return;
    }

    if (!form.category.trim()) {
      toast.error("Categoría requerida", "Ingresa una categoría.");
      return;
    }

    if (form.base_price <= 0) {
      toast.error("Precio base inválido", "El precio base debe ser mayor a 0.");
      return;
    }

    if (form.suggested_price < form.base_price) {
      toast.error(
        "Precio sugerido inválido",
        "El precio sugerido debe ser mayor o igual al base."
      );
      return;
    }

    setSaving(true);

    try {
      if (product) {
        await updateProduct(product.id, form);
        toast.success("Producto actualizado", `${form.name} se actualizó.`);
      } else {
        await createProduct(supplierId, form);
        toast.success("Producto creado", `${form.name} se agregó al catálogo.`);
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(
        "Error al guardar",
        err instanceof Error ? err.message : "No se pudo guardar."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {product ? "✏️ Editar producto" : "➕ Nuevo producto"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {product ? "Modifica los datos del producto" : "Agrega un producto a tu catálogo"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Nombre */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Nombre del producto *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Polo básico blanco"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Descripción
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe tu producto..."
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
          </div>

          {/* SKU + Categoría */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                SKU / Código *
              </label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="COD-001"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Categoría *
              </label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Ropa, Calzado, etc."
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                required
              />
            </div>
          </div>

          {/* Precios */}
          <div className="rounded-2xl bg-amber-50 p-4">
            <h3 className="mb-3 text-sm font-bold text-amber-900">💰 Precios</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Precio base (mayorista) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">
                    S/.
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.base_price || ""}
                    onChange={(e) =>
                      setForm({ ...form, base_price: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Precio sugerido (venta) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">
                    S/.
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.suggested_price || ""}
                    onChange={(e) =>
                      setForm({ ...form, suggested_price: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-xl bg-white p-3 text-sm">
              <span className="text-gray-600">📊 Margen para el vendor:</span>
              <span className="text-lg font-bold text-emerald-600">+{margin}%</span>
            </div>
          </div>

          {/* Stock */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Stock disponible *
            </label>
            <input
              type="number"
              min="0"
              value={form.stock || ""}
              onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
              placeholder="0"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              required
            />
            {form.stock === 0 && (
              <p className="mt-1 text-xs text-red-600">⚠️ Sin stock, los vendors no podrán vender.</p>
            )}
          </div>

          {/* Imágenes */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Imágenes del producto
            </label>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {form.images.map((url) => (
                <div key={url} className="group relative overflow-hidden rounded-xl border border-gray-200">
                  <img src={url} alt="Producto" className="aspect-square w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(url)}
                    className="absolute right-1 top-1 rounded-full bg-red-500 p-1.5 text-xs text-white opacity-0 shadow transition group-hover:opacity-100"
                    title="Quitar imagen"
                  >
                    ✕
                  </button>
                </div>
              ))}

              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-600">
                {uploading ? (
                  <>
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                    <span className="mt-2 text-xs">Subiendo...</span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl">📷</span>
                    <span className="mt-1 text-xs font-semibold">Agregar</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              💡 Sube hasta 5 imágenes. Máx 5MB cada una.
            </p>
          </div>

          {/* Activo */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-gray-50 p-3">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-5 w-5 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
            />
            <div>
              <div className="text-sm font-semibold text-gray-900">Producto activo</div>
              <div className="text-xs text-gray-500">
                Los vendors podrán importarlo a su tienda
              </div>
            </div>
          </label>

          {/* Botones */}
          <div className="flex gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
            >
              {saving ? "Guardando..." : product ? "Actualizar" : "Crear producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}