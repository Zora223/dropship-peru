// src/components/vendor/ProductLaunchKitViewer.tsx
// 🎨 v22.12 - Modo NATIVO simple con Web Share API

import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../../lib/supabase";
import {
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
  | "store"
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

interface ExtendedKit extends LaunchKit {
  tiktok_caption?: string;
}

// Mensajes promocionales para la tienda
const PROMO_MESSAGES = [
  {
    id: "new_collection",
    icon: "🆕",
    title: "Nueva colección",
    getMessage: (storeName: string, url: string) =>
      `🎉 ¡NOVEDAD en ${storeName}! 🎉\n\n` +
      `Acabo de subir nuevos productos increíbles a mi tienda 🛍️\n\n` +
      `Ven a verlos, tengo cosas que te van a encantar 💖\n\n` +
      `👉 ${url}`,
  },
  {
    id: "flash_sale",
    icon: "💥",
    title: "Oferta flash",
    getMessage: (storeName: string, url: string) =>
      `🔥 OFERTA FLASH 🔥\n\n` +
      `Solo por HOY en ${storeName}:\n` +
      `✨ Precios especiales\n` +
      `✨ Envío rápido\n` +
      `✨ Stock limitado\n\n` +
      `No te lo pierdas 👇\n${url}`,
  },
  {
    id: "free_shipping",
    icon: "🚚",
    title: "Envío gratis",
    getMessage: (storeName: string, url: string) =>
      `🚚 ¡ENVÍO GRATIS! 🚚\n\n` +
      `Solo por hoy en ${storeName}, envío GRATIS en TODOS tus pedidos 🎁\n\n` +
      `✅ Sin monto mínimo\n` +
      `✅ Entrega en 24-48 horas\n` +
      `✅ 100% seguro\n\n` +
      `Compra aquí 👉 ${url}`,
  },
  {
    id: "anniversary",
    icon: "🎂",
    title: "Aniversario",
    getMessage: (storeName: string, url: string) =>
      `🎂 ¡ANIVERSARIO ${storeName}! 🎉\n\n` +
      `Celebramos con descuentos increíbles en toda la tienda ✨\n\n` +
      `🎁 Descuentos especiales\n` +
      `🎁 Sorpresas para clientes\n` +
      `🎁 Regalo con tu compra\n\n` +
      `Ven a celebrar 👉 ${url}`,
  },
  {
    id: "invitation",
    icon: "💌",
    title: "Invitación",
    getMessage: (storeName: string, url: string) =>
      `Hola! 👋\n\n` +
      `Quiero invitarte a conocer mi tienda ${storeName} 🛍️\n\n` +
      `Tengo productos de excelente calidad a precios justos ✨\n\n` +
      `Échale un vistazo cuando puedas 💖\n\n` +
      `👉 ${url}`,
  },
  {
    id: "weekend_special",
    icon: "🎉",
    title: "Fin de semana",
    getMessage: (storeName: string, url: string) =>
      `🎉 ¡ESPECIAL FIN DE SEMANA! 🎉\n\n` +
      `En ${storeName} este weekend tenemos:\n\n` +
      `🛍️ Productos exclusivos\n` +
      `💯 Ofertas increíbles\n` +
      `🚚 Envío rápido\n\n` +
      `Aprovecha 👉 ${url}`,
  },
];

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
  const [selectedPromo, setSelectedPromo] = useState<string>("new_collection");

  const categoryInfo = getCategoryInfo(kit.detected_category);
  const extendedKit = kit as ExtendedKit;

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
  const storeUrl = store?.slug ? `${baseUrl}/tienda/${store.slug}` : baseUrl;

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  const handleCopy = async (text: string, field: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const downloadQR = () => {
    const canvas = document.getElementById("store-qr") as HTMLCanvasElement;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-${store?.slug || "tienda"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // ═══════════════════════════════════════════════════════════
  // 🚀 COMPARTIR NATIVO (Web Share API)
  // ═══════════════════════════════════════════════════════════

  const shareNative = async (text: string, title = "Mira este producto") => {
    // Si el navegador soporta share API → usarlo (móvil abre menú nativo)
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: productUrl,
        });
      } catch (err) {
        // Usuario canceló, no hacer nada
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("cancel") && !msg.includes("Abort")) {
          console.warn("Share error:", err);
        }
      }
    } else {
      // Fallback: copiar al portapapeles
      await copyToClipboard(`${text}\n\n${productUrl}`);
      setCopiedField("nativeshare");
      setTimeout(() => setCopiedField(null), 2000);
      alert("📋 Texto copiado al portapapeles");
    }
  };

  const shareStoreNative = async (text: string, title = "Mira mi tienda") => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: storeUrl,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("cancel") && !msg.includes("Abort")) {
          console.warn("Share error:", err);
        }
      }
    } else {
      await copyToClipboard(text);
      setCopiedField("store-native");
      setTimeout(() => setCopiedField(null), 2000);
      alert("📋 Texto copiado al portapapeles");
    }
  };

  // ═══════════════════════════════════════════════════════════
  // 💬 WhatsApp directo (link universal wa.me)
  // ═══════════════════════════════════════════════════════════

  const openWhatsApp = (text: string) => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  // ═══════════════════════════════════════════════════════════
  // COMPARTIR TIENDA
  // ═══════════════════════════════════════════════════════════

  const getSelectedPromoMessage = (): string => {
    const promo = PROMO_MESSAGES.find((p) => p.id === selectedPromo);
    if (!promo || !store) return "";
    return promo.getMessage(store.name, storeUrl);
  };

  const copyStoreMessage = async () => {
    const msg = getSelectedPromoMessage();
    await copyToClipboard(msg);
    setCopiedField("promo-msg");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyStoreLink = async () => {
    await copyToClipboard(storeUrl);
    setCopiedField("store-link");
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!isOpen) return null;

  const TABS: { id: TabId; label: string; icon: string; hasContent: boolean }[] = [
    { id: "publish", label: "🚀 PUBLICAR", icon: "🚀", hasContent: true },
    { id: "store", label: "🏪 MI TIENDA", icon: "🏪", hasContent: !!store },
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

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4">
        <div
          className="relative w-full max-w-4xl h-[95vh] sm:h-[90vh] overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl flex flex-col"
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

              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xl text-white hover:bg-white/30 shrink-0"
              >
                ×
              </button>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <div className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 backdrop-blur">
                <span className="text-sm">{categoryInfo.emoji}</span>
                <span className="text-[10px] font-bold">{categoryInfo.label}</span>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 backdrop-blur">
                <span className="text-[10px] font-bold">⚡ {kit.credits_used}</span>
              </div>
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
                        : tab.id === "store"
                        ? "border-b-2 border-blue-500 text-blue-600 bg-white"
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
            {/* 🚀 PUBLICAR - MODO NATIVO SIMPLE */}
            {activeTab === "publish" && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900">
                    🚀 Compartir producto
                  </h3>
                  <p className="mt-1 text-xs text-gray-600">
                    Click en cualquier red → se abre el menú nativo
                  </p>
                </div>

                {/* Preview del producto */}
                <div className="rounded-xl overflow-hidden bg-gray-100 border-2 border-gray-200 max-w-50 mx-auto">
                  <img
                    src={kit.enhanced_image_url || kit.original_image_url}
                    alt="Producto"
                    className="w-full h-auto object-contain aspect-square cursor-pointer"
                    onClick={() => setImageFullscreen(true)}
                  />
                </div>

                {/* 📷 INSTAGRAM */}
                <div className="rounded-2xl bg-linear-to-br from-purple-50 to-pink-50 border-2 border-pink-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">📷</span>
                    <span className="text-sm font-black text-pink-900">Instagram</span>
                  </div>
                  <p className="text-xs text-gray-700 mb-3 line-clamp-3 whitespace-pre-wrap">
                    {kit.caption_instagram}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleCopy(
                          kit.caption_instagram + "\n\n" + (kit.hashtags?.join(" ") || ""),
                          "ig-copy"
                        )
                      }
                      className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition ${
                        copiedField === "ig-copy"
                          ? "bg-emerald-500 text-white"
                          : "bg-white border-2 border-pink-300 text-pink-700 hover:bg-pink-50"
                      }`}
                    >
                      {copiedField === "ig-copy" ? "✅ Copiado" : "📋 Copiar"}
                    </button>
                    <button
                      onClick={() =>
                        shareNative(
                          kit.caption_instagram + "\n\n" + (kit.hashtags?.join(" ") || ""),
                          "Instagram"
                        )
                      }
                      className="flex-1 rounded-xl bg-linear-to-r from-purple-500 to-pink-500 py-2.5 text-xs font-bold text-white shadow"
                    >
                      📤 Compartir
                    </button>
                  </div>
                </div>

                {/* 📘 FACEBOOK */}
                <div className="rounded-2xl bg-linear-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">📘</span>
                    <span className="text-sm font-black text-blue-900">Facebook</span>
                  </div>
                  <p className="text-xs text-gray-700 mb-3 line-clamp-3 whitespace-pre-wrap">
                    {kit.caption_facebook}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(kit.caption_facebook || "", "fb-copy")}
                      className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition ${
                        copiedField === "fb-copy"
                          ? "bg-emerald-500 text-white"
                          : "bg-white border-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                      }`}
                    >
                      {copiedField === "fb-copy" ? "✅ Copiado" : "📋 Copiar"}
                    </button>
                    <button
                      onClick={() => shareNative(kit.caption_facebook || "", "Facebook")}
                      className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow"
                    >
                      📤 Compartir
                    </button>
                  </div>
                </div>

                {/* 💬 WHATSAPP */}
                <div className="rounded-2xl bg-linear-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">💬</span>
                    <span className="text-sm font-black text-emerald-900">WhatsApp</span>
                  </div>
                  <p className="text-xs text-gray-700 mb-3 line-clamp-3 whitespace-pre-wrap">
                    {kit.whatsapp_message}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(kit.whatsapp_message || "", "wa-copy")}
                      className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition ${
                        copiedField === "wa-copy"
                          ? "bg-emerald-500 text-white"
                          : "bg-white border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {copiedField === "wa-copy" ? "✅ Copiado" : "📋 Copiar"}
                    </button>
                    <button
                      onClick={() => openWhatsApp(kit.whatsapp_message || "")}
                      className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-white shadow"
                    >
                      💬 Enviar
                    </button>
                  </div>
                </div>

                {/* 🎵 TIKTOK */}
                {extendedKit.tiktok_caption && (
                  <div className="rounded-2xl bg-linear-to-br from-gray-900 to-black p-4 text-white">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">🎵</span>
                      <span className="text-sm font-black">TikTok</span>
                    </div>
                    <p className="text-xs text-white/80 mb-3 line-clamp-3 whitespace-pre-wrap">
                      {extendedKit.tiktok_caption}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleCopy(
                            extendedKit.tiktok_caption +
                              "\n\n" +
                              (kit.hashtags?.slice(0, 5).join(" ") || ""),
                            "tt-copy"
                          )
                        }
                        className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition ${
                          copiedField === "tt-copy"
                            ? "bg-emerald-500 text-white"
                            : "bg-white/20 text-white hover:bg-white/30"
                        }`}
                      >
                        {copiedField === "tt-copy" ? "✅ Copiado" : "📋 Copiar"}
                      </button>
                      <button
                        onClick={() =>
                          shareNative(extendedKit.tiktok_caption || "", "TikTok")
                        }
                        className="flex-1 rounded-xl bg-white text-black py-2.5 text-xs font-bold shadow"
                      >
                        📤 Compartir
                      </button>
                    </div>
                  </div>
                )}

                {/* 📧 EMAIL */}
                <div className="rounded-2xl bg-linear-to-br from-orange-50 to-red-50 border-2 border-orange-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">📧</span>
                    <span className="text-sm font-black text-orange-900">Email</span>
                  </div>
                  <p className="text-xs text-gray-700 mb-3 line-clamp-2">
                    <strong>Asunto:</strong> {kit.email_subject}
                  </p>
                  <button
                    onClick={() => {
                      const mailto = `mailto:?subject=${encodeURIComponent(
                        kit.email_subject || ""
                      )}&body=${encodeURIComponent(kit.email_body || "")}`;
                      window.location.href = mailto;
                    }}
                    className="w-full rounded-xl bg-orange-500 py-2.5 text-xs font-bold text-white shadow"
                  >
                    📧 Abrir email
                  </button>
                </div>

                {/* Link del producto */}
                {store?.slug && (
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                    <div className="text-[11px] font-bold text-gray-700 mb-1">
                      🔗 Link del producto:
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 text-[10px] text-gray-600 break-all font-mono bg-white rounded px-2 py-1 border">
                        {productUrl}
                      </div>
                      <button
                        onClick={() => handleCopy(productUrl, "product-link")}
                        className={`shrink-0 rounded-lg px-3 py-1 text-xs font-bold transition ${
                          copiedField === "product-link"
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-900 text-white hover:bg-gray-800"
                        }`}
                      >
                        {copiedField === "product-link" ? "✅" : "📋"}
                      </button>
                    </div>
                  </div>
                )}

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

            {/* 🏪 MI TIENDA */}
            {activeTab === "store" && store && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900">
                    🏪 Promociona tu tienda
                  </h3>
                  <p className="mt-1 text-xs text-gray-600">
                    Comparte tu tienda completa
                  </p>
                </div>

                {/* QR + link */}
                <div className="rounded-2xl border-2 border-blue-200 bg-linear-to-br from-blue-50 to-cyan-50 p-4">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="bg-white rounded-2xl p-3 shadow-md shrink-0">
                      <QRCodeCanvas
                        id="store-qr"
                        value={storeUrl}
                        size={140}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <div className="text-xs font-bold uppercase text-blue-700 mb-1">
                        🌐 Tu tienda online
                      </div>
                      <div className="text-sm font-bold text-gray-900 mb-2">
                        {store.name}
                      </div>
                      <div className="text-[10px] text-gray-600 break-all bg-white/60 rounded px-2 py-1 font-mono mb-3">
                        {storeUrl}
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                        <button
                          onClick={copyStoreLink}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                            copiedField === "store-link"
                              ? "bg-emerald-500 text-white"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {copiedField === "store-link" ? "✅ Copiado" : "📋 Copiar link"}
                        </button>
                        <button
                          onClick={downloadQR}
                          className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800"
                        >
                          📥 Descargar QR
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mensajes promocionales */}
                <div>
                  <h4 className="mb-2 text-sm font-black text-gray-900">
                    💬 Elige un mensaje:
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PROMO_MESSAGES.map((promo) => (
                      <button
                        key={promo.id}
                        onClick={() => setSelectedPromo(promo.id)}
                        className={`rounded-xl p-3 text-left transition ${
                          selectedPromo === promo.id
                            ? "bg-linear-to-br from-blue-500 to-cyan-500 text-white shadow-lg scale-105"
                            : "bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300"
                        }`}
                      >
                        <div className="text-2xl mb-1">{promo.icon}</div>
                        <div className="text-xs font-bold">{promo.title}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vista previa */}
                <div className="rounded-2xl border-2 border-emerald-200 bg-linear-to-br from-emerald-50 to-teal-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">👀</span>
                    <span className="text-sm font-bold text-emerald-900">
                      Vista previa
                    </span>
                  </div>
                  <div className="rounded-xl bg-[#dcf8c6] p-3 shadow-sm">
                    <p className="whitespace-pre-wrap text-sm text-gray-800">
                      {getSelectedPromoMessage()}
                    </p>
                  </div>
                </div>

                {/* Botones de compartir NATIVOS */}
                <div className="flex gap-2">
                  <button
                    onClick={copyStoreMessage}
                    className={`flex-1 rounded-xl py-3 text-xs font-bold transition ${
                      copiedField === "promo-msg"
                        ? "bg-emerald-500 text-white"
                        : "bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {copiedField === "promo-msg" ? "✅ Copiado" : "📋 Copiar"}
                  </button>
                  <button
                    onClick={() => openWhatsApp(getSelectedPromoMessage())}
                    className="flex-1 rounded-xl bg-emerald-500 py-3 text-xs font-bold text-white shadow"
                  >
                    💬 WhatsApp
                  </button>
                  <button
                    onClick={() =>
                      shareStoreNative(getSelectedPromoMessage(), store.name)
                    }
                    className="flex-1 rounded-xl bg-linear-to-r from-purple-500 to-pink-500 py-3 text-xs font-bold text-white shadow"
                  >
                    📤 Compartir
                  </button>
                </div>

                <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3">
                  <div className="text-[11px] font-bold text-amber-900 mb-2">
                    💡 Tips:
                  </div>
                  <ul className="space-y-1 text-[11px] text-amber-800">
                    <li>📱 Comparte el QR en tarjetas de presentación</li>
                    <li>🖨️ Imprime el QR y pégalo en tu local</li>
                    <li>🕐 Publica en horas pico (12pm-2pm, 7pm-9pm)</li>
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
                <p className="text-center text-xs text-gray-500">
                  Click en la imagen para verla en pantalla completa
                </p>
              </div>
            )}

            {/* INSTAGRAM */}
            {activeTab === "instagram" && kit.caption_instagram && (
              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-pink-200 bg-linear-to-br from-pink-50 to-purple-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">📷</span>
                    <span className="text-sm font-bold text-pink-900">
                      Caption Instagram
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-gray-800">
                    {kit.caption_instagram}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleCopy(
                        kit.caption_instagram + "\n\n" + (kit.hashtags?.join(" ") || ""),
                        "instagram-copy"
                      )
                    }
                    className={`flex-1 rounded-xl py-3 text-sm font-bold ${
                      copiedField === "instagram-copy"
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-900 text-white"
                    }`}
                  >
                    {copiedField === "instagram-copy" ? "✅ Copiado" : "📋 Copiar"}
                  </button>
                  <button
                    onClick={() =>
                      shareNative(
                        kit.caption_instagram + "\n\n" + (kit.hashtags?.join(" ") || ""),
                        "Instagram"
                      )
                    }
                    className="flex-1 rounded-xl bg-linear-to-r from-purple-500 to-pink-500 py-3 text-sm font-bold text-white shadow"
                  >
                    📤 Compartir
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
                    <span className="text-sm font-bold text-blue-900">
                      Caption Facebook
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-gray-800">
                    {kit.caption_facebook}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(kit.caption_facebook || "", "facebook-copy")}
                    className={`flex-1 rounded-xl py-3 text-sm font-bold ${
                      copiedField === "facebook-copy"
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-900 text-white"
                    }`}
                  >
                    {copiedField === "facebook-copy" ? "✅ Copiado" : "📋 Copiar"}
                  </button>
                  <button
                    onClick={() => shareNative(kit.caption_facebook || "", "Facebook")}
                    className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow"
                  >
                    📤 Compartir
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
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          i < 5
                            ? "bg-purple-100 border border-purple-300 text-purple-800"
                            : "bg-white border border-purple-200 text-purple-700"
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      handleCopy(kit.hashtags!.slice(0, 5).join(" "), "hashtags-5")
                    }
                    className={`rounded-xl py-3 text-xs font-bold ${
                      copiedField === "hashtags-5"
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-900 text-white"
                    }`}
                  >
                    {copiedField === "hashtags-5" ? "✅ Copiado" : "📋 Top 5 (TikTok)"}
                  </button>
                  <button
                    onClick={() => handleCopy(kit.hashtags!.join(" "), "hashtags")}
                    className={`rounded-xl py-3 text-xs font-bold ${
                      copiedField === "hashtags"
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-900 text-white"
                    }`}
                  >
                    {copiedField === "hashtags" ? "✅ Copiado" : "📋 Todos (IG)"}
                  </button>
                </div>
              </div>
            )}

            {/* WHATSAPP */}
            {activeTab === "whatsapp" && kit.whatsapp_message && (
              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-emerald-200 bg-linear-to-br from-emerald-50 to-green-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">💬</span>
                    <span className="text-sm font-bold text-emerald-900">
                      Mensaje WhatsApp
                    </span>
                  </div>
                  <div className="rounded-xl bg-[#dcf8c6] p-3 shadow-sm">
                    <p className="whitespace-pre-wrap text-sm text-gray-800">
                      {kit.whatsapp_message}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(kit.whatsapp_message || "", "wa-tab-copy")}
                    className={`flex-1 rounded-xl py-3 text-sm font-bold ${
                      copiedField === "wa-tab-copy"
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-900 text-white"
                    }`}
                  >
                    {copiedField === "wa-tab-copy" ? "✅ Copiado" : "📋 Copiar"}
                  </button>
                  <button
                    onClick={() => openWhatsApp(kit.whatsapp_message || "")}
                    className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white shadow"
                  >
                    💬 Enviar
                  </button>
                </div>
              </div>
            )}

            {/* EMAIL */}
            {activeTab === "email" && kit.email_body && (
              <div className="space-y-4">
                <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-3">
                  <div className="mb-1 text-[10px] font-bold uppercase text-orange-700">
                    Asunto
                  </div>
                  <p className="text-sm font-bold text-gray-900">{kit.email_subject}</p>
                </div>

                <div className="rounded-2xl border-2 border-orange-200 bg-white p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">📧</span>
                    <span className="text-sm font-bold text-orange-900">
                      Cuerpo del email
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-gray-800">
                    {kit.email_body}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(kit.email_body || "", "email-body")}
                    className={`flex-1 rounded-xl py-3 text-sm font-bold ${
                      copiedField === "email-body"
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-900 text-white"
                    }`}
                  >
                    {copiedField === "email-body" ? "✅ Copiado" : "📋 Copiar"}
                  </button>
                  <button
                    onClick={() => {
                      const mailto = `mailto:?subject=${encodeURIComponent(
                        kit.email_subject || ""
                      )}&body=${encodeURIComponent(kit.email_body || "")}`;
                      window.location.href = mailto;
                    }}
                    className="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow"
                  >
                    📧 Abrir email
                  </button>
                </div>
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