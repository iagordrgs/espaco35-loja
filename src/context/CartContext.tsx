"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { getProduct, isAvailable, type Product } from "@/data/products";

/*
 * Cada modelo é UM par (único, tamanho 35). Então o carrinho guarda só QUAIS pares a cliente escolheu
 * (o slug de cada um). Nome, foto, preço e se o par ainda está à venda vêm sempre do catálogo de agora:
 * o preço mudou ou o par foi vendido -> o carrinho já reflete isso, sem valor velho guardado no celular.
 */

const STORAGE_KEY = "espaco35-cart-v2";
const CHAVE_ANTIGA = "espaco35-cart"; // versão anterior: lista de itens com preço e quantidade

export type ParIndisponivel = { slug: string; name: string | null };

type CartState = { slugs: string[]; hydrated: boolean };

type CartAction =
  | { type: "HYDRATE"; slugs: string[] }
  | { type: "ADD"; slug: string }
  | { type: "REMOVE"; slug: string }
  | { type: "REMOVE_MANY"; slugs: string[] }
  | { type: "CLEAR" };

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "HYDRATE":
      return { slugs: action.slugs, hydrated: true };
    case "ADD":
      // par único: adicionar de novo não faz nada
      return state.slugs.includes(action.slug)
        ? state
        : { ...state, slugs: [...state.slugs, action.slug] };
    case "REMOVE":
      return { ...state, slugs: state.slugs.filter((s) => s !== action.slug) };
    case "REMOVE_MANY":
      return {
        ...state,
        slugs: state.slugs.filter((s) => !action.slugs.includes(s)),
      };
    case "CLEAR":
      return { ...state, slugs: [] };
    default:
      return state;
  }
}

// Lê o carrinho do celular. Aceita também o formato da versão anterior (itens com slug, preço e quantidade):
// só o slug é aproveitado, e a quantidade vira sempre 1.
function lerSlugs(): string[] {
  const unicos = new Set<string>();
  const juntar = (bruto: string | null) => {
    if (!bruto) return;
    try {
      const lista: unknown = JSON.parse(bruto);
      if (!Array.isArray(lista)) return;
      for (const item of lista) {
        const slug =
          typeof item === "string" ? item : (item as { slug?: unknown } | null)?.slug;
        if (typeof slug === "string" && slug) unicos.add(slug);
      }
    } catch {
      // dado corrompido: ignora
    }
  };
  try {
    juntar(localStorage.getItem(STORAGE_KEY));
    juntar(localStorage.getItem(CHAVE_ANTIGA));
    localStorage.removeItem(CHAVE_ANTIGA);
  } catch {
    // storage indisponível — segue com o carrinho vazio
  }
  return [...unicos];
}

type CartContextValue = {
  /** o carrinho já foi lido do celular (antes disso, não dá para dizer que está vazio) */
  hydrated: boolean;
  /** pares do carrinho que ainda estão à venda, na ordem em que foram escolhidos */
  products: Product[];
  /** pares que estavam no carrinho e já foram vendidos ou saíram do site */
  unavailable: ParIndisponivel[];
  has: (slug: string) => boolean;
  add: (slug: string) => void;
  remove: (slug: string) => void;
  removeUnavailable: () => void;
  clear: () => void;
  totalItems: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { slugs: [], hydrated: false });

  // Lê do celular quando a página abre.
  useEffect(() => {
    dispatch({ type: "HYDRATE", slugs: lerSlugs() });
  }, []);

  // Guarda a cada mudança (só depois de ler, para não apagar o carrinho que estava salvo).
  useEffect(() => {
    if (!state.hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.slugs));
    } catch {
      // storage indisponível — segue sem persistir
    }
  }, [state.slugs, state.hydrated]);

  const value = useMemo<CartContextValue>(() => {
    const products: Product[] = [];
    const unavailable: ParIndisponivel[] = [];
    for (const slug of state.slugs) {
      const produto = getProduct(slug);
      if (produto && isAvailable(produto)) products.push(produto);
      else unavailable.push({ slug, name: produto?.name ?? null });
    }
    return {
      hydrated: state.hydrated,
      products,
      unavailable,
      has: (slug) => state.slugs.includes(slug),
      add: (slug) => dispatch({ type: "ADD", slug }),
      remove: (slug) => dispatch({ type: "REMOVE", slug }),
      removeUnavailable: () =>
        dispatch({ type: "REMOVE_MANY", slugs: unavailable.map((u) => u.slug) }),
      clear: () => dispatch({ type: "CLEAR" }),
      totalItems: products.length,
      totalPrice: products.reduce((soma, p) => soma + (p.price ?? 0), 0),
    };
  }, [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de <CartProvider>");
  return ctx;
}
