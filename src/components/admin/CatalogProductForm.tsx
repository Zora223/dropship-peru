import { useState, useEffect } from "react";
import { uploadMultipleFiles, deleteFileByUrl } from "../../lib/storage";
import { createCatalogProduct, updateCatalogProduct } from "../../lib/catalog";
import type { DbCatalogProduct } from "../../types/database";

interface CatalogProductFormProps {
  onClose: () => void;
  onSaved: (product: DbCatalogProduct) => void;
  suppliers: { id: string; name: string }[];
  initial?: DbCatalogProduct | null;
}

export default function CatalogProductForm({
  onClose,
  onSaved,
  suppliers,
  initial,
}: CatalogProductFormProps) {
  const [form, setForm] = useState({
    supplier_id: suppliers[0]?.id ?? "",
    name: "",
    description: "",
    base_price: "",
    suggested_price: "",
    stock: "",
    sku: "",
    category: "",
    is_active: true,
  });
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [removedExistingImages, setRemovedExistingImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(initial);

  useEffect(() => {
    if (initial) {
      setForm({
        supplier_id: initial.supplier_id,
        name: initial.name,
        description: initial.description ?? "",
        base_price: String(initial.base_price),
        suggested_price: String(initial.suggested_price),
        stock: String(initial.stock),
        sku: initial.sku,
        category: initial.category,
        is_active: initial.is_active,
      });
      setExistingImages(initial.images ?? []);
    }
  }, [initial]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setPendingFiles((prev) => [...prev, ...newFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const removePending = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExisting = (url: string) => {
    setExistingImages((prev) => prev.filter((u) => u !== url));
    setRemovedExistingImages((prev) => [...prev, url]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.supplier_id) {
      setError("Debes seleccionar un proveedor");
      return;
    }

    setSaving(true);

    try {
      // 1. Subir nuevas imágenes
      let newImageUrls: string[] = [];
      if (pendingFiles.length > 0) {
        newImageUrls = await uploadMultipleFiles("product-images", pendingFiles, "catalog");
      }

      const allImages = [...existingImages, ...newImageUrls];

      const payload = {
        supplier_id: form.supplier_id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        base_price: parseFloat(form.base_price),
        suggested_price: parseFloat(form.suggested_price),
        stock: parseInt(form.stock, 10),
        sku: form.sku.trim(),
        category: form.category.trim(),
        images: allImages,
        is_active: form.is_active,
      };

      let result: DbCatalogProduct;

      if (isEditing && initial) {
        result = await updateCatalogProduct(initial.id, payload);
      } else {
        result = await createCatalogProduct(payload);
      }

      // 2. Eliminar las imágenes removidas del Storage
      for (const url of removedExistingImages) {
        try {
          await deleteFileByUrl("product-images", url);
        } catch (err) {
          console.warn("Could not delete image:", err);
        }
      }

      // Liberar URLs locales
      previews.forEach((url) => URL.revokeObjectURL(url));

      onSaved(result);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al guardar producto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white p-6">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? "Editar producto del catálogo" : "Nuevo producto en catálogo"}
          </h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {/* Fotos */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">Fotos del producto</label>
            <div className="mt-2 grid grid-cols-4 gap-3">
              {existingImages.map((url, i) => (
                <div key={`existing-${i}`} className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200">
                  <img src={url} alt={`Imagen ${i + 1}`} className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute left-1 top-1 rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow">
                      Principal
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeExisting(url)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white opacity-0 transition group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              ))}

              {previews.map((url, i) => (
                <div key={`pending-${i}`} className="group relative aspect-square overflow-hidden rounded-xl border-2 border-emerald-300">
                  <img src={url} alt={`Nueva ${i + 1}`} className="h-full w-full object-cover" />
                  <span className="absolute left-1 top-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow">
                    Nueva
                  </span>
                  <button
                    type="button"
                    onClick={() => removePending(i)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white opacity-0 transition group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              ))}

              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 transition hover:border-rose-500 hover:bg-rose-50/30">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={saving}
                />
                <div className="text-2xl text-gray-400">+</div>
                <div className="mt-1 text-[10px] font-semibold text-gray-500">Agregar</div>
              </label>
            </div>
            <p className="mt-2 text-xs text-gray-400">JPG, PNG o WebP. Máximo 5 MB cada una.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">Proveedor</label>
            <select
              name="supplier_id"
              required
              value={form.supplier_id}
              onChange={handleChange}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
            >
              {suppliers.length === 0 && <option value="">Sin proveedores registrados</option>}
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">Nombre del producto</label>
            <input
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
              placeholder="Ej: Zapatillas Urbanas Pro"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">Descripción</label>
            <textarea
              name="description"
              rows={3}
              value={form.description}
              onChange={handleChange}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
              placeholder="Características, materiales, beneficios..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700">Precio base (S/)</label>
              <input
                name="base_price"
                type="number"
                step="0.01"
                required
                value={form.base_price}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                placeholder="0.00"
              />
              <p className="mt-1 text-xs text-gray-400">Lo que cobra el proveedor</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700">Precio sugerido (S/)</label>
              <input
                name="suggested_price"
                type="number"
                step="0.01"
                required
                value={form.suggested_price}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                placeholder="0.00"
              />
              <p className="mt-1 text-xs text-gray-400">Precio recomendado al vendor</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700">Stock disponible</label>
              <input
                name="stock"
                type="number"
                required
                value={form.stock}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700">SKU (único)</label>
              <input
                name="sku"
                required
                value={form.sku}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                placeholder="COD-001"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">Categoría</label>
            <input
              name="category"
              required
              value={form.category}
              onChange={handleChange}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
              placeholder="Ej: Calzado, Accesorios, Tecnología"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-gray-50 p-4">
            <input
              name="is_active"
              type="checkbox"
              checked={form.is_active}
              onChange={handleChange}
              className="h-5 w-5 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
            />
            <div>
              <div className="text-sm font-semibold text-gray-900">Producto activo</div>
              <div className="text-xs text-gray-500">Disponible para que los vendors lo importen</div>
            </div>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || suppliers.length === 0}
              className="flex-1 rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white shadow transition hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}