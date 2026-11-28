"use client";

import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "charmchase-cart";

type CartContextValue = {
  items: string[]; // product slugs
  addItem: (slug: string) => void;
  removeItem: (slug: string) => void;
  clear: () => void;
  isInCart: (slug: string) => boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage once, on mount (client-only).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // Corrupt or inaccessible storage — just start with an empty cart.
    }
    setLoaded(true);
  }, []);

  // Persist on every change, but only after the initial load has happened
  // (otherwise we'd overwrite existing storage with an empty array first).
  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage full or unavailable — cart just won't persist across visits.
    }
  }, [items, loaded]);

  function addItem(slug: string) {
    setItems((prev) => (prev.includes(slug) ? prev : [...prev, slug]));
  }
  function removeItem(slug: string) {
    setItems((prev) => prev.filter((s) => s !== slug));
  }
  function clear() {
    setItems([]);
  }
  function isInCart(slug: string) {
    return items.includes(slug);
  }

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clear, isInCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
