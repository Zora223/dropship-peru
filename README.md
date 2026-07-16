# 🛍️ Dropship Perú

> Marketplace SaaS Multi-Tenant tipo Shopify para el mercado peruano.

Plataforma donde cualquier emprendedor crea su tienda online, comparte su link único, y vende productos propios o del catálogo central. Sin comisiones abusivas, sin competencia en la misma vitrina.

## ✨ Características

- 🏪 **Tiendas personalizables** — cada vendedor tiene su propio link y branding
- 📦 **Catálogo híbrido** — productos del proveedor central + productos propios
- 💳 **5 métodos de pago peruanos** — Yape, Plin, Tarjeta, Transferencia, Contra entrega
- 🎨 **Temas personalizables** — colores, tipografía y branding por tienda
- 🛒 **Guest checkout** — el cliente compra sin obligación de registrarse
- 📱 **Diseño moderno tipo Apple** — limpio, rápido, responsive

## 🏗️ Stack Tecnológico

- **Frontend:** React 19 + TypeScript + Vite
- **Estilos:** Tailwind CSS v4
- **Routing:** React Router v6
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Notificaciones:** Python + FastAPI + Twilio (WhatsApp) + Resend (Email)
- **Pagos:** Culqi
- **Deploy:** Netlify

## 🚀 Roles del sistema

- **Admin:** Gestiona catálogo maestro, proveedores, usuarios, tiendas, pedidos globales, temas y configuración de plataforma
- **Vendor:** Importa productos del catálogo, crea productos propios con fotos, configura métodos de cobro, personaliza su tienda
- **Customer:** Compra sin registrarse o crea cuenta para guardar historial, favoritos y direcciones

## 💻 Desarrollo local

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
npm run dev

# Build de producción
npm run build