import { supabase } from "./supabase";
import type { CartItem } from "../contexts/CartContext";
import type {
  PaymentMethodType,
  DbOrder,
  DbStorePaymentMethod,
} from "../types/database";

// 🆕 v16 FASE 3 - Modo de entrega
export type DeliveryMode = "home_delivery" | "store_pickup";

export interface CheckoutInput {
  storeId: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;

  // 🆕 v16 FASE 3
  delivery_mode: DeliveryMode;

  // Solo si delivery_mode === "home_delivery"
  shipping_address: {
    full_name: string;
    phone: string;
    street: string;
    district: string;
    city: string;
    reference: string | null;
  } | null;

  // 🆕 Solo si delivery_mode === "store_pickup"
  pickup_location_id?: string | null;
  pickup_time_slot?: string | null;

  items: CartItem[];
  total: number;
  payment_method: PaymentMethodType;
  notes: string | null;
}

export async function validatePaymentMethod(
  storeId: string,
  paymentMethod: PaymentMethodType
): Promise<void> {
  const { data, error } = await supabase
    .from("stores")
    .select("id, is_active, payment_methods")
    .eq("id", storeId)
    .maybeSingle();

  if (error) throw new Error("No se pudo validar el método de pago.");
  if (!data) throw new Error("La tienda ya no existe.");
  if (!data.is_active) throw new Error("La tienda ya no está activa.");

  const paymentMethods = (data.payment_methods ?? []) as DbStorePaymentMethod[];
  const enabledMethods = paymentMethods.filter((method) => method.enabled);

  if (enabledMethods.length === 0) {
    throw new Error(
      "Esta tienda no tiene métodos de pago habilitados en su configuración."
    );
  }

  const exists = enabledMethods.some((method) => method.id === paymentMethod);
  if (!exists) {
    throw new Error("El método de pago seleccionado ya no está disponible.");
  }
}

export async function validateStock(items: CartItem[]): Promise<string[]> {
  const errors: string[] = [];

  for (const item of items) {
    let realStock = 0;
    const table =
      item.source === "catalog" && item.catalogProductId
        ? "catalog_products"
        : "products";
    const lookupId =
      item.source === "catalog" && item.catalogProductId
        ? item.catalogProductId
        : item.productId;

    const { data, error } = await supabase
      .from(table)
      .select("stock, is_active")
      .eq("id", lookupId)
      .single();

    if (error || !data || !data.is_active) {
      errors.push(`${item.name}: ya no está disponible`);
      continue;
    }

    realStock = data.stock;

    if (realStock < item.quantity) {
      errors.push(
        realStock === 0
          ? `${item.name}: AGOTADO`
          : `${item.name}: Solo quedan ${realStock} unidades.`
      );
    }
  }

  return errors;
}

// ⚠️ FUNCIÓN discountStock() ELIMINADA
// El descuento de stock ahora lo hace el trigger SQL:
//   → trg_reduce_stock_on_order (AFTER INSERT en orders)

export async function createOrder(input: CheckoutInput): Promise<DbOrder> {
  if (!input.items.length) throw new Error("El carrito está vacío.");
  if (!input.customer_name.trim())
    throw new Error("Ingresa tu nombre completo.");
  if (!input.customer_phone.trim()) throw new Error("Ingresa tu celular.");

  // 🆕 v16 FASE 3 - Validar según modo de entrega
  if (input.delivery_mode === "home_delivery") {
    if (!input.shipping_address) {
      throw new Error("Falta la dirección de entrega.");
    }
    if (!input.shipping_address.street?.trim()) {
      throw new Error("Ingresa tu dirección.");
    }
  } else if (input.delivery_mode === "store_pickup") {
    if (!input.pickup_location_id) {
      throw new Error("Selecciona un punto de recojo.");
    }
    if (!input.pickup_time_slot) {
      throw new Error("Selecciona una franja horaria para recoger.");
    }
  }

  await validatePaymentMethod(input.storeId, input.payment_method);
  const errors = await validateStock(input.items);
  if (errors.length > 0) throw new Error(errors.join("\n"));

  const orderItems = input.items.map((item) => ({
    product_id: item.productId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    image: (item as any).image ?? "",
    source: item.source,
    subtotal: item.price * item.quantity,
  }));

  const has_catalog_items = input.items.some(
    (item) => item.source === "catalog"
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("orders")
    .insert({
      store_id: input.storeId,
      customer_id: user?.id ?? null,
      customer_name: input.customer_name,
      customer_email: input.customer_email,
      customer_phone: input.customer_phone,

      // Dirección solo si es home_delivery
      shipping_address:
        input.delivery_mode === "home_delivery"
          ? input.shipping_address
          : null,

      // 🆕 v16 FASE 3
      delivery_mode: input.delivery_mode,
      pickup_location_id: input.pickup_location_id ?? null,
      pickup_time_slot: input.pickup_time_slot ?? null,

      items: orderItems,
      subtotal: input.total,
      total: input.total,
      payment_method: input.payment_method,
      status: "pending_payment",
      notes: input.notes,
      has_catalog_items,
    })
    .select()
    .single();

  if (error)
    throw new Error("Error en el motor de base de datos: " + error.message);

  return data as DbOrder;
}