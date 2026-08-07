// src/components/vendor/ProductLaunchKitViewer.tsx
// 🎨 Product Launch AI - Dashboard visual del kit generado

import { useState } from "react";
import {
  downloadEnhancedImage,
  copyToClipboard,
  getCategoryInfo,
  formatGenerationTime,
  type LaunchKit,
} from "../../lib/product-launch-ai";

interface ProductLaunchKitViewerProps {
  isOpen: boolean;
  kit: LaunchKit;
  onClose: () => void;
}

type TabId = "image" | "instagram" | "facebook" | "hashtags" | "whatsapp" | "email";

export default function ProductLaunchKitViewer({
  isOpen,
  kit,
  onClose,
}: ProductLaunchKitViewerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("image");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [imageFullscreen, setImageFullscreen] = useState(false);

  const categoryInfo = getCategoryInfo(kit.detected_category);

  const handleCopy = async (text: string, field: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleDownload = async () => {
    if (!kit.enhanced_image_url) return;
    try {
      await downloadEnhancedImage(
        kit.enhanced_image_url,
        `${kit.detected_category}-${Date.now()}.png`
      );
    } catch {
      alert("Error al descargar la imagen");
    }
  };

  const shareOnWhatsApp = () => {
    if (!kit.whatsapp_message) return;
    const url = `https://wa.me/?text=${encodeURIComponent(kit.whatsapp_message)}`;
    window.open(url, "_blank");
  };

  const shareOnFacebook = () => {
    if (!kit.enhanced_image_url) return;
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      kit.enhanced_image_url
    )}`;
    window.open(url, "_blank");
  };

  if (!isOpen) return null;

  const TABS: { id: TabId; label: string; icon: string; hasContent: boolean }[] = [
    { id: "image", label: "Imagen", icon: "📸", hasContent: !!kit.enhanced_image_url },
    { id: "instagram", label: "Instagram", icon: "📷", hasContent: !!kit.caption_instagram },
    { id: "facebook", label: "Facebook", icon: "📘", hasContent: !!kit.caption_facebook },
    { id: "hashtags", label: "Hashtags", icon: "🏷️", hasContent: !!kit.hashtags?.length },
    { id: "whatsapp", label: "WhatsApp", icon: "💬", hasContent: !!kit.whatsapp_message },
    { id: "email", label: "Email", icon: "📧", hasContent: !!kit.email_body },
  ];

  return (
    <>
      {/* Modal fullscreen imagen */}
      {imageFullscreen && kit.enhanced_image_url && (
        <div
         // Buscar: className="fixed inset-0 z-[60]..."
// Reemplazar por:
className="fixed inset-0 z-60 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setImageFullscreen(false)}
        >
          <img
            src={kit.enhanced_image_url}
            alt="Enhanced product"
            className="max-h-full max-w-full object-contain"
          />
          <button
            className="absolute top-4 right-4 rounded-full bg-white/20 p-3 text-white hover:bg-white/40"
            onClick={() => setImageFullscreen(false)}
          >
            ×
          </button>
        </div>
      )}

      {/* Modal principal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-5xl max-h-[95vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-linear-to-br from-emerald-500 via-teal-500 to-cyan-500 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-4xl">🎉</div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider opacity-90">
                    Kit Generado
                  </div>
                  <h2 className="text-xl font-black">
                    ¡Tu marketing está listo!
                  </h2>
                </div>
              </div>

              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-2xl text-white transition hover:bg-white/30"
              >
                ×
              </button>
            </div>

            {/* Info badges */}
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 backdrop-blur">
                <span className="text-lg">{categoryInfo.emoji}</span>
                <span className="text-xs font-bold">{categoryInfo.label}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 backdrop-blur">
                <span className="text-xs font-bold">
                  ⚡ {kit.credits_used} créditos usados
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 backdrop-blur">
                <span className="text-xs font-bold">
                  ⏱️ {formatGenerationTime(kit.generation_time_ms)}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 bg-gray-50 overflow-x-auto">
            <div className="flex min-w-max">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={!tab.hasContent}
                  className={`shrink-0 px-4 py-3 text-sm font-bold transition ${
                    activeTab === tab.id
                      ? "border-b-2 border-emerald-500 text-emerald-600 bg-white"
                      : tab.hasContent
                      ? "text-gray-600 hover:text-gray-900 hover:bg-white"
                      : "text-gray-300 cursor-not-allowed"
                  }`}
                >
                  <span className="mr-1">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* IMAGEN */}
            {activeTab === "image" && kit.enhanced_image_url && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Antes */}
                  <div>
                    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                      Antes
                    </div>
                    <div className="rounded-2xl overflow-hidden bg-gray-100 border-2 border-gray-200">
                      <img
                        src={kit.original_image_url}
                        alt="Original"
                        className="w-full h-auto object-contain aspect-square"
                      />
                    </div>
                  </div>

                  {/* Después */}
                  <div>
                    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-600">
                      ✨ Después (AI)
                    </div>
                    <div
                      className="rounded-2xl overflow-hidden bg-gray-100 border-2 border-emerald-300 cursor-pointer hover:border-emerald-500 transition shadow-lg"
                      onClick={() => setImageFullscreen(true)}
                    >
                      <img
                        src={kit.enhanced_image_url}
                        alt="Enhanced"
                        className="w-full h-auto object-contain aspect-square"
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500 text-center">
                      Clic para ver en pantalla completa
                    </p>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex flex-wrap gap-2 pt-4">
                  <button
                    onClick={handleDownload}
                    className="flex-1 min-w-40 rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition"
                  >
                    📥 Descargar imagen
                  </button>
                  <button
                    onClick={shareOnFacebook}
                    className="flex-1 min-w-40 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow hover:bg-blue-700 transition"
                  >
                    📘 Compartir en Facebook
                  </button>
                </div>
              </div>
            )}

            {/* INSTAGRAM */}
            {activeTab === "instagram" && kit.caption_instagram && (
              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-pink-200 bg-linear-to-br from-pink-50 to-purple-50 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-2xl">📷</span>
                    <span className="text-sm font-bold text-pink-900">
                      Caption para Instagram
                    </span>
                    <span className="ml-auto text-xs text-gray-500">
                      {kit.caption_instagram.length} caracteres
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                    {kit.caption_instagram}
                  </p>
                </div>

                <button
                  onClick={() => handleCopy(kit.caption_instagram!, "instagram")}
                  className={`w-full rounded-xl py-3 text-sm font-bold transition ${
                    copiedField === "instagram"
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  {copiedField === "instagram" ? "✅ Copiado" : "📋 Copiar caption"}
                </button>
              </div>
            )}

            {/* FACEBOOK */}
            {activeTab === "facebook" && kit.caption_facebook && (
              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-blue-200 bg-linear-to-br from-blue-50 to-indigo-50 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-2xl">📘</span>
                    <span className="text-sm font-bold text-blue-900">
                      Caption para Facebook
                    </span>
                    <span className="ml-auto text-xs text-gray-500">
                      {kit.caption_facebook.length} caracteres
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                    {kit.caption_facebook}
                  </p>
                </div>

                <button
                  onClick={() => handleCopy(kit.caption_facebook!, "facebook")}
                  className={`w-full rounded-xl py-3 text-sm font-bold transition ${
                    copiedField === "facebook"
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  {copiedField === "facebook" ? "✅ Copiado" : "📋 Copiar caption"}
                </button>
              </div>
            )}

            {/* HASHTAGS */}
            {activeTab === "hashtags" && kit.hashtags && kit.hashtags.length > 0 && (
              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-purple-200 bg-linear-to-br from-purple-50 to-pink-50 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-2xl">🏷️</span>
                    <span className="text-sm font-bold text-purple-900">
                      Hashtags optimizados ({kit.hashtags.length})
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {kit.hashtags.map((tag, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-white border border-purple-200 px-3 py-1 text-xs font-semibold text-purple-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 rounded-lg bg-white p-3 border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1 font-semibold">
                      Copia todos:
                    </p>
                    <p className="text-sm text-gray-800 leading-relaxed">
                      {kit.hashtags.join(" ")}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleCopy(kit.hashtags!.join(" "), "hashtags")}
                  className={`w-full rounded-xl py-3 text-sm font-bold transition ${
                    copiedField === "hashtags"
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  {copiedField === "hashtags"
                    ? "✅ Copiado"
                    : "📋 Copiar todos los hashtags"}
                </button>
              </div>
            )}

            {/* WHATSAPP */}
            {activeTab === "whatsapp" && kit.whatsapp_message && (
              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-emerald-200 bg-linear-to-br from-emerald-50 to-green-50 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-2xl">💬</span>
                    <span className="text-sm font-bold text-emerald-900">
                      Mensaje para WhatsApp Broadcast
                    </span>
                    <span className="ml-auto text-xs text-gray-500">
                      {kit.whatsapp_message.length} caracteres
                    </span>
                  </div>

                  {/* Preview estilo WhatsApp */}
                  <div className="rounded-2xl bg-[#dcf8c6] p-4 shadow-sm">
                    <p className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                      {kit.whatsapp_message}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      handleCopy(kit.whatsapp_message!, "whatsapp")
                    }
                    className={`flex-1 min-w-40 rounded-xl py-3 text-sm font-bold transition ${
                      copiedField === "whatsapp"
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-900 text-white hover:bg-gray-800"
                    }`}
                  >
                    {copiedField === "whatsapp" ? "✅ Copiado" : "📋 Copiar mensaje"}
                  </button>
                  <button
                    onClick={shareOnWhatsApp}
                    className="flex-1 min-w-40 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-600 transition"
                  >
                    💬 Enviar por WhatsApp
                  </button>
                </div>
              </div>
            )}

            {/* EMAIL */}
            {activeTab === "email" && kit.email_body && (
              <div className="space-y-4">
                {/* Asunto */}
                <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
                  <div className="mb-1 text-xs font-bold uppercase tracking-wider text-orange-700">
                    Asunto del email
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-gray-900">
                      {kit.email_subject}
                    </p>
                    <button
                      onClick={() =>
                        handleCopy(kit.email_subject!, "email-subject")
                      }
                      className={`shrink-0 rounded-lg px-3 py-1 text-xs font-bold transition ${
                        copiedField === "email-subject"
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-900 text-white hover:bg-gray-800"
                      }`}
                    >
                      {copiedField === "email-subject" ? "✅" : "📋"}
                    </button>
                  </div>
                </div>

                {/* Cuerpo */}
                <div className="rounded-2xl border-2 border-orange-200 bg-white p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-2xl">📧</span>
                    <span className="text-sm font-bold text-orange-900">
                      Cuerpo del email
                    </span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    <p className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                      {kit.email_body}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleCopy(kit.email_body!, "email-body")}
                  className={`w-full rounded-xl py-3 text-sm font-bold transition ${
                    copiedField === "email-body"
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  {copiedField === "email-body"
                    ? "✅ Copiado"
                    : "📋 Copiar cuerpo del email"}
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-gray-500">
                🍌 Generado con Nano Banana + Llama 3.3
              </p>
              <button
                onClick={onClose}
                className="rounded-xl bg-gray-900 px-6 py-2 text-sm font-bold text-white hover:bg-gray-800 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}