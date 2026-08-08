// src/components/vendor/ProductLaunchKitViewer.tsx
// 🎨 v22.3 - Modal BLINDADO + share personalizado + regenerar

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
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
  onRegenerate?: () => void;
}

type TabId =
  | "publish"
  | "image"
  | "instagram"
  | "facebook"
  | "hashtags"
  | "whatsapp"
  | "email";

interface StoreData {
  name: string;
  slug: string;
  whatsapp?: string;
  contact_phone?: string;
  instagram?: string;
  facebook?: string;
}

export default function ProductLaunchKitViewer({
  isOpen,
  kit,
  onClose,
  onRegenerate,
}: ProductLaunchKitViewerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("publish");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [imageFullscreen, setImageFullscreen] = useState(false);
  const [store, setStore] = useState<StoreData | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareCount, setShareCount] = useState(0);

  const categoryInfo = getCategoryInfo(kit.detected_category);

  useEffect(() => {
    const loadStore = async () => {
      const { data } = await supabase
        .from("stores")
        .select("name, slug, whatsapp, contact_phone, instagram, facebook")
        .eq("owner_id", kit.vendor_id)
        .maybeSingle();
      if (data) setStore(data);
    };
    loadStore();
  }, [kit.vendor_id]);

  const baseUrl = window.location.origin;
  const productUrl = store?.slug
    ? `${baseUrl}/tienda/${store.slug}?producto=${kit.product_id}`
    : baseUrl;

  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
  const canShareFiles =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function";

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

  const buildShareText = (baseCaption: string, includeHashtags = true) => {
    let text = baseCaption;
    if (includeHashtags && kit.hashtags?.length) {
      text += `\n\n${kit.hashtags.join(" ")}`;
    }
    text += `\n\n👉 Cómprame aquí:\n${productUrl}`;
    return text;
  };

  const shareWithFile = async (
    text: string,
    title: string
  ): Promise<boolean> => {
    if (!canShareFiles || !kit.enhanced_image_url) return false;

    try {
      const response = await fetch(kit.enhanced_image_url);
      const blob = await response.blob();
      const file = new File([blob], `producto-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      const shareData = { title, text, files: [file] };

      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return true;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      // Si el usuario canceló, no es error
      if (errorMsg.includes("cancel") || errorMsg.includes("AbortError")) {
        return true;
      }
      console.log("Share nativo falló:", err);
    }
    return false;
  };

  // 🚀 COMPARTIR TODO
  const shareEverything = async () => {
    setSharing(true);
    try {
      const shareText = buildShareText(kit.caption_instagram || "");
      const shared = await shareWithFile(shareText, "Mi producto");

      if (shared) {
        setShareCount((c) => c + 1);
        setCopiedField("share-success");
        setTimeout(() => setCopiedField(null), 3000);
      } else {
        await copyToClipboard(shareText);
        await handleDownload();
        alert(
          "✅ Todo listo!\n\n📋 Texto copiado\n📥 Imagen descargada\n\nAbre tu red social y pega."
        );
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setSharing(false);
    }
  };

  const shareToInstagram = async () => {
    const shareText = buildShareText(kit.caption_instagram || "");
    const shared = await shareWithFile(shareText, "Instagram");

    if (!shared) {
      await copyToClipboard(shareText);
      await handleDownload();
      setCopiedField("instagram");
      setTimeout(() => setCopiedField(null), 3000);

      if (isMobile) {
        window.open("https://www.instagram.com/", "_blank");
      } else {
        window.open("https://www.instagram.com/", "_blank");
      }
    } else {
      setShareCount((c) => c + 1);
    }
  };

  const shareToFacebook = async () => {
    const shareText = buildShareText(kit.caption_facebook || "");
    const shared = await shareWithFile(shareText, "Facebook");

    if (!shared) {
      const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        productUrl
      )}&quote=${encodeURIComponent(shareText)}`;
      window.open(fbUrl, "_blank", "width=600,height=700");
    } else {
      setShareCount((c) => c + 1);
    }
  };

  const shareToWhatsApp = async () => {
    const shareText = buildShareText(
      kit.whatsapp_message || kit.caption_instagram || ""
    );
    const shared = await shareWithFile(shareText, "WhatsApp");

    if (!shared) {
      const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(url, "_blank");
    } else {
      setShareCount((c) => c + 1);
    }
  };

  const shareToWhatsAppStatus = async () => {
    const shareText = buildShareText(kit.whatsapp_message || "");
    await copyToClipboard(shareText);
    await handleDownload();
    setCopiedField("wa-status");
    setTimeout(() => setCopiedField(null), 3000);

    alert(
      "✅ Todo listo!\n\n📥 Imagen descargada\n📋 Texto copiado\n\n📱 Abre WhatsApp → Estados → Sube imagen y pega texto"
    );
  };

  const shareToTikTok = async () => {
    const shareText = buildShareText(kit.caption_instagram || "");
    const shared = await shareWithFile(shareText, "TikTok");

    if (!shared) {
      await copyToClipboard(shareText);
      await handleDownload();
      setCopiedField("tiktok");
      setTimeout(() => setCopiedField(null), 3000);
      window.open("https://www.tiktok.com/upload", "_blank");
    } else {
      setShareCount((c) => c + 1);
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

      {/* 🔥 Modal BLINDADO: NO se cierra al hacer click fuera */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4">
        <div
          className="relative w-full max-w-5xl h-[95vh] sm:h-[90vh] overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-linear-to-br from-emerald-500 via-teal-500 to-cyan-500 p-4 text-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="text-3xl shrink-0">🎉</div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">
                    Kit Personalizado
                  </div>
                  <h2 className="text-base sm:text-lg font-black truncate">
                    {store?.name || "Tu tienda"}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {shareCount > 0 && (
                  <div className="rounded-full bg-white/20 px-2 py-1 text-[10px] font-bold backdrop-blur">
                    ✅ {shareCount} shares
                  </div>
                )}
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xl text-white hover:bg-white/30"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <div className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 backdrop-blur">
                <span className="text-sm">{categoryInfo.emoji}</span>
                <span className="text-[10px] font-bold">{categoryInfo.label}</span>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 backdrop-blur">
                <span className="text-[10px] font-bold">⚡ {kit.credits_used}</span>
              </div>
              {store?.slug && (
                <div className="inline-flex items-center gap-1 rounded-full bg-white/30 px-2 py-0.5 backdrop-blur">
                  <span className="text-[10px] font-bold">🔗 /{store.slug}</span>
                </div>
              )}
              {kit.generation_time_ms && (
                <div className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 backdrop-blur">
                  <span className="text-[10px] font-bold">
                    ⏱️ {formatGenerationTime(kit.generation_time_ms)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 bg-gray-50 overflow-x-auto shrink-0">
            <div className="flex min-w-max">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={!tab.hasContent}
                  className={`shrink-0 px-3 py-2 text-xs sm:text-sm font-bold transition ${
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
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
            {/* 🚀 PUBLICAR */}
            {activeTab === "publish" && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900">
                    🚀 Comparte con 1 tap
                  </h3>
                  <p className="mt-1 text-xs text-gray-600">
                    Imagen + texto + link → todo listo · Puedes compartir múltiples veces
                  </p>
                </div>

                <div className="rounded-xl overflow-hidden bg-gray-100 border-2 border-gray-200 max-w-50 mx-auto">
                  <img
                    src={kit.enhanced_image_url || kit.original_image_url}
                    alt="Producto"
                    className="w-full h-auto object-contain aspect-square cursor-pointer"
                    onClick={() => setImageFullscreen(true)}
                  />
                </div>

                <button
                  onClick={shareEverything}
                  disabled={sharing}
                  className="w-full rounded-2xl bg-linear-to-r from-orange-500 via-pink-500 to-purple-600 py-4 text-base font-black text-white shadow-xl hover:shadow-2xl transition hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                >
                  {sharing ? (
                    <>⏳ Preparando...</>
                  ) : copiedField === "share-success" ? (
                    <>✅ ¡Compartido! Comparte en otra red 👇</>
                  ) : (
                    <>🚀 COMPARTIR AHORA</>
                  )}
                </button>

                <p className="text-center text-[11px] text-gray-500 -mt-1">
                  {isMobile
                    ? "Se abrirá el menú nativo de tu celular"
                    : "Copia el texto y descarga la imagen automáticamente"}
                </p>

                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-bold text-gray-400">O ELIGE UNA RED</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    onClick={shareToInstagram}
                    className="rounded-xl bg-linear-to-br from-purple-500 via-pink-500 to-orange-400 p-3 sm:p-4 text-white shadow-lg hover:shadow-xl transition hover:scale-105"
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-2xl sm:text-3xl">📷</div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-sm sm:text-base font-black truncate">Instagram</div>
                        <div className="text-[10px] opacity-90 truncate">
                          {copiedField === "instagram" ? "✅ Copiado" : "Post + Reels"}
                        </div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={shareToFacebook}
                    className="rounded-xl bg-linear-to-br from-blue-600 to-blue-800 p-3 sm:p-4 text-white shadow-lg hover:shadow-xl transition hover:scale-105"
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-2xl sm:text-3xl">📘</div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-sm sm:text-base font-black truncate">Facebook</div>
                        <div className="text-[10px] opacity-90 truncate">Post con link</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={shareToWhatsApp}
                    className="rounded-xl bg-linear-to-br from-emerald-500 to-green-600 p-3 sm:p-4 text-white shadow-lg hover:shadow-xl transition hover:scale-105"
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-2xl sm:text-3xl">💬</div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-sm sm:text-base font-black truncate">WhatsApp</div>
                        <div className="text-[10px] opacity-90 truncate">Directo</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={shareToWhatsAppStatus}
                    className="rounded-xl bg-linear-to-br from-teal-500 to-emerald-600 p-3 sm:p-4 text-white shadow-lg hover:shadow-xl transition hover:scale-105"
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-2xl sm:text-3xl">📱</div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-sm sm:text-base font-black truncate">Estado WA</div>
                        <div className="text-[10px] opacity-90 truncate">
                          {copiedField === "wa-status" ? "✅ Copiado" : "Estados"}
                        </div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={shareToTikTok}
                    className="col-span-2 rounded-xl bg-linear-to-br from-gray-900 to-black p-3 sm:p-4 text-white shadow-lg hover:shadow-xl transition hover:scale-105"
                  >
                    <div className="flex items-center gap-2 justify-center">
                      <div className="text-2xl sm:text-3xl">🎵</div>
                      <div className="text-left">
                        <div className="text-sm sm:text-base font-black">TikTok</div>
                        <div className="text-[10px] opacity-90">
                          {copiedField === "tiktok" ? "✅ Copiado" : "Caption listo"}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Info del link */}
                {store?.slug && (
                  <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3">
                    <div className="text-[11px] font-bold text-blue-900 mb-1">
                      🔗 Link de tu tienda que se compartirá:
                    </div>
                    <div className="text-[10px] text-blue-700 break-all font-mono bg-white/50 rounded px-2 py-1">
                      {productUrl}
                    </div>
                  </div>
                )}

                {/* Botón regenerar */}
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="w-full rounded-xl border-2 border-purple-300 bg-purple-50 py-3 text-xs font-bold text-purple-700 hover:bg-purple-100 transition"
                  >
                    🔄 Generar variante nueva (15 créditos)
                  </button>
                )}
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
                <button
                  onClick={handleDownload}
                  className="w-full rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 py-3 text-sm font-bold text-white shadow-lg"
                >
                  📥 Descargar imagen
                </button>
              </div>
            )}

            {/* INSTAGRAM */}
            {activeTab === "instagram" && kit.caption_instagram && (
              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-pink-200 bg-linear-to-br from-pink-50 to-purple-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">📷</span>
                    <span className="text-sm font-bold text-pink-900">Caption Instagram</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-gray-800">
                    {kit.caption_instagram}
                  </p>
                  <div className="mt-3 pt-3 border-t border-pink-200 text-xs text-pink-700">
                    <strong>+ Link:</strong> {productUrl}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleCopy(buildShareText(kit.caption_instagram!), "instagram")
                    }
                    className={`flex-1 rounded-xl py-3 text-sm font-bold ${
                      copiedField === "instagram" ? "bg-emerald-500 text-white" : "bg-gray-900 text-white"
                    }`}
                  >
                    {copiedField === "instagram" ? "✅ Copiado" : "📋 Copiar todo"}
                  </button>
                  <button
                    onClick={shareToInstagram}
                    className="flex-1 rounded-xl bg-linear-to-r from-purple-500 to-pink-500 py-3 text-sm font-bold text-white shadow"
                  >
                    🚀 Compartir
                  </button>
                </div>
              </div>
            )}

            {/* FACEBOOK */}
            {activeTab === "facebook" && kit.caption_facebook && (
              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-blue-200 bg-linear-to-br from-blue-50 to-indigo-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">📘</span>
                    <span className="text-sm font-bold text-blue-900">Caption Facebook</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-gray-800">
                    {kit.caption_facebook}
                  </p>
                  <div className="mt-3 pt-3 border-t border-blue-200 text-xs text-blue-700">
                    <strong>+ Link:</strong> {productUrl}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleCopy(buildShareText(kit.caption_facebook!), "facebook")
                    }
                    className={`flex-1 rounded-xl py-3 text-sm font-bold ${
                      copiedField === "facebook" ? "bg-emerald-500 text-white" : "bg-gray-900 text-white"
                    }`}
                  >
                    {copiedField === "facebook" ? "✅ Copiado" : "📋 Copiar"}
                  </button>
                  <button
                    onClick={shareToFacebook}
                    className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow"
                  >
                    🚀 Compartir
                  </button>
                </div>
              </div>
            )}

            {/* HASHTAGS */}
            {activeTab === "hashtags" && kit.hashtags && kit.hashtags.length > 0 && (
              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-purple-200 bg-linear-to-br from-purple-50 to-pink-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">🏷️</span>
                    <span className="text-sm font-bold text-purple-900">
                      {kit.hashtags.length} Hashtags
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {kit.hashtags.map((tag, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-white border border-purple-200 px-2 py-0.5 text-xs font-semibold text-purple-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleCopy(kit.hashtags!.join(" "), "hashtags")}
                  className={`w-full rounded-xl py-3 text-sm font-bold ${
                    copiedField === "hashtags" ? "bg-emerald-500 text-white" : "bg-gray-900 text-white"
                  }`}
                >
                  {copiedField === "hashtags" ? "✅ Copiado" : "📋 Copiar todos"}
                </button>
              </div>
            )}

            {/* WHATSAPP */}
            {activeTab === "whatsapp" && kit.whatsapp_message && (
              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-emerald-200 bg-linear-to-br from-emerald-50 to-green-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">💬</span>
                    <span className="text-sm font-bold text-emerald-900">Mensaje WhatsApp</span>
                  </div>
                  <div className="rounded-xl bg-[#dcf8c6] p-3 shadow-sm">
                    <p className="whitespace-pre-wrap text-sm text-gray-800">
                      {kit.whatsapp_message}
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-emerald-200 text-xs text-emerald-700">
                    <strong>+ Link:</strong> {productUrl}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() =>
                      handleCopy(buildShareText(kit.whatsapp_message!, false), "whatsapp")
                    }
                    className={`rounded-xl py-3 text-xs font-bold ${
                      copiedField === "whatsapp" ? "bg-emerald-500 text-white" : "bg-gray-900 text-white"
                    }`}
                  >
                    {copiedField === "whatsapp" ? "✅" : "📋"} Copiar
                  </button>
                  <button
                    onClick={shareToWhatsApp}
                    className="rounded-xl bg-emerald-500 py-3 text-xs font-bold text-white shadow"
                  >
                    💬 Enviar
                  </button>
                  <button
                    onClick={shareToWhatsAppStatus}
                    className="rounded-xl bg-teal-500 py-3 text-xs font-bold text-white shadow"
                  >
                    📱 Estado
                  </button>
                </div>
              </div>
            )}

            {/* EMAIL */}
            {activeTab === "email" && kit.email_body && (
              <div className="space-y-4">
                <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-3">
                  <div className="mb-1 text-[10px] font-bold uppercase text-orange-700">Asunto</div>
                  <p className="text-sm font-bold text-gray-900">{kit.email_subject}</p>
                </div>

                <div className="rounded-2xl border-2 border-orange-200 bg-white p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">📧</span>
                    <span className="text-sm font-bold text-orange-900">Cuerpo</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-gray-800">{kit.email_body}</p>
                  <div className="mt-3 pt-3 border-t border-orange-200 text-xs text-orange-700">
                    <strong>+ Link:</strong> {productUrl}
                  </div>
                </div>

                <button
                  onClick={() =>
                    handleCopy(`${kit.email_body}\n\n👉 ${productUrl}`, "email-body")
                  }
                  className={`w-full rounded-xl py-3 text-sm font-bold ${
                    copiedField === "email-body" ? "bg-emerald-500 text-white" : "bg-gray-900 text-white"
                  }`}
                >
                  {copiedField === "email-body" ? "✅ Copiado" : "📋 Copiar todo"}
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-gray-50 p-3 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[10px] text-gray-500">🚀 Powered by Groq</p>
              <button
                onClick={onClose}
                className="rounded-xl bg-gray-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-gray-800 transition"
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