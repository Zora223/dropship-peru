import { useState } from "react";
import { trackWhatsAppClick, type WhatsAppClickType } from "../lib/analytics";

interface WhatsappFloatingButtonProps {
  /** Número de WhatsApp (formato libre, se limpia automático) */
  phone: string;
  /** Mensaje pre-llenado en WhatsApp al abrirlo */
  message?: string;
  /** Título del tooltip */
  tooltip?: string;
  /** Subtítulo del tooltip */
  subtitle?: string;
  /** Color del botón (default: verde WhatsApp oficial) */
  color?: string;
  /** Mostrar animación de pulso */
  pulse?: boolean;
  /** Prioridad visual — más grande y llamativo (para pagos) */
  highlight?: boolean;

  // ⭐ NUEVAS PROPS PARA ANALYTICS
  /** ID de la tienda (para tracking) — opcional */
  storeId?: string;
  /** ID del producto (opcional, si el botón está asociado a un producto) */
  productId?: string;
  /** Tipo de click — default: "floating" */
  clickType?: WhatsAppClickType;
}

/**
 * Convierte un teléfono peruano en URL válida de wa.me
 */
function getWhatsappUrl(phone: string, message?: string): string {
  const digits = phone.replace(/[^0-9]/g, "");

  let fullNumber = digits;
  if (digits.length === 9 && !digits.startsWith("51")) {
    fullNumber = `51${digits}`;
  }

  const url = `https://wa.me/${fullNumber}`;

  if (message) {
    return `${url}?text=${encodeURIComponent(message)}`;
  }

  return url;
}

export default function WhatsappFloatingButton({
  phone,
  message,
  tooltip = "¿Necesitas ayuda?",
  subtitle = "Responderemos lo más pronto posible",
  color = "#25D366",
  pulse = true,
  highlight = false,
  storeId,
  productId,
  clickType = "floating",
}: WhatsappFloatingButtonProps) {
  const [expanded, setExpanded] = useState(false);

  if (!phone) return null;

  const url = getWhatsappUrl(phone, message);

  // Tamaños según prioridad
  const btnSize = highlight
    ? "h-16 w-16 sm:h-18 sm:w-18"
    : "h-14 w-14 sm:h-16 sm:w-16";
  const iconSize = highlight
    ? "h-8 w-8 sm:h-9 sm:w-9"
    : "h-7 w-7 sm:h-8 sm:w-8";

  // ⭐ Handler para trackear el click (silencioso, no bloquea la redirección)
  const handleClick = () => {
    if (storeId) {
      trackWhatsAppClick({
        storeId,
        productId,
        clickType,
      });
    }
  };

  return (
    <>
      {/* Tooltip expandido (desktop hover) */}
      <div
        className={`fixed bottom-24 right-6 z-50 hidden max-w-xs rounded-2xl bg-white p-4 shadow-2xl transition-all duration-300 sm:block ${
          expanded
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg text-white"
            style={{ backgroundColor: color }}
          >
            💬
          </div>

          <div className="flex-1">
            <div className="font-bold text-gray-900">{tooltip}</div>
            <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleClick}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow transition hover:brightness-110"
              style={{ backgroundColor: color }}
            >
              💬 Abrir WhatsApp
            </a>
          </div>

          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-lg text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Flecha apuntando al botón */}
        <div className="absolute -bottom-2 right-8 h-4 w-4 rotate-45 bg-white shadow-md" />
      </div>

      {/* Etiqueta "clickeable" en móvil (para highlight) */}
      {highlight && (
        <div className="fixed bottom-24 right-6 z-40 sm:hidden">
          <div
            className="rounded-full bg-white px-4 py-2 text-xs font-bold shadow-lg"
            style={{ color }}
          >
            📸 Enviar comprobante
          </div>
        </div>
      )}

      {/* Botón principal */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Anillos de pulso */}
        {pulse && (
          <>
            <span
              className="absolute inset-0 animate-ping rounded-full opacity-30"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            <span
              className="absolute inset-0 animate-pulse rounded-full opacity-40"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
          </>
        )}

        {/* Botón */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          onMouseEnter={() => setExpanded(true)}
          onMouseLeave={() => setExpanded(false)}
          className={`relative flex ${btnSize} items-center justify-center rounded-full text-white shadow-2xl transition hover:scale-110 active:scale-95`}
          style={{ backgroundColor: color }}
          aria-label="Contactar por WhatsApp"
        >
          {/* Ícono oficial de WhatsApp */}
          <svg viewBox="0 0 24 24" fill="currentColor" className={iconSize}>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
        </a>
      </div>
    </>
  );
}