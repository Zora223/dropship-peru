// src/components/vendor/ProductLaunchKitViewer.tsx
// 🎨 v22.11 - Sistema completo de compartir con opciones específicas por red

import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
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
  | "store"
  | "image"
  | "instagram"
  | "facebook"
  | "hashtags"
  | "whatsapp"
  | "email";

type NetworkType =
  | "instagram"
  | "facebook"
  | "whatsapp"
  | "tiktok"
  | "email"
  | "generic";

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
    title: "Invitación personal",
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
  const [sharing, setSharing] = useState(false);
  const [shareCount, setShareCount] = useState(0);
  const [selectedPromo, setSelectedPromo] = useState<string>("new_collection");
  const [expandedNetwork, setExpandedNetwork] = useState<string | null>(null);

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

  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
  const canShareFiles =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function";

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

  const handleDownload = async () => {
    if (!kit.enhanced_image_url) return;
    try {
      await downloadEnhancedImage(
        kit.enhanced_image_url,
        `${kit.detected_category}-${Date.now()}.png`
      );
    } catch {
      console.warn("Error al descargar la imagen");
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

  const buildTextForNetwork = (network: NetworkType): string => {
    const storePhone = store?.whatsapp || store?.contact_phone || "";
    const cleanPhone = storePhone.replace(/[^\d]/g, "");

    switch (network) {
      case "instagram":
        return (
          (kit.caption_instagram || "") +
          (kit.hashtags?.length ? `\n\n${kit.hashtags.slice(0, 20).join(" ")}` : "")
        );

      case "facebook":
        return kit.caption_facebook || "";

      case "whatsapp":
        return (
          (kit.whatsapp_message || "") +
          `\n\n🛒 Míralo aquí:\n${productUrl}` +
          (cleanPhone ? `\n\n📱 Escríbeme: +51 ${cleanPhone}` : "")
        );

      case "tiktok":
        return (
          (extendedKit.tiktok_caption || kit.caption_instagram || "") +
          (kit.hashtags?.length ? `\n\n${kit.hashtags.slice(0, 5).join(" ")}` : "")
        );

      case "email":
        return kit.email_body || "";

      default:
        return (kit.whatsapp_message || "") + `\n\n🛒 ${productUrl}`;
    }
  };

  // Share nativo con archivo (SOLO MÓVIL)
  const shareWithFileMobile = async (
    text: string,
    title: string
  ): Promise<boolean> => {
    if (!canShareFiles || !kit.enhanced_image_url || !isMobile) return false;

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
      if (errorMsg.includes("cancel") || errorMsg.includes("AbortError")) {
        return true;
      }
      console.log("Share nativo falló:", err);
    }
    return false;
  };

  // Helper para preparar todo (copy + descargar) y abrir URL
  const prepareAndOpen = async (
    url: string,
    text: string,
    field: string,
    showAlert = false,
    alertMessage = ""
  ) => {
    await copyToClipboard(text);
    await handleDownload();
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 3000);
    setShareCount((c) => c + 1);

    if (showAlert && alertMessage) {
      alert(alertMessage);
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  // ═══════════════════════════════════════════════════════════
  // 🚀 COMPARTIR PRODUCTO GENÉRICO
  // ═══════════════════════════════════════════════════════════

  const shareEverything = async () => {
    setSharing(true);
    try {
      const shareText = buildTextForNetwork("generic");

      if (isMobile) {
        const shared = await shareWithFileMobile(
          shareText,
          kit.caption_instagram?.slice(0, 50) || "Mi producto"
        );
        if (shared) {
          setShareCount((c) => c + 1);
          setCopiedField("share-success");
          setTimeout(() => setCopiedField(null), 3000);
          return;
        }
      }

      await copyToClipboard(shareText);
      await handleDownload();
      setCopiedField("share-success");
      setTimeout(() => setCopiedField(null), 3000);
      alert(
        "✅ Todo listo!\n\n📋 Texto copiado\n📥 Imagen descargada\n\nElige una red social abajo."
      );
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setSharing(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // 📘 FACEBOOK - Opciones específicas
  // ═══════════════════════════════════════════════════════════

  const shareFacebookFeed = async () => {
    // Facebook Share Dialog - abre miniventana con foto (via Open Graph) + texto
    const shareText = buildTextForNetwork("facebook");
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      productUrl
    )}&quote=${encodeURIComponent(shareText)}`;

    await copyToClipboard(shareText);
    setCopiedField("fb-feed");
    setTimeout(() => setCopiedField(null), 3000);
    window.open(fbUrl, "_blank", "width=650,height=700");
    setShareCount((c) => c + 1);
  };

  const shareFacebookStory = async () => {
    const shareText = buildTextForNetwork("facebook");
    await prepareAndOpen(
      "https://www.facebook.com/stories/create/",
      shareText,
      "fb-story"
    );
  };

  const shareFacebookGroups = async () => {
    const shareText = buildTextForNetwork("facebook");
    await prepareAndOpen(
      "https://www.facebook.com/groups/feed/",
      shareText,
      "fb-groups",
      true,
      "✅ Texto copiado + Imagen descargada\n\n1️⃣ Facebook se abrió en Grupos\n2️⃣ Elige el grupo donde publicar\n3️⃣ Click 'Crear publicación'\n4️⃣ Sube la imagen\n5️⃣ Pega el texto (Ctrl+V)"
    );
  };

  const shareFacebookMarketplace = async () => {
    const shareText = buildTextForNetwork("facebook");
    await prepareAndOpen(
      "https://www.facebook.com/marketplace/create/item",
      shareText,
      "fb-marketplace",
      true,
      "✅ Texto copiado + Imagen descargada\n\n1️⃣ Marketplace se abrió\n2️⃣ Sube la imagen (ya descargada)\n3️⃣ Pega el texto en descripción (Ctrl+V)\n4️⃣ Elige categoría y precio\n5️⃣ Publica"
    );
  };

  // ═══════════════════════════════════════════════════════════
  // 📷 INSTAGRAM - Opciones específicas
  // ═══════════════════════════════════════════════════════════

  const shareInstagramFeed = async () => {
    const shareText = buildTextForNetwork("instagram");

    if (isMobile) {
      const shared = await shareWithFileMobile(shareText, "Instagram");
      if (shared) {
        setShareCount((c) => c + 1);
        return;
      }
    }

    await prepareAndOpen(
      "https://www.instagram.com/",
      shareText,
      "ig-feed",
      true,
      "✅ Texto copiado + Imagen descargada\n\n1️⃣ Instagram se abrió\n2️⃣ Click en '+' (crear post)\n3️⃣ Sube la imagen (ya descargada)\n4️⃣ En el caption pega el texto (Ctrl+V)\n5️⃣ Publica"
    );
  };

  const shareInstagramStory = async () => {
    const shareText = buildTextForNetwork("instagram");

    if (isMobile) {
      const shared = await shareWithFileMobile(shareText, "Instagram Story");
      if (shared) {
        setShareCount((c) => c + 1);
        return;
      }
    }

    await prepareAndOpen(
      "https://www.instagram.com/create/story/",
      shareText,
      "ig-story",
      true,
      "✅ Texto copiado + Imagen descargada\n\n1️⃣ Instagram se abrió en Historias\n2️⃣ Sube la imagen (ya descargada)\n3️⃣ Agrega texto pegando (Ctrl+V)\n4️⃣ Publica tu historia"
    );
  };

  // ═══════════════════════════════════════════════════════════
  // 💬 WHATSAPP - Opciones específicas
  // ═══════════════════════════════════════════════════════════

  const shareWhatsAppChat = async () => {
    const shareText = buildTextForNetwork("whatsapp");

    if (isMobile) {
      const shared = await shareWithFileMobile(shareText, "WhatsApp");
      if (shared) {
        setShareCount((c) => c + 1);
        return;
      }
    }

    // wa.me abre WhatsApp Web con texto listo (usuario elige a quién enviar)
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    await handleDownload();
    setCopiedField("wa-chat");
    setTimeout(() => setCopiedField(null), 3000);
    window.open(waUrl, "_blank", "noopener,noreferrer");
    setShareCount((c) => c + 1);
  };

  const shareWhatsAppGroup = async () => {
    const shareText = buildTextForNetwork("whatsapp");
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

    await copyToClipboard(shareText);
    await handleDownload();
    setCopiedField("wa-group");
    setTimeout(() => setCopiedField(null), 3000);
    window.open(waUrl, "_blank", "noopener,noreferrer");
    setShareCount((c) => c + 1);

    setTimeout(() => {
      alert(
        "✅ WhatsApp Web abierto con el mensaje listo\n\n1️⃣ Selecciona un GRUPO en la lista\n2️⃣ Adjunta la imagen (📎 clip)\n3️⃣ Envía"
      );
    }, 500);
  };

  const shareWhatsAppStatus = async () => {
    const shareText =
      (kit.whatsapp_message || "") + `\n\n🛒 ${productUrl}`;

    if (isMobile) {
      const shared = await shareWithFileMobile(shareText, "WhatsApp Estado");
      if (shared) {
        setShareCount((c) => c + 1);
        return;
      }
    }

    await prepareAndOpen(
      "https://web.whatsapp.com/",
      shareText,
      "wa-status",
      true,
      "✅ Todo listo para Estado!\n\n📥 Imagen descargada\n📋 Texto copiado\n\n1️⃣ WhatsApp Web se abrió\n2️⃣ Click en tu foto de perfil (arriba izquierda)\n3️⃣ Click en 'Estados'\n4️⃣ Sube la imagen\n5️⃣ Pega el texto (Ctrl+V)"
    );
  };

  // ═══════════════════════════════════════════════════════════
  // 🎵 TIKTOK
  // ═══════════════════════════════════════════════════════════

  const shareToTikTok = async () => {
    const shareText = buildTextForNetwork("tiktok");

    if (isMobile) {
      const shared = await shareWithFileMobile(shareText, "TikTok");
      if (shared) {
        setShareCount((c) => c + 1);
        return;
      }
    }

    await prepareAndOpen(
      "https://www.tiktok.com/tiktokstudio/upload?from=webapp",
      shareText,
      "tiktok",
      true,
      "✅ Texto copiado + Imagen descargada\n\n1️⃣ TikTok Studio se abrió\n2️⃣ Sube la imagen (o crea video con ella)\n3️⃣ Pega el caption (Ctrl+V)\n4️⃣ Publica"
    );
  };

  // ═══════════════════════════════════════════════════════════
  // OTROS (Twitter, Email, LinkedIn)
  // ═══════════════════════════════════════════════════════════

  const shareToTwitter = async () => {
    const shareText = buildTextForNetwork("tiktok");
    const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shareText
    )}&url=${encodeURIComponent(productUrl)}`;
    window.open(twUrl, "_blank", "width=600,height=500");
    setShareCount((c) => c + 1);
  };

  const shareToLinkedIn = async () => {
    const shareText = buildTextForNetwork("facebook");
    const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      productUrl
    )}`;
    await copyToClipboard(shareText);
    setCopiedField("linkedin");
    setTimeout(() => setCopiedField(null), 3000);
    window.open(liUrl, "_blank", "width=600,height=700");
    setShareCount((c) => c + 1);
  };

  const shareByEmail = () => {
    const subject = kit.email_subject || "Producto que te va a encantar";
    const body = kit.email_body || buildTextForNetwork("generic");
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    setShareCount((c) => c + 1);
  };

  // ═══════════════════════════════════════════════════════════
  // COMPARTIR TIENDA
  // ═══════════════════════════════════════════════════════════

  const getSelectedPromoMessage = (): string => {
    const promo = PROMO_MESSAGES.find((p) => p.id === selectedPromo);
    if (!promo || !store) return "";
    return promo.getMessage(store.name, storeUrl);
  };

  const shareStoreOnWhatsApp = () => {
    const msg = getSelectedPromoMessage();
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setShareCount((c) => c + 1);
  };

  const shareStoreOnFacebook = () => {
    const msg = getSelectedPromoMessage();
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      storeUrl
    )}&quote=${encodeURIComponent(msg)}`;
    window.open(fbUrl, "_blank", "width=650,height=700");
    setShareCount((c) => c + 1);
  };

  const shareStoreOnTwitter = () => {
    const msg = getSelectedPromoMessage();
    const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      msg.slice(0, 200)
    )}&url=${encodeURIComponent(storeUrl)}`;
    window.open(twUrl, "_blank", "width=600,height=500");
    setShareCount((c) => c + 1);
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

  const toggleNetwork = (network: string) => {
    setExpandedNetwork(expandedNetwork === network ? null : network);
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
              <div className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 backdrop-blur">
                <span className="text-[10px] font-bold">
                  {isMobile ? "📱 Móvil" : "💻 Desktop"}
                </span>
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
            {/* 🚀 PUBLICAR */}
            {activeTab === "publish" && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900">
                    🚀 Elige dónde publicar
                  </h3>
                  <p className="mt-1 text-xs text-gray-600">
                    Click en la red → elige la sección específica
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

                {/* Botón compartir genérico */}
                <button
                  onClick={shareEverything}
                  disabled={sharing}
                  className="w-full rounded-2xl bg-linear-to-r from-orange-500 via-pink-500 to-purple-600 py-4 text-base font-black text-white shadow-xl hover:shadow-2xl transition hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                >
                  {sharing ? (
                    <>⏳ Preparando...</>
                  ) : copiedField === "share-success" ? (
                    <>✅ Listo! Elige red abajo 👇</>
                  ) : (
                    <>🚀 PREPARAR TODO (texto + imagen)</>
                  )}
                </button>

                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-bold text-gray-400">
                    O ELIGE UNA RED ESPECÍFICA
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* 📘 FACEBOOK */}
                <div className="rounded-2xl border-2 border-blue-200 overflow-hidden">
                  <button
                    onClick={() => toggleNetwork("facebook")}
                    className="w-full bg-linear-to-r from-blue-600 to-blue-800 p-4 text-white text-left flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">📘</div>
                      <div>
                        <div className="text-base font-black">Facebook</div>
                        <div className="text-[11px] opacity-90">4 opciones disponibles</div>
                      </div>
                    </div>
                    <div className="text-xl">
                      {expandedNetwork === "facebook" ? "▲" : "▼"}
                    </div>
                  </button>

                  {expandedNetwork === "facebook" && (
                    <div className="bg-blue-50 p-3 space-y-2">
                      <button
                        onClick={shareFacebookFeed}
                        className="w-full rounded-xl bg-white border-2 border-blue-200 p-3 text-left hover:border-blue-400 hover:bg-blue-50 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">📰</div>
                          <div className="flex-1">
                            <div className="text-sm font-bold text-gray-900">
                              Feed público ⭐
                            </div>
                            <div className="text-[10px] text-gray-600">
                              {copiedField === "fb-feed"
                                ? "✅ Abriendo Facebook..."
                                : "Miniventana con foto + texto (100% pre-cargado)"}
                            </div>
                          </div>
                          <div className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                            AUTO
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={shareFacebookStory}
                        className="w-full rounded-xl bg-white border-2 border-blue-200 p-3 text-left hover:border-blue-400 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">📱</div>
                          <div className="flex-1">
                            <div className="text-sm font-bold text-gray-900">Historia</div>
                            <div className="text-[10px] text-gray-600">
                              {copiedField === "fb-story"
                                ? "✅ Preparado"
                                : "Copia texto + descarga foto + abre historias"}
                            </div>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={shareFacebookGroups}
                        className="w-full rounded-xl bg-white border-2 border-blue-200 p-3 text-left hover:border-blue-400 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">👥</div>
                          <div className="flex-1">
                            <div className="text-sm font-bold text-gray-900">Grupos</div>
                            <div className="text-[10px] text-gray-600">
                              {copiedField === "fb-groups"
                                ? "✅ Preparado"
                                : "Abre grupos + copia texto para pegar"}
                            </div>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={shareFacebookMarketplace}
                        className="w-full rounded-xl bg-white border-2 border-blue-200 p-3 text-left hover:border-blue-400 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">🛍️</div>
                          <div className="flex-1">
                            <div className="text-sm font-bold text-gray-900">
                              Marketplace
                            </div>
                            <div className="text-[10px] text-gray-600">
                              {copiedField === "fb-marketplace"
                                ? "✅ Preparado"
                                : "Crear anuncio en Marketplace"}
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* 📷 INSTAGRAM */}
                <div className="rounded-2xl border-2 border-pink-200 overflow-hidden">
                  <button
                    onClick={() => toggleNetwork("instagram")}
                    className="w-full bg-linear-to-br from-purple-500 via-pink-500 to-orange-400 p-4 text-white text-left flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">📷</div>
                      <div>
                        <div className="text-base font-black">Instagram</div>
                        <div className="text-[11px] opacity-90">2 opciones disponibles</div>
                      </div>
                    </div>
                    <div className="text-xl">
                      {expandedNetwork === "instagram" ? "▲" : "▼"}
                    </div>
                  </button>

                  {expandedNetwork === "instagram" && (
                    <div className="bg-pink-50 p-3 space-y-2">
                      <button
                        onClick={shareInstagramFeed}
                        className="w-full rounded-xl bg-white border-2 border-pink-200 p-3 text-left hover:border-pink-400 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">📰</div>
                          <div className="flex-1">
                            <div className="text-sm font-bold text-gray-900">Feed</div>
                            <div className="text-[10px] text-gray-600">
                              {copiedField === "ig-feed"
                                ? "✅ Preparado"
                                : "Copia texto + descarga foto + abre IG"}
                            </div>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={shareInstagramStory}
                        className="w-full rounded-xl bg-white border-2 border-pink-200 p-3 text-left hover:border-pink-400 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">📱</div>
                          <div className="flex-1">
                            <div className="text-sm font-bold text-gray-900">Historia</div>
                            <div className="text-[10px] text-gray-600">
                              {copiedField === "ig-story"
                                ? "✅ Preparado"
                                : "Copia texto + descarga foto + abre historias"}
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* 💬 WHATSAPP */}
                <div className="rounded-2xl border-2 border-emerald-200 overflow-hidden">
                  <button
                    onClick={() => toggleNetwork("whatsapp")}
                    className="w-full bg-linear-to-br from-emerald-500 to-green-600 p-4 text-white text-left flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">💬</div>
                      <div>
                        <div className="text-base font-black">WhatsApp</div>
                        <div className="text-[11px] opacity-90">3 opciones disponibles</div>
                      </div>
                    </div>
                    <div className="text-xl">
                      {expandedNetwork === "whatsapp" ? "▲" : "▼"}
                    </div>
                  </button>

                  {expandedNetwork === "whatsapp" && (
                    <div className="bg-emerald-50 p-3 space-y-2">
                      <button
                        onClick={shareWhatsAppChat}
                        className="w-full rounded-xl bg-white border-2 border-emerald-200 p-3 text-left hover:border-emerald-400 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">💬</div>
                          <div className="flex-1">
                            <div className="text-sm font-bold text-gray-900">
                              Chat individual ⭐
                            </div>
                            <div className="text-[10px] text-gray-600">
                              {copiedField === "wa-chat"
                                ? "✅ WhatsApp Web abierto"
                                : "Abre WhatsApp con texto listo, tú eliges a quién"}
                            </div>
                          </div>
                          <div className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                            AUTO
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={shareWhatsAppGroup}
                        className="w-full rounded-xl bg-white border-2 border-emerald-200 p-3 text-left hover:border-emerald-400 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">👥</div>
                          <div className="flex-1">
                            <div className="text-sm font-bold text-gray-900">Grupo</div>
                            <div className="text-[10px] text-gray-600">
                              {copiedField === "wa-group"
                                ? "✅ Preparado"
                                : "Abre WA con mensaje, elige grupo"}
                            </div>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={shareWhatsAppStatus}
                        className="w-full rounded-xl bg-white border-2 border-emerald-200 p-3 text-left hover:border-emerald-400 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">📱</div>
                          <div className="flex-1">
                            <div className="text-sm font-bold text-gray-900">Estado</div>
                            <div className="text-[10px] text-gray-600">
                              {copiedField === "wa-status"
                                ? "✅ Todo preparado"
                                : "Copia + descarga + abre WA Web"}
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* 🎵 TIKTOK */}
                <button
                  onClick={shareToTikTok}
                  className="w-full rounded-2xl bg-linear-to-br from-gray-900 to-black p-4 text-white shadow-lg hover:shadow-xl transition hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">🎵</div>
                    <div className="flex-1 text-left">
                      <div className="text-base font-black">TikTok</div>
                      <div className="text-[11px] opacity-90">
                        {copiedField === "tiktok"
                          ? "✅ Preparado, abriendo TikTok..."
                          : "Copia caption + descarga foto + abre TikTok Studio"}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Otros: Twitter, Email, LinkedIn */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={shareToTwitter}
                    className="rounded-xl bg-linear-to-br from-slate-800 to-black p-3 text-white shadow-lg hover:shadow-xl transition hover:scale-105"
                  >
                    <div className="text-2xl mb-1">𝕏</div>
                    <div className="text-[10px] font-black">Twitter</div>
                  </button>

                  <button
                    onClick={shareToLinkedIn}
                    className="rounded-xl bg-linear-to-br from-blue-700 to-blue-900 p-3 text-white shadow-lg hover:shadow-xl transition hover:scale-105"
                  >
                    <div className="text-2xl mb-1">💼</div>
                    <div className="text-[10px] font-black">LinkedIn</div>
                  </button>

                  <button
                    onClick={shareByEmail}
                    className="rounded-xl bg-linear-to-br from-orange-500 to-red-500 p-3 text-white shadow-lg hover:shadow-xl transition hover:scale-105"
                  >
                    <div className="text-2xl mb-1">📧</div>
                    <div className="text-[10px] font-black">Email</div>
                  </button>
                </div>

                {/* CTA tienda */}
                {store && (
                  <button
                    onClick={() => setActiveTab("store")}
                    className="w-full rounded-xl border-2 border-blue-300 bg-linear-to-br from-blue-50 to-cyan-50 p-4 text-blue-900 hover:shadow-md transition"
                  >
                    <div className="flex items-center gap-3 justify-center">
                      <div className="text-3xl">🏪</div>
                      <div className="text-left">
                        <div className="text-sm font-black">
                          ¿Quieres promocionar tu tienda?
                        </div>
                        <div className="text-[11px] opacity-80">
                          Mensajes listos + QR + link → Click aquí
                        </div>
                      </div>
                    </div>
                  </button>
                )}

                {store?.slug && (
                  <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3">
                    <div className="text-[11px] font-bold text-blue-900 mb-1">
                      🔗 Link del producto:
                    </div>
                    <div className="text-[10px] text-blue-700 break-all font-mono bg-white/50 rounded px-2 py-1">
                      {productUrl}
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
                    Comparte tu tienda completa con mensajes listos
                  </p>
                </div>

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

                <div>
                  <h4 className="mb-2 text-sm font-black text-gray-900">
                    💬 Elige un mensaje promocional:
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

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={shareStoreOnWhatsApp}
                    className="rounded-xl bg-linear-to-br from-emerald-500 to-green-600 p-3 text-white shadow-lg hover:shadow-xl transition hover:scale-105"
                  >
                    <div className="text-2xl mb-1">💬</div>
                    <div className="text-[10px] font-black">WhatsApp</div>
                  </button>

                  <button
                    onClick={shareStoreOnFacebook}
                    className="rounded-xl bg-linear-to-br from-blue-600 to-blue-800 p-3 text-white shadow-lg hover:shadow-xl transition hover:scale-105"
                  >
                    <div className="text-2xl mb-1">📘</div>
                    <div className="text-[10px] font-black">Facebook</div>
                  </button>

                  <button
                    onClick={shareStoreOnTwitter}
                    className="rounded-xl bg-linear-to-br from-slate-800 to-black p-3 text-white shadow-lg hover:shadow-xl transition hover:scale-105"
                  >
                    <div className="text-2xl mb-1">𝕏</div>
                    <div className="text-[10px] font-black">Twitter</div>
                  </button>

                  <button
                    onClick={copyStoreMessage}
                    className={`rounded-xl p-3 shadow-lg hover:shadow-xl transition hover:scale-105 ${
                      copiedField === "promo-msg"
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-900 text-white"
                    }`}
                  >
                    <div className="text-2xl mb-1">
                      {copiedField === "promo-msg" ? "✅" : "📋"}
                    </div>
                    <div className="text-[10px] font-black">
                      {copiedField === "promo-msg" ? "Copiado" : "Copiar"}
                    </div>
                  </button>
                </div>

                <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3">
                  <div className="text-[11px] font-bold text-amber-900 mb-2">
                    💡 Tips para promocionar:
                  </div>
                  <ul className="space-y-1 text-[11px] text-amber-800">
                    <li>📱 Comparte el QR en tarjetas de presentación</li>
                    <li>🖨️ Imprime el QR y pégalo en tu local</li>
                    <li>📸 Sube el QR a tu historia de Instagram</li>
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
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(buildTextForNetwork("instagram"), "instagram-copy")}
                    className={`flex-1 rounded-xl py-3 text-sm font-bold ${
                      copiedField === "instagram-copy" ? "bg-emerald-500 text-white" : "bg-gray-900 text-white"
                    }`}
                  >
                    {copiedField === "instagram-copy" ? "✅ Copiado" : "📋 Copiar"}
                  </button>
                  <button
                    onClick={shareInstagramFeed}
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
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(buildTextForNetwork("facebook"), "facebook-copy")}
                    className={`flex-1 rounded-xl py-3 text-sm font-bold ${
                      copiedField === "facebook-copy" ? "bg-emerald-500 text-white" : "bg-gray-900 text-white"
                    }`}
                  >
                    {copiedField === "facebook-copy" ? "✅ Copiado" : "📋 Copiar"}
                  </button>
                  <button
                    onClick={shareFacebookFeed}
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
                    onClick={() => handleCopy(kit.hashtags!.slice(0, 5).join(" "), "hashtags-5")}
                    className={`rounded-xl py-3 text-xs font-bold ${
                      copiedField === "hashtags-5" ? "bg-emerald-500 text-white" : "bg-gray-900 text-white"
                    }`}
                  >
                    {copiedField === "hashtags-5" ? "✅ Copiado" : "📋 Top 5 (TikTok)"}
                  </button>
                  <button
                    onClick={() => handleCopy(kit.hashtags!.join(" "), "hashtags")}
                    className={`rounded-xl py-3 text-xs font-bold ${
                      copiedField === "hashtags" ? "bg-emerald-500 text-white" : "bg-gray-900 text-white"
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
                    <span className="text-sm font-bold text-emerald-900">Mensaje WhatsApp</span>
                  </div>
                  <div className="rounded-xl bg-[#dcf8c6] p-3 shadow-sm">
                    <p className="whitespace-pre-wrap text-sm text-gray-800">
                      {kit.whatsapp_message}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={shareWhatsAppChat}
                    className="rounded-xl bg-emerald-500 py-3 text-xs font-bold text-white shadow"
                  >
                    💬 Chat
                  </button>
                  <button
                    onClick={shareWhatsAppGroup}
                    className="rounded-xl bg-green-600 py-3 text-xs font-bold text-white shadow"
                  >
                    👥 Grupo
                  </button>
                  <button
                    onClick={shareWhatsAppStatus}
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
                    <span className="text-sm font-bold text-orange-900">Cuerpo del email</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-gray-800">{kit.email_body}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(buildTextForNetwork("email"), "email-body")}
                    className={`flex-1 rounded-xl py-3 text-sm font-bold ${
                      copiedField === "email-body" ? "bg-emerald-500 text-white" : "bg-gray-900 text-white"
                    }`}
                  >
                    {copiedField === "email-body" ? "✅ Copiado" : "📋 Copiar"}
                  </button>
                  <button
                    onClick={shareByEmail}
                    className="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow"
                  >
                    📧 Enviar
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