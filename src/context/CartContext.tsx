"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { getProduct, isAvailable, type Product } from "@/data/products";
import { useEstoque } from "@/context/EstoqueContext";
import { aplicarEstoque } from "@/lib/estoque-regras";

/*
 * Cada modelo é UM par (único, tamanho 35). Então o carrinho guarda só QUAIS pares a cliente escolheu
 * (o slug de cada um). Nome, foto, preço e se o par ainda está à venda vêm sempre do catálogo de agora:
 * o preço mudou ou o par foi vendido -> o carrinho já reflete isso, sem valor velho guardado no celular.
 */

const STORAGE_KEY = "espaco35-cart-v2";
const CHAVE_ANTIGA = "espaco35-cart"; // versão anterior: lista de itens com preço e quantidade
const CHAVE_RESERVA = "espaco35-minha-reserva";

// Pedido que esta cliente abriu no pagamento online. Os pares dele ficam "reservados" no banco, mas para ela
// continuam na sacola: se voltar do Mercado Pago sem pagar, consegue tentar de novo (o pedido antigo é trocado).
export type MinhaReserva = { codigo: string; slugs: string[]; ate: number };

function lerReserva(): MinhaReserva | null {
  try {
    const r = JSON.parse(localStorage.getItem(CHAVE_RESERVA) ?? "null") as MinhaReserva | null;
    if (r && typeof r.codigo === "string" && Array.isArray(r.slugs) && r.ate > Date.now()) return r;
    localStorage.removeItem(CHAVE_RESERVA);
  } catch {
    // storage indisponível ou dado corrompido
  }
  return null;
}

export type ParIndisponivel = { slug: string; name: string | null };

type CartState = { slugs: string[]; hydrated: boolean; reserva: MinhaReserva | null };

type CartAction =
  | { type: "HYDRATE"; slugs: string[]; reserva: MinhaReserva | null }
  | { type: "RESERVA"; reserva: MinhaReserva | null }
  | { type: "ADD"; slug: string }
  | { type: "REMOVE"; slug: string }
  | { type: "REMOVE_MANY"; slugs: string[] }
  | { type: "CLEAR" };

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "HYDRATE":
      return { slugs: action.slugs, hydrated: true, reserva: action.reserva };
    case "RESERVA":
      return { ...state, reserva: action.reserva };
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
      return { ...state, slugs: [], reserva: null };
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
  /** último par adicionado (abre o aviso com o atalho para finalizar) */
  ultimoAdicionado: Product | null;
  fecharAviso: () => void;
  /** pedido aguardando pagamento aberto por esta cliente */
  reserva: MinhaReserva | null;
  guardarReserva: (reserva: MinhaReserva) => void;
  totalItems: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { slugs: [], hydrated: false, reserva: null });
  const [ultimoSlug, setUltimoSlug] = useState<string | null>(null);

  // Lê do celular quando a página abre.
  useEffect(() => {
    dispatch({ type: "HYDRATE", slugs: lerSlugs(), reserva: lerReserva() });
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

  const estoque = useEstoque();

  const value = useMemo<CartContextValue>(() => {
    const products: Product[] = [];
    const unavailable: ParIndisponivel[] = [];
    for (const slug of state.slugs) {
      const base = getProduct(slug);
      // situação do painel: par reservado ou vendido para outra cliente sai do total
      let produto = base && aplicarEstoque(base, estoque);
      // reservado pelo pedido desta própria cliente: continua na sacola dela
      if (produto?.reserved && state.reserva?.slugs.includes(slug)) produto = { ...produto, reserved: false };
      if (produto && isAvailable(produto)) products.push(produto);
      else unavailable.push({ slug, name: produto?.name ?? null });
    }
    return {
      hydrated: state.hydrated,
      products,
      unavailable,
      has: (slug) => state.slugs.includes(slug),
      add: (slug) => {
        dispatch({ type: "ADD", slug });
        setUltimoSlug(slug);
      },
      remove: (slug) => dispatch({ type: "REMOVE", slug }),
      removeUnavailable: () =>
        dispatch({ type: "REMOVE_MANY", slugs: unavailable.map((u) => u.slug) }),
      clear: () => {
        dispatch({ type: "CLEAR" });
        try {
          localStorage.removeItem(CHAVE_RESERVA);
        } catch {
          // storage indisponível
        }
      },
      ultimoAdicionado: (ultimoSlug && products.find((p) => p.slug === ultimoSlug)) || null,
      fecharAviso: () => setUltimoSlug(null),
      reserva: state.reserva,
      guardarReserva: (nova) => {
        dispatch({ type: "RESERVA", reserva: nova });
        try {
          localStorage.setItem(CHAVE_RESERVA, JSON.stringify(nova));
        } catch {
          // storage indisponível — segue só na memória
        }
      },
      totalItems: products.length,
      totalPrice: products.reduce((soma, p) => soma + (p.price ?? 0), 0),
    };
  }, [state, estoque, ultimoSlug]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de <CartProvider>");
  return ctx;
}
