import { createContext, useState, useContext, useMemo } from "react";
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
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
  storeId: string | null;
  storeSlug: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      // Si el carrito tiene productos de OTRA tienda, lo vaciamos
      if (prev.length > 0 && prev[0].storeId !== item.storeId) {
        const confirmChange = confirm(
          "Tu carrito tiene productos de otra tienda. ¿Quieres vaciarlo y agregar este producto?"
        );
        if (!confirmChange) return prev;
        return [{ ...item, quantity: 1 }];
      }

      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => setItems([]);

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