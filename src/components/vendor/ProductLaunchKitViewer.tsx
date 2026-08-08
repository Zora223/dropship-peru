// src/components/vendor/ProductLaunchKitViewer.tsx
// 🎨 v22.12.1 - Web Share API nativo + foto en móvil

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

// ─────────────────────────────────────────────
// Helpers fuera del componente (no cambian entre renders)
// ─────────────────────────────────────────────

/** Descarga la imagen del kit y la convierte en File para Web Share API */
async function fetchImageFile(imageUrl: string): Promise<File | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    const ext = blob.type.includes("png") ? "png" : "jpg";
    return new File([blob], `producto.${ext}`, { type: blob.type });
  } catch {
    return null;
  }
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
  const [selectedPromo, setSelectedPromo] = useState("new_collection");
  // Indica que shareNative está cargando la imagen
  const [sharing, setSharing] = useState<string | null>(null);

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
  // HELPERS UI
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
  // 🚀 SHARE NATIVO — texto + foto (móvil) / solo texto (desktop)
  // ═══════════════════════════════════════════════════════════

  /**
   * Intenta compartir con foto (Android / iOS con Web Share API Level 2).
   * Si no soporta archivos → comparte solo texto + URL.
   * Si no soporta share en absoluto → copia al portapapeles.
   */
  const shareNative = async (
    text: string,
    shareId: string,
    title = "Mira este producto",
    targetUrl = productUrl
  ) => {
    setSharing(shareId);

    try {
      const imageUrl = kit.enhanced_image_url || kit.original_image_url;

      // ── Intento 1: Share con archivo (móvil moderno) ──────────────
      if (imageUrl && navigator.canShare) {
        const file = await fetchImageFile(imageUrl);
        if (file) {
          const dataWithFile: ShareData = {
            title,
            text,
            files: [file],
          };
          if (navigator.canShare(dataWithFile)) {
            await navigator.share(dataWithFile);
            return; // ✅ éxito con foto
          }
        }
      }

      // ── Intento 2: Share sin archivo pero con URL ─────────────────
      if (navigator.share) {
        await navigator.share({ title, text, url: targetUrl });
        return; // ✅ éxito sin foto
      }

      // ── Fallback: copiar al portapapeles ──────────────────────────
      await copyToClipboard(`${text}\n\n${targetUrl}`);
      setCopiedField(shareId);
      setTimeout(() => setCopiedField(null), 2500);
    } catch (err) {
      // El usuario canceló → ignorar silenciosamente
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.toLowerCase().includes("cancel") && !msg.toLowerCase().includes("abort")) {
        console.warn("shareNative error:", err);
      }
    } finally {
      setSharing(null);
    }
  };

  /** Variante para compartir la tienda (URL = storeUrl) */
  const shareStoreNative = (text: string, title?: string) =>
    shareNative(text, "store-share", title ?? store?.name ?? "Mi tienda", storeUrl);

  // ═══════════════════════════════════════════════════════════
  // 💬 WhatsApp (link universal — funciona en móvil y desktop)
  // ═══════════════════════════════════════════════════════════

  const openWhatsApp = (text: string) => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
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
    await handleCopy(getSelectedPromoMessage(), "promo-msg");
  };

  const copyStoreLink = async () => {
    await handleCopy(storeUrl, "store-link");
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  if (!isOpen) return null;

  const TABS: { id: TabId; label: string; icon: string; hasContent: boolean }[] = [
    { id: "publish",   label: "🚀 PUBLICAR", icon: "🚀", hasContent: true },
    { id: "store",     label: "🏪 MI TIENDA", icon: "🏪", hasContent: !!store },
    { id: "image",     label: "Imagen",      icon: "📸", hasContent: !!kit.enhanced_image_url },
    { id: "instagram", label: "Instagram",   icon: "📷", hasContent: !!kit.caption_instagram },
    { id: "facebook",  label: "Facebook",    icon: "📘", hasContent: !!kit.caption_facebook },
    { id: "hashtags",  label: "Hashtags",    icon: "🏷️", hasContent: !!kit.hashtags?.length },
    { id: "whatsapp",  label: "WhatsApp",    icon: "💬", hasContent: !!kit.whatsapp_message },
    { id: "email",     label: "Email",       icon: "📧", hasContent: !!kit.email_body },
  ];

  // ── Botón de compartir reutilizable ───────────────────────
  const ShareBtn = ({
    text,
    shareId,
    title,
    className,
    children,
  }: {
    text: string;
    shareId: string;
    title?: string;
    className: string;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => shareNative(text, shareId, title)}
      disabled={sharing === shareId}
      className={`${className} disabled:opacity-60 disabled:cursor-wait transition`}
    >
      {sharing === shareId ? "⏳" : children}
    </button>
  );

  // ── Botón copiar reutilizable ─────────────────────────────
  const CopyBtn = ({
    text,
    field,
    className,
  }: {
    text: string;
    field: string;
    className: string;
  }) => (
    <button onClick={() => handleCopy(text, field)} className={`${className} transition`}>
      {copiedField === field ? "✅ Copiado" : "📋 Copiar"}
    </button>
  );

  return (
    <>
      {/* ── Fullscreen imagen ─────────────────────────────── */}
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

      {/* ── Modal principal ───────────────────────────────── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4">
        <div
          className="relative w-full max-w-4xl h-[95vh] sm:h-[90vh] overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ────────────────────────────────────── */}
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

          {/* ── Tabs ──────────────────────────────────────── */}
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

          {/* ── Content ───────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">

            {/* ══════════════════════════════════════════════
                🚀 PUBLICAR
            ══════════════════════════════════════════════ */}
            {activeTab === "publish" && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900">
                    🚀 Compartir producto
                  </h3>
                  <p className="mt-1 text-xs text-gray-600">
                    En móvil → abre menú nativo con foto incluida 📸
                  </p>
                </div>

                {/* Preview */}
                <div
                  className="rounded-xl overflow-hidden bg-gray-100 border-2 border-gray-200 max-w-[200px] mx-auto cursor-pointer"
                  onClick={() => setImageFullscreen(true)}
                >
                  <img
                    src={kit.enhanced_image_url || kit.original_image_url}
                    alt="Producto"
                    className="w-full h-auto object-contain aspect-square"
                  />
                </div>

                {/* ─ Instagram ─ */}
                {kit.caption_instagram && (
                  <NetworkCard
                    emoji="📷"
                    label="Instagram"
                    labelColor="text-pink-900"
                    bg="bg-linear-to-br from-purple-50 to-pink-50"
                    border="border-pink-200"
                    preview={kit.caption_instagram}
                  >
                    <CopyBtn
                      text={kit.caption_instagram + "\n\n" + (kit.hashtags?.join(" ") ?? "")}
                      field="ig-copy"
                      className="flex-1 rounded-xl py-2.5 text-xs font-bold bg-white border-2 border-pink-300 text-pink-700 hover:bg-pink-50"
                    />
                    <ShareBtn
                      text={kit.caption_instagram + "\n\n" + (kit.hashtags?.join(" ") ?? "")}
                      shareId="ig-share"
                      title="Instagram"
                      className="flex-1 rounded-xl bg-linear-to-r from-purple-500 to-pink-500 py-2.5 text-xs font-bold text-white shadow"
                    >
                      📤 Compartir
                    </ShareBtn>
                  </NetworkCard>
                )}

                {/* ─ Facebook ─ */}
                {kit.caption_facebook && (
                  <NetworkCard
                    emoji="📘"
                    label="Facebook"
                    labelColor="text-blue-900"
                    bg="bg-linear-to-br from-blue-50 to-indigo-50"
                    border="border-blue-200"
                    preview={kit.caption_facebook}
                  >
                    <CopyBtn
                      text={kit.caption_facebook}
                      field="fb-copy"
                      className="flex-1 rounded-xl py-2.5 text-xs font-bold bg-white border-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                    />
                    <ShareBtn
                      text={kit.caption_facebook}
                      shareId="fb-share"
                      title="Facebook"
                      className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow"
                    >
                      📤 Compartir
                    </ShareBtn>
                  </NetworkCard>
                )}

                {/* ─ WhatsApp ─ */}
                {kit.whatsapp_message && (
                  <NetworkCard
                    emoji="💬"
                    label="WhatsApp"
                    labelColor="text-emerald-900"
                    bg="bg-linear-to-br from-emerald-50 to-green-50"
                    border="border-emerald-200"
                    preview={kit.whatsapp_message}
                  >
                    <CopyBtn
                      text={kit.whatsapp_message}
                      field="wa-copy"
                      className="flex-1 rounded-xl py-2.5 text-xs font-bold bg-white border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    />
                    <button
                      onClick={() => openWhatsApp(kit.whatsapp_message!)}
                      className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-white shadow transition hover:bg-emerald-600"
                    >
                      💬 Enviar
                    </button>
                  </NetworkCard>
                )}

                {/* ─ TikTok ─ */}
                {extendedKit.tiktok_caption && (
                  <div className="rounded-2xl bg-linear-to-br from-gray-900 to-black p-4 text-white border-2 border-gray-700">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">🎵</span>
                      <span className="text-sm font-black">TikTok</span>
                    </div>
                    <p className="text-xs text-white/80 mb-3 line-clamp-3 whitespace-pre-wrap">
                      {extendedKit.tiktok_caption}
                    </p>
                    <div className="flex gap-2">
                      <CopyBtn
                        text={
                          extendedKit.tiktok_caption +
                          "\n\n" +
                          (kit.hashtags?.slice(0, 5).join(" ") ?? "")
                        }
                        field="tt-copy"
                        className="flex-1 rounded-xl py-2.5 text-xs font-bold bg-white/20 text-white hover:bg-white/30"
                      />
                      <ShareBtn
                        text={
                          extendedKit.tiktok_caption +
                          "\n\n" +
                          (kit.hashtags?.slice(0, 5).join(" ") ?? "")
                        }
                        shareId="tt-share"
                        title="TikTok"
                        className="flex-1 rounded-xl bg-white text-black py-2.5 text-xs font-bold shadow"
                      >
                        📤 Compartir
                      </ShareBtn>
                    </div>
                  </div>
                )}

                {/* ─ Email ─ */}
                {kit.email_body && (
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
                        window.location.href = `mailto:?subject=${encodeURIComponent(
                          kit.email_subject ?? ""
                        )}&body=${encodeURIComponent(kit.email_body ?? "")}`;
                      }}
                      className="w-full rounded-xl bg-orange-500 py-2.5 text-xs font-bold text-white shadow hover:bg-orange-600 transition"
                    >
                      📧 Abrir email
                    </button>
                  </div>
                )}

                {/* ─ Link del producto ─ */}
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

                {/* ─ Tienda CTA ─ */}
                {store && (
                  <button
                    onClick={() => setActiveTab("store")}
                    className="w-full rounded-xl border-2 border-blue-300 bg-linear-to-br from-blue-50 to-cyan-50 p-4 text-blue-900 hover:shadow-md transition"
                  >
                    <div className="flex items-center gap-3 justify-center">
                      <span className="text-3xl">🏪</span>
                      <div className="text-left">
                        <div className="text-sm font-black">¿Quieres promocionar tu tienda?</div>
                        <div className="text-[11px] opacity-80">
                          Mensajes listos + QR + link → Click aquí
                        </div>
                      </div>
                    </div>
                  </button>
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

            {/* ══════════════════════════════════════════════
                🏪 MI TIENDA
            ══════════════════════════════════════════════ */}
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
                          className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800 transition"
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
                    <span className="text-sm font-bold text-emerald-900">Vista previa</span>
                  </div>
                  <div className="rounded-xl bg-[#dcf8c6] p-3 shadow-sm">
                    <p className="whitespace-pre-wrap text-sm text-gray-800">
                      {getSelectedPromoMessage()}
                    </p>
                  </div>
                </div>

                {/* Botones compartir tienda */}
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
                    className="flex-1 rounded-xl bg-emerald-500 py-3 text-xs font-bold text-white shadow hover:bg-emerald-600 transition"
                  >
                    💬 WhatsApp
                  </button>
                  <button
                    onClick={() => shareStoreNative(getSelectedPromoMessage())}
                    disabled={sharing === "store-share"}
                    className="flex-1 rounded-xl bg-linear-to-r from-purple-500 to-pink-500 py-3 text-xs font-bold text-white shadow disabled:opacity-60 disabled:cursor-wait transition"
                  >
                    {sharing === "store-share" ? "⏳" : "📤 Compartir"}
                  </button>
                </div>

                <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3">
                  <div className="text-[11px] font-bold text-amber-900 mb-2">💡 Tips:</div>
                  <ul className="space-y-1 text-[11px] text-amber-800">
                    <li>📱 Comparte el QR en tarjetas de presentación</li>
                    <li>🖨️ Imprime el QR y pégalo en tu local</li>
                    <li>🕐 Publica en horas pico (12pm-2pm, 7pm-9pm)</li>
                  </ul>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════
                📸 IMAGEN
            ══════════════════════════════════════════════ */}
            {activeTab === "image" && kit.enhanced_image_url && (
              <div className="space-y-4">
                <div
                  className="rounded-2xl overflow-hidden bg-gray-100 border-2 border-gray-200 max-w-md mx-auto cursor-pointer"
                  onClick={() => setImageFullscreen(true)}
                >
                  <img
                    src={kit.enhanced_image_url}
                    alt="Producto"
                    className="w-full h-auto object-contain aspect-square"
                  />
                </div>
                <p className="text-center text-xs text-gray-500">
                  Toca la imagen para pantalla completa
                </p>
                <ShareBtn
                  text="Mira este producto"
                  shareId="img-share"
                  title="Producto"
                  className="w-full rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 py-3 text-sm font-bold text-white shadow-lg"
                >
                  📤 Compartir imagen
                </ShareBtn>
              </div>
            )}

            {/* ══════════════════════════════════════════════
                📷 INSTAGRAM
            ══════════════════════════════════════════════ */}
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
                </div>
                <div className="flex gap-2">
                  <CopyBtn
                    text={kit.caption_instagram + "\n\n" + (kit.hashtags?.join(" ") ?? "")}
                    field="instagram-copy"
                    className="flex-1 rounded-xl py-3 text-sm font-bold bg-gray-900 text-white"
                  />
                  <ShareBtn
                    text={kit.caption_instagram + "\n\n" + (kit.hashtags?.join(" ") ?? "")}
                    shareId="ig-tab-share"
                    title="Instagram"
                    className="flex-1 rounded-xl bg-linear-to-r from-purple-500 to-pink-500 py-3 text-sm font-bold text-white shadow"
                  >
                    📤 Compartir
                  </ShareBtn>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════
                📘 FACEBOOK
            ══════════════════════════════════════════════ */}
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
                </div>
                <div className="flex gap-2">
                  <CopyBtn
                    text={kit.caption_facebook}
                    field="facebook-copy"
                    className="flex-1 rounded-xl py-3 text-sm font-bold bg-gray-900 text-white"
                  />
                  <ShareBtn
                    text={kit.caption_facebook}
                    shareId="fb-tab-share"
                    title="Facebook"
                    className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow"
                  >
                    📤 Compartir
                  </ShareBtn>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════
                🏷️ HASHTAGS
            ══════════════════════════════════════════════ */}
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
                  <CopyBtn
                    text={kit.hashtags.slice(0, 5).join(" ")}
                    field="hashtags-5"
                    className="rounded-xl py-3 text-xs font-bold bg-gray-900 text-white"
                  />
                  <CopyBtn
                    text={kit.hashtags.join(" ")}
                    field="hashtags-all"
                    className="rounded-xl py-3 text-xs font-bold bg-gray-700 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-center text-gray-500">
                  <span>Top 5 (TikTok)</span>
                  <span>Todos (Instagram)</span>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════
                💬 WHATSAPP
            ══════════════════════════════════════════════ */}
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
                </div>
                <div className="flex gap-2">
                  <CopyBtn
                    text={kit.whatsapp_message}
                    field="wa-tab-copy"
                    className="flex-1 rounded-xl py-3 text-sm font-bold bg-gray-900 text-white"
                  />
                  <button
                    onClick={() => openWhatsApp(kit.whatsapp_message!)}
                    className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white shadow hover:bg-emerald-600 transition"
                  >
                    💬 Enviar
                  </button>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════
                📧 EMAIL
            ══════════════════════════════════════════════ */}
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
                    <span className="text-sm font-bold text-orange-900">Cuerpo del email</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-gray-800">{kit.email_body}</p>
                </div>
                <div className="flex gap-2">
                  <CopyBtn
                    text={kit.email_body}
                    field="email-body"
                    className="flex-1 rounded-xl py-3 text-sm font-bold bg-gray-900 text-white"
                  />
                  <button
                    onClick={() => {
                      window.location.href = `mailto:?subject=${encodeURIComponent(
                        kit.email_subject ?? ""
                      )}&body=${encodeURIComponent(kit.email_body ?? "")}`;
                    }}
                    className="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow hover:bg-orange-600 transition"
                  >
                    📧 Abrir email
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ────────────────────────────────────── */}
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

// ─────────────────────────────────────────────────────────────
// Sub-componente: tarjeta de red social (evita repetición)
// ─────────────────────────────────────────────────────────────
function NetworkCard({
  emoji,
  label,
  labelColor,
  bg,
  border,
  preview,
  children,
}: {
  emoji: string;
  label: string;
  labelColor: string;
  bg: string;
  border: string;
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl ${bg} border-2 ${border} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{emoji}</span>
        <span className={`text-sm font-black ${labelColor}`}>{label}</span>
      </div>
      <p className="text-xs text-gray-700 mb-3 line-clamp-3 whitespace-pre-wrap">{preview}</p>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}