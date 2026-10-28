"use client";

import { useState } from "react";

// Mostra o link de pagamento com um botão de copiar (a equipe cola no WhatsApp ou no direct).
export default function CopiarLink({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // sem permissão de área de transferência: o campo abaixo continua selecionável
    }
  }
  return (
    <div className="painel-rastreio">
      <label>Link de pagamento (Pix ou cartão)
        <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
      </label>
      <button type="button" className="painel-botao" onClick={copiar}>{copiado ? "Copiado!" : "Copiar"}</button>
    </div>
  );
}
