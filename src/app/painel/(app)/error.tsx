"use client";

export default function ErroPainel({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="painel-pagina">
      <h1>Algo não deu certo</h1>
      <p className="painel-erro" role="alert">{error.message || "Erro inesperado."}</p>
      <button type="button" className="button button-dark" onClick={reset}>Tentar de novo</button>
    </div>
  );
}
