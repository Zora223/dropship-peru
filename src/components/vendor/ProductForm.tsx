import { useState, useEffect, useMemo, useRef } from "react";
import {
  createOwnProduct,
  updateMyProduct,
  uploadProductImages,
} from "../../lib/vendor-products";
import { deleteFileByUrl } from "../../lib/storage";
import { useToast } from "../../contexts/ToastContext";
import {
  calculateProductQuality,
  PREDEFINED_CATEGORIES,
  suggestSku,
  type QualityIssue,
} from "../../lib/product-quality";
import type { DbProduct } from "../../types/database";

interface ProductFormProps {
  storeId: string;
  onClose: () => void;
  onSaved: (product: DbProduct) => void;
  initial?: DbProduct | null;
}

const MAX_IMAGES = 8;
const MAX_IMAGE_MB = 5;
const MIN_IMAGE_DIMENSION = 400;

export default function ProductForm({
  storeId,
  onClose,
  onSaved,
  initial,
}: ProductFormProps) {
  const toast = useToast();

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    compare_at_price: "",
    stock: "",
    sku: "",
    category: "",
    brand: "",
    is_active: true,
    featured: false,
  });

  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [removedExistingImages, setRemovedExistingImages] = useState<string[]>(
    []
  );
  const [saving, setSaving] = useState(false);
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [customCategory, setCustomCategory] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = Boolean(initial);

  // ========== INIT ==========
  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        description: initial.description ?? "",
        price: String(initial.price),
        compare_at_price: initial.compare_at_price
          ? String(initial.compare_at_price)
          : "",
        stock: String(initial.stock),
        sku: initial.sku ?? "",
        category: initial.category ?? "",
        brand: (initial as any).brand ?? "",
        is_active: initial.is_active,
        featured: initial.featured,
      });
      setExistingImages(initial.images ?? []);

      const isPreset = PREDEFINED_CATEGORIES.some(
        (c) => c.value === initial.category || c.label === initial.category
      );
      if (initial.category && !isPreset) {
        setCustomCategory(true);
      }
    }
  }, [initial]);

  useEffect(() => {
    if (initial && initial.source === "catalog") {
      console.warn("No se puede editar productos del catálogo desde aquí.");
      onClose();
    }
  }, [initial, onClose]);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========== SCORE ==========
  const quality = useMemo(() => {
    const totalImages = existingImages.length + pendingFiles.length;
    return calculateProductQuality({
      name: form.name,
      description: form.description,
      price: parseFloat(form.price) || 0,
      stock: parseInt(form.stock, 10) || 0,
      sku: form.sku,
      category: form.category,
      brand: form.brand,
      images: Array(totalImages).fill("dummy"),
    });
  }, [form, existingImages, pendingFiles]);

  const canPublish = quality.canPublish;
  const wantsToPublish = form.is_active;
  const isBlocked = wantsToPublish && !canPublish;

  // ========== HANDLERS ==========
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

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
    setForm((prev) => ({ ...prev, sku: suggestSku(prev.name) }));
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const totalCurrent = existingImages.length + pendingFiles.length;
    const remaining = MAX_IMAGES - totalCurrent;

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
    const validPreviews: string[] = [];

    for (const file of filesArray) {
      const check = await validateImage(file);
      if (check.valid) {
        validFiles.push(file);
        validPreviews.push(URL.createObjectURL(file));
      } else if (check.reason) {
        rejected.push(check.reason);
      }
    }

    if (files.length > remaining) {
      toast.warning(
        "Algunas fotos se ignoraron",
        `Solo se agregaron ${validFiles.length} (máximo ${MAX_IMAGES} en total)`
      );
    }

    setPendingFiles((prev) => [...prev, ...validFiles]);
    setPreviews((prev) => [...prev, ...validPreviews]);

    // Mostrar errores agrupados
    if (rejected.length > 0) {
      toast.error(
        `${rejected.length} foto${rejected.length > 1 ? "s" : ""} rechazada${
          rejected.length > 1 ? "s" : ""
        }`,
        rejected.slice(0, 3).join(" · ") +
          (rejected.length > 3 ? ` (+${rejected.length - 3} más)` : "")
      );
    } else if (validFiles.length > 0) {
      toast.success(
        `${validFiles.length} foto${validFiles.length > 1 ? "s" : ""} agregada${
          validFiles.length > 1 ? "s" : ""
        }`
      );
    }

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

  const makeExistingPrincipal = (url: string) => {
    setExistingImages((prev) => {
      const filtered = prev.filter((u) => u !== url);
      return [url, ...filtered];
    });
    toast.info("Imagen principal actualizada");
  };

  // ========== SUBMIT ==========
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    if (form.is_active && !canPublish) {
      toast.warning(
        `Calidad insuficiente: ${quality.score}%`,
        `Necesitas 60%+ para publicar. Corrige los ${quality.errorCount} error${
          quality.errorCount !== 1 ? "es" : ""
        } marcado${quality.errorCount !== 1 ? "s" : ""}.`
      );
      document
        .getElementById("quality-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (quality.errorCount > 0 && form.is_active) {
      toast.error("Corrige los errores marcados antes de publicar");
      document
        .getElementById("quality-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSaving(true);
    try {
      let newImageUrls: string[] = [];
      if (pendingFiles.length > 0) {
        newImageUrls = await uploadProductImages(storeId, pendingFiles);
      }

      const allImages = [...existingImages, ...newImageUrls];

      const payload: any = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: parseFloat(form.price),
        compare_at_price: form.compare_at_price
          ? parseFloat(form.compare_at_price)
          : null,
        stock: parseInt(form.stock, 10),
        sku: form.sku.trim() || null,
        category: form.category.trim() || null,
        brand: form.brand.trim() || null,
        is_active: form.is_active,
        featured: form.featured,
        images: allImages,
        quality_score: quality.score,
      };

      let result: DbProduct;
      if (isEditing && initial) {
        result = await updateMyProduct(initial.id, payload);
      } else {
        result = await createOwnProduct({ storeId, ...payload });
      }

      if (isEditing && initial?.source === "own") {
        for (const url of removedExistingImages) {
          try {
            await deleteFileByUrl("product-images", url);
          } catch (err) {
            console.warn("Could not delete image:", err);
          }
        }
      }

      previews.forEach((url) => URL.revokeObjectURL(url));

      // ✅ Toast de éxito
      toast.success(
        isEditing ? "Producto actualizado" : "Producto creado",
        form.is_active
          ? `"${result.name}" ya está publicado en tu tienda`
          : `"${result.name}" se guardó como borrador`
      );

      onSaved(result);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(
        "No se pudo guardar el producto",
        err instanceof Error ? err.message : "Intenta de nuevo"
      );
    } finally {
      setSaving(false);
    }
  };

  // ========== UI HELPERS ==========
  const totalImages = existingImages.length + pendingFiles.length;
  const nameLen = form.name.length;
  const descLen = form.description.length;

  const visibleIssues = showAllIssues
    ? quality.issues
    : quality.issues.filter((i) => i.type === "error" || i.type === "warning");

  const getIssueIcon = (type: QualityIssue["type"]) => {
    if (type === "error") return "❌";
    if (type === "warning") return "⚠️";
    return "✅";
  };

  const getIssueClasses = (type: QualityIssue["type"]) => {
    if (type === "error") return "bg-red-50 border-red-200 text-red-800";
    if (type === "warning")
      return "bg-yellow-50 border-yellow-200 text-yellow-800";
    return "bg-emerald-50 border-emerald-200 text-emerald-800";
  };

  const getScoreColorClasses = () => {
    if (quality.level === "excellent")
      return "from-emerald-500 to-green-500 text-white";
    if (quality.level === "good") return "from-green-500 to-lime-500 text-white";
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
              {isEditing ? "Editar producto" : "Nuevo producto propio"}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Completa todos los campos para publicar con calidad ⭐
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
          {/* PANEL DE CALIDAD (sticky) */}
          <div
            id="quality-panel"
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
                className={`h-full ${getScoreBarColor()} transition-all duration-500 ease-out`}
                style={{ width: `${quality.score}%` }}
              />
            </div>

            <div className="mt-2 text-xs font-medium">
              {quality.level === "poor" &&
                "🔒 Necesitas 60%+ para publicar el producto"}
              {quality.level === "fair" &&
                "✓ Ya puedes publicar, pero mejora los puntos marcados para vender más"}
              {quality.level === "good" &&
                "🎯 ¡Bien! Tu producto está listo para vender"}
              {quality.level === "excellent" &&
                "🌟 ¡Excelente calidad! Tu producto destacará"}
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
                    <span className="shrink-0">{getIssueIcon(issue.type)}</span>
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
                    : totalImages < 3
                    ? "text-yellow-600"
                    : "text-emerald-600"
                }`}
              >
                {totalImages}/{MAX_IMAGES} fotos
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              💡 Sube 3+ fotos desde ángulos diferentes para vender más
            </p>

            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {existingImages.map((url, i) => (
                <div
                  key={`existing-${i}`}
                  className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                    i === 0
                      ? "border-rose-400 ring-2 ring-rose-100"
                      : "border-gray-200"
                  }`}
                >
                  <img
                    src={url}
                    alt={`Imagen ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {i === 0 ? (
                    <span className="absolute left-1 top-1 rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow">
                      Principal
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => makeExistingPrincipal(url)}
                      className="absolute left-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow opacity-0 transition group-hover:opacity-100"
                    >
                      ⭐ Hacer principal
                    </button>
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
                <div
                  key={`pending-${i}`}
                  className="group relative aspect-square overflow-hidden rounded-xl border-2 border-emerald-300"
                >
                  <img
                    src={url}
                    alt={`Nueva ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
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

              {totalImages < MAX_IMAGES && (
                <label
                  className={`flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition ${
                    totalImages === 0
                      ? "border-red-300 bg-red-50/50 hover:border-red-500 hover:bg-red-50"
                      : "border-gray-300 hover:border-rose-500 hover:bg-rose-50/30"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={saving}
                  />
                  <div
                    className={`text-2xl ${
                      totalImages === 0 ? "text-red-400" : "text-gray-400"
                    }`}
                  >
                    +
                  </div>
                  <div
                    className={`mt-1 text-[10px] font-semibold ${
                      totalImages === 0 ? "text-red-500" : "text-gray-500"
                    }`}
                  >
                    {totalImages === 0 ? "Obligatorio" : "Agregar"}
                  </div>
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
                    : nameLen < 10
                    ? "text-yellow-600"
                    : nameLen > 100
                    ? "text-red-600"
                    : "text-emerald-600"
                }`}
              >
                {nameLen}/100
              </span>
            </div>
            <input
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              maxLength={120}
              className={`mt-1.5 w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:bg-white ${
                getFieldError("name")
                  ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  : "border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              }`}
              placeholder="Ej: Polo de algodón manga corta color negro talla M"
            />
            <p className="mt-1 text-xs text-gray-400">
              💡 Sé específico: material + tipo + color + talla
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
                    : descLen < 50
                    ? "text-red-600"
                    : descLen < 150
                    ? "text-yellow-600"
                    : "text-emerald-600"
                }`}
              >
                {descLen}/50 mín
              </span>
            </div>
            <textarea
              name="description"
              rows={4}
              value={form.description}
              onChange={handleChange}
              maxLength={1500}
              className={`mt-1.5 w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:bg-white ${
                getFieldError("description")
                  ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  : "border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              }`}
              placeholder="Ej: Polo 100% algodón peinado, corte regular, cuello redondo reforzado. Ideal para uso diario. Disponible en tallas S, M, L, XL. Lavable en agua fría, no usar lejía."
            />
            <p className="mt-1 text-xs text-gray-400">
              💡 Incluye: material, medidas, cuidados, beneficios, para qué
              sirve
            </p>
          </div>

          {/* PRECIOS */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Precio venta (S/) <span className="text-red-500">*</span>
              </label>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.price}
                onChange={handleChange}
                className={`mt-1.5 w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:bg-white ${
                  getFieldError("price")
                    ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    : "border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                }`}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Precio antes{" "}
                <span className="text-gray-400">(opcional)</span>
              </label>
              <input
                name="compare_at_price"
                type="number"
                step="0.01"
                min="0"
                value={form.compare_at_price}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                placeholder="0.00"
              />
              <p className="mt-1 text-xs text-gray-400">Se mostrará tachado</p>
            </div>
          </div>

          {/* STOCK + SKU */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Stock <span className="text-red-500">*</span>
              </label>
              <input
                name="stock"
                type="number"
                min="0"
                required
                value={form.stock}
                onChange={handleChange}
                className={`mt-1.5 w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:bg-white ${
                  getFieldError("stock")
                    ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    : "border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                }`}
                placeholder="0"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-700">
                  Código (SKU)
                </label>
                <button
                  type="button"
                  onClick={handleSuggestSku}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-800"
                >
                  🎲 Generar
                </button>
              </div>
              <input
                name="sku"
                value={form.sku}
                onChange={handleChange}
                maxLength={30}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20 font-mono uppercase"
                placeholder="COD-001"
              />
            </div>
          </div>

          {/* CATEGORÍA */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Categoría <span className="text-red-500">*</span>
            </label>

            {!customCategory ? (
              <select
                name="category"
                value={form.category}
                onChange={handleCategoryChange}
                className={`mt-1.5 w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:bg-white ${
                  getFieldError("category")
                    ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    : "border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                }`}
              >
                <option value="">-- Selecciona una categoría --</option>
                {PREDEFINED_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.label}>
                    {cat.label}
                  </option>
                ))}
                <option value="__custom__">➕ Crear categoría personalizada</option>
              </select>
            ) : (
              <div className="mt-1.5 flex gap-2">
                <input
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  maxLength={40}
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                  placeholder="Ej: Productos gourmet"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setCustomCategory(false);
                    setForm((prev) => ({ ...prev, category: "" }));
                  }}
                  className="rounded-xl border border-gray-200 px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* MARCA */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Marca{" "}
              <span className="text-gray-400">(opcional pero recomendado)</span>
            </label>
            <input
              name="brand"
              value={form.brand}
              onChange={handleChange}
              maxLength={50}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
              placeholder="Ej: Nike, Adidas, Casera, Sin marca"
            />
          </div>

          {/* FEATURED */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-linear-to-br from-rose-50 to-orange-50 p-4">
            <input
              name="featured"
              type="checkbox"
              checked={form.featured}
              onChange={handleChange}
              className="h-5 w-5 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
            />
            <div>
              <div className="text-sm font-semibold text-gray-900">
                🔥 Marcar como "Más vendido"
              </div>
              <div className="text-xs text-gray-500">
                Destaca este producto en tu tienda con una insignia llamativa
              </div>
            </div>
          </label>

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
              name="is_active"
              type="checkbox"
              checked={form.is_active}
              onChange={handleChange}
              className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                {form.is_active
                  ? "🌐 Publicar en mi tienda"
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
                    ? `Necesitas ${60 - quality.score}% más de calidad para publicar`
                    : "Los clientes podrán verlo y comprarlo"
                  : "Solo tú lo verás. Podrás publicarlo cuando quieras."}
              </div>
            </div>
          </label>

          {/* BOTONES */}
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
              disabled={saving || (isBlocked && form.is_active)}
              className={`flex-1 rounded-xl py-3 text-sm font-semibold shadow transition disabled:opacity-50 disabled:cursor-not-allowed ${
                isBlocked && form.is_active
                  ? "bg-gray-300 text-gray-500"
                  : "bg-gray-900 text-white hover:bg-gray-800"
              }`}
            >
              {saving
                ? "Guardando..."
                : isBlocked && form.is_active
                ? `🔒 Calidad insuficiente (${quality.score}%)`
                : isEditing
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