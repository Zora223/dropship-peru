// src/types/database.ts
export type UserRole = "admin" | "vendor" | "customer" | "delivery" | "supplier";
export type ProductSource = "catalog" | "own";
export type OrderStatus = "pending_payment" | "confirmed" | "shipped" | "delivered" | "cancelled";
export type PaymentMethodType = "yape" | "plin" | "card" | "transfer" | "cash_on_delivery";
export type SubscriptionStatus = "trial" | "active" | "expired" | "cancelled";

export interface DbProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbSupplier {
  id: string;
  name: string;
  contact_email: string;
  contact_phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DbCatalogProduct {
  id: string;
  supplier_id: string;
  name: string;
  description: string | null;
  base_price: number;
  suggested_price: number;
  stock: number;
  sku: string;
  category: string;
  images: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbStoreTheme {
  primary_color: string;
  secondary_color: string;
  font_family: string;
  banner_text: string;
  show_banner: boolean;
  store_motto: string;
}

export interface DbStorePaymentMethod {
  id: PaymentMethodType;
  enabled: boolean;
  config: Record<string, string>;
}

export interface DbStore {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  theme: DbStoreTheme;
  payment_methods: DbStorePaymentMethod[];
  contact_email: string | null;
  contact_phone: string | null;
  instagram: string | null;
  facebook: string | null;
  whatsapp: string | null;
  is_active: boolean;
  // 👇 NUEVOS CAMPOS DE SUSCRIPCIÓN
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  plan_price: number;
  // 👆
  created_at: string;
  updated_at: string;
}

export interface DbProduct {
  id: string;
  store_id: string;
  source: ProductSource;
  catalog_product_id: string | null;
  name: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
  sku: string | null;
  category: string | null;
  images: string[];
  is_active: boolean;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbOrderItem {
  product_id: string;
  product_name: string;
  source: ProductSource;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface DbShippingAddress {
  full_name: string;
  phone: string;
  street: string;
  district: string;
  city: string;
  reference: string | null;
}

export interface DbOrder {
  id: string;
  order_number: string;
  store_id: string;
  customer_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: DbShippingAddress;
  items: DbOrderItem[];
  subtotal: number;
  total: number;
  payment_method: PaymentMethodType;
  status: OrderStatus;
  tracking_number: string | null;
  notes: string | null;
  has_catalog_items: boolean;
  created_at: string;
  updated_at: string;

  // 🆕 Campos de delivery (Sesión 6 - FASE 1)
  // delivery_status es text libre en BD, valores válidos abajo:
  delivery_id: string | null;
  delivery_status:
    | "unassigned"
    | "assigned"
    | "picked_up"
    | "delivered"
    | "failed"
    | null;
  delivery_assigned_at: string | null;
  delivery_delivered_at: string | null;
  delivery_notes: string | null;
}

export interface DbCustomerAddress {
  id: string;
  customer_id: string;
  label: string;
  full_name: string;
  phone: string;
  street: string;
  district: string;
  city: string;
  reference: string | null;
  is_default: boolean;
  created_at: string;
}

export interface DbCustomerFavorite {
  id: string;
  customer_id: string;
  product_id: string;
  created_at: string;
}

export interface DbPlatformSettings {
  id: number;
  platform_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  enabled_payment_methods: string[];
  active_theme_id: string;
  banner_enabled: boolean;
  banner_text: string;
  banner_link: string;
  seasonal_effect: string;

  // 🆕 NUEVOS CAMPOS DEL BANNER
  promo_countdown_date: string | null;
  promo_dismissible: boolean;
  promo_link_text: string;
  promo_hide_on_expire: boolean;
  promo_show_icon: boolean;
}

// ========== REVIEWS ==========
export interface DbProductReview {
  id: string;
  product_id: string;
  store_id: string;
  order_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_user_id: string | null;
  rating: number;
  title: string | null;
  comment: string | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  helpful_count: number;
  ip_hash: string | null;
  created_at: string;
  updated_at: string;
  avg_rating: number;
  review_count: number;
}

// Agregar estos campos a DbProduct (busca tu interface DbProduct y añade estas 2 líneas):
// avg_rating: number;
// review_count: number;