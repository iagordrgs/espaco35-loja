"use client";

import { useEffect } from "react";

// Avisa ao script de segurança do layout que o site carregou de verdade (ver SCRIPT_SEGURANCA no layout).
export default function MarcaHidratacao() {
  useEffect(() => {
    document.documentElement.setAttribute("data-hidratado", "1");
  }, []);
  return null;
}
