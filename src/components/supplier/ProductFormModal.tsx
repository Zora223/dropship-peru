// ============================================================
// PRODUCT FORM MODAL (Supplier) - v2 con validaciones estrictas
// 🆕 v16 FASE 3 - Igual calidad que vendor pero MÁS estricto
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../../contexts/ToastContext";
import {
  createProduct,
  updateProduct,
  uploadProductImage,
  deleteProductImage,
  type ProductFormData,
  type SupplierProduct,
} from "../../lib/supplier-products";
import {
  calculateSupplierProductQuality,
  SUPPLIER_CATEGORIES,
  suggestSupplierSku,
  type SupplierQualityIssue,
} from "../../lib/supplier-product-quality";

interface ProductFormModalProps {
  supplierId: string;
  product: SupplierProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const MAX_IMAGES = 8;
const MAX_IMAGE_MB = 5;
const MIN_IMAGE_DIMENSION = 400;

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
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [customCategory, setCustomCategory] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const isPreset = SUPPLIER_CATEGORIES.some(
        (c) => c.value === product.category || c.label === product.category
      );
      if (product.category && !isPreset) {
        setCustomCategory(true);
      }
    } else {
      setForm(EMPTY_FORM);
      setCustomCategory(false);
    }
    setAttemptedSubmit(false);
  }, [product, isOpen]);

  // ========== SCORE ==========
  const quality = useMemo(() => {
    return calculateSupplierProductQuality({
      name: form.name,
      description: form.description,
      base_price: form.base_price,
      suggested_price: form.suggested_price,
      stock: form.stock,
      sku: form.sku,
      category: form.category,
      images: form.images,
    });
  }, [form]);

  const canPublish = quality.canPublish;
  const wantsToPublish = form.is_active;
  const isBlocked = wantsToPublish && !canPublish;

  // ========== HANDLERS ==========
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "__custom__") {
      setCustomCategory(true);
      setForm((prev) => ({ ...prev, category: "" }));
    } else {
      setCustomCategory(false);
      setForm((prev) => ({ ...prev, category: value }));
    }
  };

  const handleSuggestSku = () => {
    if (!form.name.trim()) {
      toast.warning(
        "Sin nombre",
        "Escribe primero el nombre del producto para generar un SKU"
      );
      return;
    }
    setForm((prev) => ({ ...prev, sku: suggestSupplierSku(prev.name) }));
    toast.success("SKU generado", "Puedes editarlo si quieres");
  };

  const validateImage = (
    file: File
  ): Promise<{ valid: boolean; reason?: string }> => {
    return new Promise((resolve) => {
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
        resolve({
          valid: false,
          reason: `"${file.name}" pesa más de ${MAX_IMAGE_MB}MB`,
        });
        return;
      }
      if (!file.type.startsWith("image/")) {
        resolve({
          valid: false,
          reason: `"${file.name}" no es una imagen válida`,
        });
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        if (
          img.width < MIN_IMAGE_DIMENSION ||
          img.height < MIN_IMAGE_DIMENSION
        ) {
          resolve({
            valid: false,
            reason: `"${file.name}" es muy pequeña (${img.width}x${img.height}px). Mínimo ${MIN_IMAGE_DIMENSION}x${MIN_IMAGE_DIMENSION}px`,
          });
        } else {
          resolve({ valid: true });
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ valid: false, reason: `"${file.name}" está corrupta` });
      };
      img.src = url;
    });
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = MAX_IMAGES - form.images.length;
    if (remaining <= 0) {
      toast.warning(
        "Límite alcanzado",
        `Máximo ${MAX_IMAGES} fotos por producto`
      );
      e.target.value = "";
      return;
    }

    const filesArray = Array.from(files).slice(0, remaining);
    const rejected: string[] = [];
    const validFiles: File[] = [];

    for (const file of filesArray) {
      const check = await validateImage(file);
      if (check.valid) {
        validFiles.push(file);
      } else if (check.reason) {
        rejected.push(check.reason);
      }
    }

    if (rejected.length > 0) {
      toast.error(
        `${rejected.length} foto(s) rechazada(s)`,
        rejected.slice(0, 3).join(" · ") +
          (rejected.length > 3 ? ` (+${rejected.length - 3} más)` : "")
      );
    }

    if (validFiles.length === 0) {
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of validFiles) {
        const url = await uploadProductImage(file);
        newUrls.push(url);
      }
      setForm((prev) => ({
        ...prev,
        images: [...prev.images, ...newUrls],
      }));
      toast.success(
        `${newUrls.length} foto(s) subida(s)`,
        "Ya puedes ver la vista previa"
      );
    } catch (err) {
      console.error(err);
      toast.error(
        "Error al subir",
        err instanceof Error ? err.message : "No se pudo subir la imagen"
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = async (url: string) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img !== url),
    }));
    // Borrar del storage en background
    await deleteProductImage(url);
  };

  const makePrincipal = (url: string) => {
    setForm((prev) => ({
      ...prev,
      images: [url, ...prev.images.filter((u) => u !== url)],
    }));
    toast.info("Imagen principal actualizada");
  };

  // ========== SUBMIT ==========
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    if (form.is_active && !canPublish) {
      toast.warning(
        `Calidad insuficiente: ${quality.score}%`,
        `Necesitas 70%+ para publicar. Corrige los ${quality.errorCount} error(es) marcado(s).`
      );
      document
        .getElementById("supplier-quality-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (quality.errorCount > 0 && form.is_active) {
      toast.error("Corrige los errores marcados antes de publicar");
      return;
    }

    setSaving(true);
    try {
      if (product) {
        await updateProduct(product.id, form);
        toast.success("Producto actualizado", `${form.name} se actualizó.`);
      } else {
        await createProduct(supplierId, form);
        toast.success(
          "Producto creado",
          `${form.name} se agregó al catálogo.`
        );
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(
        "Error al guardar",
        err instanceof Error ? err.message : "No se pudo guardar"
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // ========== UI HELPERS ==========
  const totalImages = form.images.length;
  const nameLen = form.name.length;
  const descLen = form.description.length;

  const margin =
    form.base_price > 0 && form.suggested_price > form.base_price
      ? (
          ((form.suggested_price - form.base_price) / form.base_price) *
          100
        ).toFixed(1)
      : "0";

  const visibleIssues = showAllIssues
    ? quality.issues
    : quality.issues.filter((i) => i.type === "error" || i.type === "warning");

  const getIssueIcon = (type: SupplierQualityIssue["type"]) => {
    if (type === "error") return "❌";
    if (type === "warning") return "⚠️";
    return "✅";
  };

  const getIssueClasses = (type: SupplierQualityIssue["type"]) => {
    if (type === "error") return "bg-red-50 border-red-200 text-red-800";
    if (type === "warning")
      return "bg-yellow-50 border-yellow-200 text-yellow-800";
    return "bg-emerald-50 border-emerald-200 text-emerald-800";
  };

  const getScoreColorClasses = () => {
    if (quality.level === "excellent")
      return "from-emerald-500 to-green-500 text-white";
    if (quality.level === "good")
      return "from-green-500 to-lime-500 text-white";
    if (quality.level === "fair")
      return "from-yellow-400 to-amber-500 text-yellow-900";
    return "from-red-500 to-orange-500 text-white";
  };

  const getScoreBarColor = () => {
    if (quality.level === "excellent") return "bg-emerald-500";
    if (quality.level === "good") return "bg-green-500";
    if (quality.level === "fair") return "bg-yellow-400";
    return "bg-red-500";
  };

  const getFieldError = (field: string) => {
    if (!attemptedSubmit) return null;
    const issue = quality.issues.find(
      (i) => i.field === field && i.type === "error"
    );
    return issue?.message || null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {product ? "✏️ Editar producto" : "➕ Nuevo producto mayorista"}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              🏭 Estándar premium para catálogo. Score mín:{" "}
              <strong>70%</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* PANEL DE CALIDAD */}
          <div
            id="supplier-quality-panel"
            className={`sticky top-22 z-5 rounded-2xl bg-linear-to-br ${getScoreColorClasses()} p-4 shadow-lg`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{quality.levelEmoji}</span>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider opacity-90">
                    Calidad del producto
                  </div>
                  <div className="text-lg font-black leading-tight">
                    {quality.score}% · {quality.levelLabel}
                  </div>
                </div>
              </div>
              <div className="text-right">
                {quality.errorCount > 0 && (
                  <div className="text-xs font-bold">
                    ❌ {quality.errorCount} error
                    {quality.errorCount !== 1 && "es"}
                  </div>
                )}
                {quality.warningCount > 0 && (
                  <div className="text-xs font-bold opacity-90">
                    ⚠️ {quality.warningCount} sugerencia
                    {quality.warningCount !== 1 && "s"}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/20">
              <div
                className={`h-full ${getScoreBarColor()} transition-all duration-500`}
                style={{ width: `${quality.score}%` }}
              />
            </div>

            <div className="mt-2 text-xs font-medium">
              {quality.level === "poor" &&
                "🔒 Necesitas 70%+ para publicar en el catálogo"}
              {quality.level === "fair" &&
                "✓ Ya puedes publicar. Mejora los puntos para atraer más vendors"}
              {quality.level === "good" &&
                "🎯 ¡Excelente! Los vendors querrán este producto"}
              {quality.level === "excellent" &&
                "🌟 ¡Calidad premium! Tu producto será destacado"}
            </div>
          </div>

          {/* LISTA DE ISSUES */}
          {visibleIssues.length > 0 && (
            <div className="space-y-1.5">
              {visibleIssues
                .slice(0, showAllIssues ? undefined : 5)
                .map((issue, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${getIssueClasses(
                      issue.type
                    )}`}
                  >
                    <span className="shrink-0">
                      {getIssueIcon(issue.type)}
                    </span>
                    <span className="flex-1">{issue.message}</span>
                  </div>
                ))}
              {!showAllIssues && quality.issues.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllIssues(true)}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-700 underline"
                >
                  Ver {quality.issues.length - 5} más...
                </button>
              )}
              {showAllIssues && (
                <button
                  type="button"
                  onClick={() => setShowAllIssues(false)}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-700 underline"
                >
                  Ver menos
                </button>
              )}
            </div>
          )}

          {/* FOTOS */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-gray-700">
                📸 Fotos del producto <span className="text-red-500">*</span>
              </label>
              <span
                className={`text-xs font-medium ${
                  totalImages === 0
                    ? "text-red-600"
                    : totalImages < 4
                    ? "text-yellow-600"
                    : "text-emerald-600"
                }`}
              >
                {totalImages}/{MAX_IMAGES} fotos
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              💡 Sube 4+ fotos desde ángulos diferentes (frente, atrás,
              detalle, en uso)
            </p>

            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {form.images.map((url, i) => (
                <div
                  key={url}
                  className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                    i === 0
                      ? "border-amber-400 ring-2 ring-amber-100"
                      : "border-gray-200"
                  }`}
                >
                  <img
                    src={url}
                    alt={`Producto ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {i === 0 ? (
                    <span className="absolute left-1 top-1 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold uppercase text-white shadow">
                      Principal
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => makePrincipal(url)}
                      className="absolute left-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-bold uppercase text-white shadow opacity-0 transition group-hover:opacity-100"
                    >
                      ⭐ Hacer principal
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(url)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white opacity-0 transition group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              ))}

              {totalImages < MAX_IMAGES && (
                <label
                  className={`flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition ${
                    totalImages === 0
                      ? "border-red-300 bg-red-50/50 hover:border-red-500 hover:bg-red-50"
                      : "border-gray-300 hover:border-amber-500 hover:bg-amber-50/30"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={uploading || saving}
                    className="hidden"
                  />
                  {uploading ? (
                    <>
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                      <span className="mt-1 text-[10px] font-semibold text-amber-600">
                        Subiendo...
                      </span>
                    </>
                  ) : (
                    <>
                      <div
                        className={`text-2xl ${
                          totalImages === 0
                            ? "text-red-400"
                            : "text-gray-400"
                        }`}
                      >
                        +
                      </div>
                      <div
                        className={`mt-1 text-[10px] font-semibold ${
                          totalImages === 0
                            ? "text-red-500"
                            : "text-gray-500"
                        }`}
                      >
                        {totalImages === 0 ? "Obligatorio" : "Agregar"}
                      </div>
                    </>
                  )}
                </label>
              )}
            </div>

            <p className="mt-2 text-xs text-gray-400">
              JPG, PNG o WebP. Máximo {MAX_IMAGE_MB}MB. Mínimo{" "}
              {MIN_IMAGE_DIMENSION}x{MIN_IMAGE_DIMENSION}px.
            </p>
          </div>

          {/* NOMBRE */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-gray-700">
                Nombre del producto <span className="text-red-500">*</span>
              </label>
              <span
                className={`text-xs font-medium ${
                  nameLen === 0
                    ? "text-red-600"
                    : nameLen < 15
                    ? "text-red-600"
                    : nameLen > 100
                    ? "text-red-600"
                    : "text-emerald-600"
                }`}
              >
                {nameLen}/15 mín
              </span>
            </div>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={120}
              placeholder="Ej: Zapatos de seguridad Caterpillar puntera acero color negro"
              className={`mt-1.5 w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:bg-white ${
                getFieldError("name")
                  ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  : "border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              }`}
              required
            />
            <p className="mt-1 text-xs text-gray-400">
              💡 Incluye: marca + tipo + características (mín 15 caracteres)
            </p>
          </div>

          {/* DESCRIPCIÓN */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-gray-700">
                Descripción <span className="text-red-500">*</span>
              </label>
              <span
                className={`text-xs font-medium ${
                  descLen === 0
                    ? "text-red-600"
                    : descLen < 100
                    ? "text-red-600"
                    : descLen < 200
                    ? "text-yellow-600"
                    : "text-emerald-600"
                }`}
              >
                {descLen}/100 mín
              </span>
            </div>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={5}
              maxLength={2000}
              placeholder="Ej: Zapatos de seguridad Caterpillar con puntera de acero certificada ASTM F2413-18. Suela antideslizante de goma vulcanizada resistente a hidrocarburos. Interior acolchado transpirable. Ideal para construcción, minería, industria. Tallas 38-46 disponibles."
              className={`mt-1.5 w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:bg-white ${
                getFieldError("description")
                  ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  : "border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              }`}
            />
            <p className="mt-1 text-xs text-gray-400">
              💡 Incluye: material, medidas, certificaciones, cuidados,
              beneficios (mín 100 caracteres)
            </p>
          </div>

          {/* SKU + CATEGORÍA */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-700">
                  SKU <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleSuggestSku}
                  className="text-[11px] font-semibold text-amber-600 hover:text-amber-800"
                >
                  🎲 Generar
                </button>
              </div>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                maxLength={30}
                placeholder="PROV-COD-001"
                className={`mt-1.5 w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:bg-white font-mono uppercase ${
                  getFieldError("sku")
                    ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    : "border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Categoría <span className="text-red-500">*</span>
              </label>
              {!customCategory ? (
                <select
                  value={form.category}
                  onChange={handleCategoryChange}
                  className={`mt-1.5 w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:bg-white ${
                    getFieldError("category")
                      ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                      : "border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  }`}
                  required
                >
                  <option value="">-- Selecciona --</option>
                  {SUPPLIER_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.label}>
                      {cat.label}
                    </option>
                  ))}
                  <option value="__custom__">➕ Personalizada</option>
                </select>
              ) : (
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    maxLength={40}
                    placeholder="Categoría personalizada"
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:bg-white"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCustomCategory(false);
                      setForm((prev) => ({ ...prev, category: "" }));
                    }}
                    className="rounded-xl border border-gray-200 px-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* PRECIOS */}
          <div className="rounded-2xl bg-amber-50 p-4">
            <h3 className="mb-3 text-sm font-bold text-amber-900">
              💰 Precios
            </h3>
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
                      setForm({
                        ...form,
                        base_price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition ${
                      getFieldError("base_price")
                        ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                        : "border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    }`}
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
                      setForm({
                        ...form,
                        suggested_price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition ${
                      getFieldError("suggested_price")
                        ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                        : "border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    }`}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-xl bg-white p-3 text-sm">
              <span className="text-gray-600">📊 Margen para el vendor:</span>
              <span
                className={`text-lg font-bold ${
                  parseFloat(margin) >= 20
                    ? "text-emerald-600"
                    : "text-yellow-600"
                }`}
              >
                +{margin}%
              </span>
            </div>
            <p className="mt-2 text-xs text-amber-800">
              💡 Recomendado: mínimo 20% de margen para atraer vendors
            </p>
          </div>

          {/* STOCK */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Stock disponible <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={form.stock || ""}
              onChange={(e) =>
                setForm({ ...form, stock: parseInt(e.target.value) || 0 })
              }
              placeholder="0"
              className={`w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:bg-white ${
                getFieldError("stock")
                  ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  : "border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              }`}
              required
            />
            {form.stock === 0 && (
              <p className="mt-1 text-xs text-red-600">
                ⚠️ Sin stock, los vendors no podrán venderlo.
              </p>
            )}
            {form.stock > 0 && form.stock < 10 && (
              <p className="mt-1 text-xs text-yellow-600">
                ⚠️ Stock bajo. Considera aumentarlo.
              </p>
            )}
          </div>

          {/* PUBLICAR */}
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-xl p-4 border-2 transition ${
              isBlocked
                ? "border-red-200 bg-red-50"
                : form.is_active
                ? "border-emerald-200 bg-emerald-50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.checked })
              }
              className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                {form.is_active
                  ? "🌐 Publicar en catálogo"
                  : "📁 Guardar como borrador"}
                {isBlocked && (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    🔒 BLOQUEADO
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {form.is_active
                  ? isBlocked
                    ? `Necesitas ${70 - quality.score}% más de calidad`
                    : "Los vendors podrán importarlo a sus tiendas"
                  : "Solo tú lo verás. Podrás publicarlo cuando quieras."}
              </div>
            </div>
          </label>

          {/* BOTONES */}
          <div className="flex gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || uploading}
              className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || uploading || (isBlocked && form.is_active)}
              className={`flex-1 rounded-xl py-3 text-sm font-semibold text-white shadow transition disabled:opacity-50 disabled:cursor-not-allowed ${
                isBlocked && form.is_active
                  ? "bg-gray-400"
                  : "bg-amber-500 hover:bg-amber-600"
              }`}
            >
              {saving
                ? "Guardando..."
                : isBlocked && form.is_active
                ? `🔒 Calidad insuficiente (${quality.score}%)`
                : product
                ? "Guardar cambios"
                : form.is_active
                ? "🚀 Publicar producto"
                : "💾 Guardar borrador"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}