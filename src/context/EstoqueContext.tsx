"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { MapaEstoque } from "@/lib/estoque-regras";

const EstoqueContext = createContext<MapaEstoque>({});

// Leva para o navegador a situação dos pares (vendido/reservado) que o servidor leu do painel.
export function EstoqueProvider({ estoque, children }: { estoque: MapaEstoque; children: ReactNode }) {
  return <EstoqueContext.Provider value={estoque}>{children}</EstoqueContext.Provider>;
}

export function useEstoque(): MapaEstoque {
  return useContext(EstoqueContext);
}
