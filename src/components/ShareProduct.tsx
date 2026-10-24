"use client";

import { useState } from "react";

export default function ShareProduct({ productName }: { productName: string }) {
  const [message, setMessage] = useState("");

  async function share() {
    const data = { title: productName, text: `Olha este par da Espaço 35: ${productName}`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(data.url);
        setMessage("Link copiado para compartilhar.");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") setMessage("Não foi possível compartilhar agora.");
    }
  }

  return (
    <div className="share-row">
      <button type="button" className="share-button" onClick={share}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M5 13v6h14v-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Compartilhar este par
      </button>
      <span className="screen-reader-only" role="status" aria-live="polite">{message}</span>
    </div>
  );
}
