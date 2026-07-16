export type UserRole = "admin" | "vendor" | "customer" | "delivery" | "supplier";

export type PaymentMethod = "yape" | "plin" | "card" | "transfer" | "cash_on_delivery";

export type OrderStatus = "pending_payment" | "paid" | "shipped" | "delivered" | "cancelled";

export type ProductSource = "catalog" | "own";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  tenant_id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_email: string;
  contact_phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CatalogProduct {
  id: string;
  supplier_id: string;
  supplier_name: string;
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

export interface Product {
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
  images: string[];
  is_active: boolean;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  store_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  items: OrderItem[];
  total: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
}