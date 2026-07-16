import { useState } from "react";
import type { Product } from "../types";

interface ProductFormProps {
  onClose: () => void;
  onSave: (
    product: Omit<Product, "id" | "store_id" | "created_at" | "updated_at">
  ) => void;
}

export default function ProductForm({ onClose, onSave }: ProductFormProps) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    compare_at_price: "",
    stock: "",
    sku: "",
    category: "",
    is_active: true,
    images: [] as string[],
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave({
      source: "own",
      catalog_product_id: null,
      name: form.name,
      description: form.description || null,
      price: parseFloat(form.price),
      compare_at_price: form.compare_at_price
        ? parseFloat(form.compare_at_price)
        : null,
      stock: parseInt(form.stock, 10),
      sku: form.sku || null,
      category: form.category || null,
      is_active: form.is_active,
      images: form.images,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Nuevo producto</h2>

          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nombre
            </label>

            <input
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
              placeholder="Ej: Zapatillas Urbanas Pro"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Descripción
            </label>

            <textarea
              name="description"
              rows={3}
              value={form.description}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
              placeholder="Breve descripción del producto"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Precio (S/)
              </label>

              <input
                name="price"
                type="number"
                step="0.01"
                required
                value={form.price}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Precio antes (opcional)
              </label>

              <input
                name="compare_at_price"
                type="number"
                step="0.01"
                value={form.compare_at_price}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Stock
              </label>

              <input
                name="stock"
                type="number"
                required
                value={form.stock}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                SKU
              </label>

              <input
                name="sku"
                value={form.sku}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                placeholder="COD-001"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Categoría
            </label>

            <input
              name="category"
              value={form.category}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
              placeholder="Ej: Calzado"
            />
          </div>

          <label className="flex items-center gap-3 py-2">
            <input
              name="is_active"
              type="checkbox"
              checked={form.is_active}
              onChange={handleChange}
              className="h-5 w-5 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
            />

            <span className="text-sm font-medium text-gray-700">
              Producto activo (visible en la tienda)
            </span>
          </label>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="flex-1 rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white shadow transition hover:bg-gray-800"
            >
              Guardar producto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}