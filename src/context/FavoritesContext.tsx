"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

const STORAGE_KEY = "espaco35-favorites-v1";

type FavoritesState = { slugs: string[]; hydrated: boolean };
type FavoritesAction =
  | { type: "HYDRATE"; slugs: string[] }
  | { type: "TOGGLE"; slug: string }
  | { type: "CLEAR" };

function reducer(state: FavoritesState, action: FavoritesAction): FavoritesState {
  if (action.type === "HYDRATE") return { slugs: action.slugs, hydrated: true };
  if (action.type === "CLEAR") return { ...state, slugs: [] };
  return {
    ...state,
    slugs: state.slugs.includes(action.slug)
      ? state.slugs.filter((slug) => slug !== action.slug)
      : [...state.slugs, action.slug],
  };
}

function readFavorites(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(saved)
      ? [...new Set(saved.filter((slug): slug is string => typeof slug === "string"))]
      : [];
  } catch {
    return [];
  }
}

type FavoritesContextValue = {
  hydrated: boolean;
  slugs: string[];
  count: number;
  has: (slug: string) => boolean;
  toggle: (slug: string) => void;
  clear: () => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { slugs: [], hydrated: false });

  useEffect(() => {
    dispatch({ type: "HYDRATE", slugs: readFavorites() });
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.slugs));
    } catch {
      // A lista continua funcional durante esta visita mesmo sem persistência.
    }
  }, [state.hydrated, state.slugs]);

  const toggle = useCallback((slug: string) => {
    dispatch({ type: "TOGGLE", slug });
  }, []);

  const clear = useCallback(() => dispatch({ type: "CLEAR" }), []);
  const value = useMemo<FavoritesContextValue>(
    () => ({
      hydrated: state.hydrated,
      slugs: state.slugs,
      count: state.slugs.length,
      has: (slug) => state.slugs.includes(slug),
      toggle,
      clear,
    }),
    [clear, state, toggle]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites deve ser usado dentro de <FavoritesProvider>");
  return context;
}
