import { create } from 'zustand';
import type { Product } from '../api/types';

interface CartState {
  items: Product[];
  add: (product: Product) => void;
  remove: (id: string) => void;
}

/** Marketplace cart store. Select `items` and derive count/total/has at the
 *  call site (selectors must not return freshly-built objects). */
export const useCartStore = create<CartState>((set) => ({
  items: [],
  add: (product) =>
    set((s) => (s.items.some((p) => p.id === product.id) ? s : { items: [...s.items, product] })),
  remove: (id) => set((s) => ({ items: s.items.filter((p) => p.id !== id) })),
}));
