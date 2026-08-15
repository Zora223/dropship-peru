// src/contexts/CartContext.tsx
// 🛒 v22.20 - Soporte talla y color en carrito

import { createContext, useState, useContext, useMemo, useEffect } from "react";
import type { ReactNode } from "react";
import type { ProductSource } from "../types/database";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  storeId: string;
  storeSlug: string;
  storeName: string;
  source: ProductSource;
  catalogProductId: string | null;
  image: string | null;
  selectedColor?: string | null; // 🆕 v22.20
  selectedSize?: string | null;  // 🆕 v22.20
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string, color?: string | null, size?: string | null) => void;
  updateQuantity: (productId: string, quantity: number, color?: string | null, size?: string | null) => void;
  clearCart: () => void;
  total: number;
  count: number;
  storeId: string | null;
  storeSlug: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const CART_STORAGE_KEY = "dropship-peru-cart-v2"; // 🆕 v2 para invalidar cache viejo

function loadCartFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.productId === "string" &&
        typeof item.storeId === "string" &&
        typeof item.price === "number" &&
        typeof item.quantity === "number"
    );
  } catch (err) {
    console.warn("Error leyendo carrito de localStorage:", err);
    return [];
  }
}

function saveCartToStorage(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn("Error guardando carrito en localStorage:", err);
  }
}

/**
 * Genera una clave única por producto + color + talla
 * Permite tener el mismo producto con distintas tallas/colores en el carrito
 */
function getItemKey(item: Pick<CartItem, "productId" | "selectedColor" | "selectedSize">): string {
  return `${item.productId}|${item.selectedColor ?? ""}|${item.selectedSize ?? ""}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadCartFromStorage());

  useEffect(() => {
    saveCartToStorage(items);
  }, [items]);

  const addItem = (item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      if (prev.length > 0 && prev[0].storeId !== item.storeId) {
        const confirmChange = confirm(
          "Tu carrito tiene productos de otra tienda. ¿Quieres vaciarlo y agregar este producto?"
        );
        if (!confirmChange) return prev;
        return [{ ...item, quantity: 1 }];
      }

      // Buscar por productId + color + talla
      const newKey = getItemKey(item);
      const existing = prev.find((i) => getItemKey(i) === newKey);

      if (existing) {
        return prev.map((i) =>
          getItemKey(i) === newKey ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (productId: string, color?: string | null, size?: string | null) => {
    const targetKey = getItemKey({ productId, selectedColor: color, selectedSize: size });
    setItems((prev) => prev.filter((i) => getItemKey(i) !== targetKey));
  };

  const updateQuantity = (
    productId: string,
    quantity: number,
    color?: string | null,
    size?: string | null
  ) => {
    if (quantity < 1) {
      removeItem(productId, color, size);
      return;
    }
    const targetKey = getItemKey({ productId, selectedColor: color, selectedSize: size });
    setItems((prev) =>
      prev.map((i) => (getItemKey(i) === targetKey ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  };

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );
  const count = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const storeId = items[0]?.storeId ?? null;
  const storeSlug = items[0]?.storeSlug ?? null;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total,
        count,
        storeId,
        storeSlug,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}