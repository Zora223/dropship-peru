// src/components/vendor/ProductLaunchKitViewer.tsx
// 🎨 v2 - Dashboard con publicación 1-tap a todas las redes

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

type TabId =
  | "publish"
  | "image"
  | "instagram"
  | "facebook"
  | "hashtags"
  | "whatsapp"
  | "email";

export default function ProductLaunchKitViewer({
  isOpen,
  kit,
  onClose,
}: ProductLaunchKitViewerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("publish");
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

  // ========================================
  // 🚀 PUBLICACIÓN 1-TAP
  // ========================================

  // 📸 INSTAGRAM - Copia caption + hashtags y abre Instagram
  const publishInstagram = async () => {
    const fullCaption = `${kit.caption_instagram || ""}\n\n${
      kit.hashtags?.join(" ") || ""
    }`;
    await copyToClipboard(fullCaption);
    setCopiedField("ig-full");
    setTimeout(() => setCopiedField(null), 3000);

    // Detectar si es móvil
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);

    if (isMobile) {
      // En móvil: intentar abrir la app
      window.location.href = "instagram://";
      // Fallback: web
      setTimeout(() => {
        window.open("https://www.instagram.com/", "_blank");
      }, 500);
    } else {
      window.open("https://www.instagram.com/", "_blank");
    }
  };

  // 📘 FACEBOOK - Usa share dialog oficial
  const publishFacebook = () => {
    const url = kit.enhanced_image_url || window.location.href;
    const quote = kit.caption_facebook || "";
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      url
    )}&quote=${encodeURIComponent(quote)}`;
    window.open(fbUrl, "_blank", "width=600,height=700");
  };

  // 💬 WHATSAPP - Deep link nativo
  const publishWhatsApp = () => {
    if (!kit.whatsapp_message) return;
    const text = kit.whatsapp_message;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // 📱 WHATSAPP ESTADO - Solo copia + instrucción
  const publishWhatsAppStatus = async () => {
    if (!kit.whatsapp_message) return;
    await copyToClipboard(kit.whatsapp_message);
    setCopiedField("wa-status");
    setTimeout(() => setCopiedField(null), 3000);

    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
    if (isMobile) {
      // Abrir WhatsApp directamente
      window.location.href = "whatsapp://";
    }
    alert(
      "✅ Mensaje copiado!\n\n📱 Abre WhatsApp → Estados → Cámara/Galería → Pega el texto"
    );
  };

  // 🎵 TIKTOK - Copia caption + abre TikTok
  const publishTikTok = async () => {
    const fullCaption = `${kit.caption_instagram || ""}\n\n${
      kit.hashtags?.join(" ") || ""
    }`;
    await copyToClipboard(fullCaption);
    setCopiedField("tiktok");
    setTimeout(() => setCopiedField(null), 3000);

    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = "snssdk1128://";
      setTimeout(() => {
        window.open("https://www.tiktok.com/upload", "_blank");
      }, 500);
    } else {
      window.open("https://www.tiktok.com/upload", "_blank");
    }
  };

  if (!isOpen) return null;

  const TABS: { id: TabId; label: string; icon: string; hasContent: boolean }[] = [
    { id: "publish", label: "🚀 PUBLICAR", icon: "🚀", hasContent: true },
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
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setImageFullscreen(false)}
        >
          <img
            src={kit.enhanced_image_url}
            alt="Product"
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
                    ¡Listo para publicar!
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

            <div className="mt-4 flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 backdrop-blur">
                <span className="text-lg">{categoryInfo.emoji}</span>
                <span className="text-xs font-bold">{categoryInfo.label}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 backdrop-blur">
                <span className="text-xs font-bold">
                  ⚡ {kit.credits_used} créditos
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
                      ? tab.id === "publish"
                        ? "border-b-2 border-orange-500 text-orange-600 bg-white"
                        : "border-b-2 border-emerald-500 text-emerald-600 bg-white"
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
            {/* 🚀 PUBLICAR - TAB PRINCIPAL */}
            {activeTab === "publish" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center">
                  <h3 className="text-2xl font-black text-gray-900">
                    🚀 Publica en 1 click
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Elige donde quieres publicar. Todo el contenido está listo.
                  </p>
                </div>

                {/* Preview de la imagen */}
                <div className="rounded-2xl overflow-hidden bg-gray-100 border-2 border-gray-200 max-w-xs mx-auto">
                  <img
                    src={kit.enhanced_image_url || kit.original_image_url}
                    alt="Producto"
                    className="w-full h-auto object-contain aspect-square cursor-pointer"
                    onClick={() => setImageFullscreen(true)}
                  />
                </div>

                {/* Botón descargar imagen */}
                <button
                  onClick={handleDownload}
                  className="w-full max-w-xs mx-auto block rounded-xl bg-gray-900 py-2.5 text-sm font-bold text-white hover:bg-gray-800 transition"
                >
                  📥 Descargar imagen del producto
                </button>

                {/* Grid de botones publicar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Instagram */}
                  <button
                    onClick={publishInstagram}
                    className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-purple-500 via-pink-500 to-orange-400 p-5 text-white shadow-lg hover:shadow-xl transition hover:scale-105"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">📷</div>
                      <div className="flex-1 text-left">
                        <div className="text-lg font-black">Instagram</div>
                        <div className="text-xs opacity-90">
                          {copiedField === "ig-full"
                            ? "✅ Texto copiado! Abriendo..."
                            : "Post + Reels"}
                        </div>
                      </div>
                      <div className="text-2xl">→</div>
                    </div>
                  </button>

                  {/* Facebook */}
                  <button
                    onClick={publishFacebook}
                    className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-blue-600 to-blue-800 p-5 text-white shadow-lg hover:shadow-xl transition hover:scale-105"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">📘</div>
                      <div className="flex-1 text-left">
                        <div className="text-lg font-black">Facebook</div>
                        <div className="text-xs opacity-90">Post automático</div>
                      </div>
                      <div className="text-2xl">→</div>
                    </div>
                  </button>

                  {/* WhatsApp - Mensaje */}
                  <button
                    onClick={publishWhatsApp}
                    className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-emerald-500 to-green-600 p-5 text-white shadow-lg hover:shadow-xl transition hover:scale-105"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">💬</div>
                      <div className="flex-1 text-left">
                        <div className="text-lg font-black">WhatsApp</div>
                        <div className="text-xs opacity-90">Mensaje directo</div>
                      </div>
                      <div className="text-2xl">→</div>
                    </div>
                  </button>

                  {/* WhatsApp Estado */}
                  <button
                    onClick={publishWhatsAppStatus}
                    className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-teal-500 to-emerald-600 p-5 text-white shadow-lg hover:shadow-xl transition hover:scale-105"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">📱</div>
                      <div className="flex-1 text-left">
                        <div className="text-lg font-black">WhatsApp Estado</div>
                        <div className="text-xs opacity-90">
                          {copiedField === "wa-status"
                            ? "✅ Copiado!"
                            : "Publicar en estados"}
                        </div>
                      </div>
                      <div className="text-2xl">→</div>
                    </div>
                  </button>

                  {/* TikTok */}
                  <button
                    onClick={publishTikTok}
                    className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-gray-900 to-black p-5 text-white shadow-lg hover:shadow-xl transition hover:scale-105 sm:col-span-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">🎵</div>
                      <div className="flex-1 text-left">
                        <div className="text-lg font-black">TikTok</div>
                        <div className="text-xs opacity-90">
                          {copiedField === "tiktok"
                            ? "✅ Caption copiado! Sube tu video"
                            : "Caption listo para tu video"}
                        </div>
                      </div>
                      <div className="text-2xl">→</div>
                    </div>
                  </button>
                </div>

                {/* Guía paso a paso */}
                <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-4">
                  <h4 className="font-black text-blue-900 mb-2 flex items-center gap-2">
                    📖 Cómo funciona cada botón:
                  </h4>
                  <ul className="space-y-2 text-xs text-blue-800">
                    <li>
                      <strong>📷 Instagram:</strong> Copia caption + hashtags y abre la app. Solo pega y sube tu imagen.
                    </li>
                    <li>
                      <strong>📘 Facebook:</strong> Abre ventana de compartir automática con imagen y texto.
                    </li>
                    <li>
                      <strong>💬 WhatsApp:</strong> Abre WhatsApp y elige un contacto o grupo. Mensaje pre-cargado.
                    </li>
                    <li>
                      <strong>📱 WhatsApp Estado:</strong> Copia el mensaje. Abre estados en WhatsApp y pégalo.
                    </li>
                    <li>
                      <strong>🎵 TikTok:</strong> Copia caption + hashtags. Sube tu video en TikTok.
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* IMAGEN */}
            {activeTab === "image" && kit.enhanced_image_url && (
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden bg-gray-100 border-2 border-gray-200 max-w-md mx-auto">
                  <img
                    src={kit.enhanced_image_url}
                    alt="Producto"
                    className="w-full h-auto object-contain aspect-square cursor-pointer"
                    onClick={() => setImageFullscreen(true)}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Clic para ver en pantalla completa
                </p>
                <button
                  onClick={handleDownload}
                  className="w-full rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition"
                >
                  📥 Descargar imagen
                </button>
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
                      {kit.caption_instagram.length} chars
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                    {kit.caption_instagram}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(kit.caption_instagram!, "instagram")}
                    className={`flex-1 rounded-xl py-3 text-sm font-bold transition ${
                      copiedField === "instagram"
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-900 text-white hover:bg-gray-800"
                    }`}
                  >
                    {copiedField === "instagram" ? "✅ Copiado" : "📋 Copiar"}
                  </button>
                  <button
                    onClick={publishInstagram}
                    className="flex-1 rounded-xl bg-linear-to-r from-purple-500 to-pink-500 py-3 text-sm font-bold text-white shadow"
                  >
                    📷 Publicar
                  </button>
                </div>
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
                      {kit.caption_facebook.length} chars
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                    {kit.caption_facebook}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(kit.caption_facebook!, "facebook")}
                    className={`flex-1 rounded-xl py-3 text-sm font-bold transition ${
                      copiedField === "facebook"
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-900 text-white hover:bg-gray-800"
                    }`}
                  >
                    {copiedField === "facebook" ? "✅ Copiado" : "📋 Copiar"}
                  </button>
                  <button
                    onClick={publishFacebook}
                    className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow"
                  >
                    📘 Publicar
                  </button>
                </div>
              </div>
            )}

            {/* HASHTAGS */}
            {activeTab === "hashtags" && kit.hashtags && kit.hashtags.length > 0 && (
              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-purple-200 bg-linear-to-br from-purple-50 to-pink-50 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-2xl">🏷️</span>
                    <span className="text-sm font-bold text-purple-900">
                      Hashtags ({kit.hashtags.length})
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
                      Mensaje para WhatsApp
                    </span>
                    <span className="ml-auto text-xs text-gray-500">
                      {kit.whatsapp_message.length} chars
                    </span>
                  </div>

                  <div className="rounded-2xl bg-[#dcf8c6] p-4 shadow-sm">
                    <p className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                      {kit.whatsapp_message}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => handleCopy(kit.whatsapp_message!, "whatsapp")}
                    className={`rounded-xl py-3 text-sm font-bold transition ${
                      copiedField === "whatsapp"
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-900 text-white hover:bg-gray-800"
                    }`}
                  >
                    {copiedField === "whatsapp" ? "✅" : "📋"} Copiar
                  </button>
                  <button
                    onClick={publishWhatsApp}
                    className="rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white shadow"
                  >
                    💬 Contacto
                  </button>
                  <button
                    onClick={publishWhatsAppStatus}
                    className="rounded-xl bg-teal-500 py-3 text-sm font-bold text-white shadow"
                  >
                    📱 Estado
                  </button>
                </div>
              </div>
            )}

            {/* EMAIL */}
            {activeTab === "email" && kit.email_body && (
              <div className="space-y-4">
                <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
                  <div className="mb-1 text-xs font-bold uppercase tracking-wider text-orange-700">
                    Asunto
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
                🚀 Powered by Groq Llama 3.3
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