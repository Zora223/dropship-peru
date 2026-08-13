// src/components/marketplace/SEOHead.tsx
// 🏪 v22.15 - Meta tags dinámicos para SEO

import { useEffect } from "react";

interface Props {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "product" | "article";
}

/**
 * Componente que actualiza los meta tags de la página.
 * Sin librerías externas.
 */
export default function SEOHead({
  title = "Dropship Perú - Marketplace de tiendas peruanas",
  description = "Descubre productos únicos de tiendas peruanas verificadas. Envíos en 24-48h. Compra directo a emprendedores locales.",
  image = "https://dropship-peru-mym.netlify.app/og-image.jpg",
  url,
  type = "website",
}: Props) {
  useEffect(() => {
    const currentUrl = url ?? window.location.href;

    // Title
    document.title = title;

    // Función helper para setear meta tags
    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let element = document.querySelector(`meta[${attr}="${name}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    // Meta básicos
    setMeta("description", description);

    // Open Graph (Facebook, WhatsApp)
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:image", image, true);
    setMeta("og:url", currentUrl, true);
    setMeta("og:type", type, true);
    setMeta("og:site_name", "Dropship Perú", true);
    setMeta("og:locale", "es_PE", true);

    // Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", image);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", currentUrl);
  }, [title, description, image, url, type]);

  return null;
}