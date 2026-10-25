"use client";

import { startTransition, use, useActionState, type FormEvent } from "react";
import { entrar, sair, type EstadoForm } from "@/app/painel/actions";

export default function LoginPage({ searchParams }: { searchParams: Promise<{ acesso?: string }> }) {
  const negado = use(searchParams).acesso === "negado";
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(entrar, negado ? { erro: "Este usuário não tem acesso ao painel. Entre com uma conta da equipe." } : {});
  // envio manual: com action={...} o React limpa os campos depois de um erro
  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    startTransition(() => acao(dados));
  };

  return (
    <div className="painel-vazio">
      <form onSubmit={enviar} className="painel-vazio-card painel-login">
        <span className="brand-mark">35</span>
        <h1>Painel Espaço 35</h1>
        <p>Entre com o e-mail e a senha criados no Supabase.</p>
        <label>E-mail<input name="email" type="email" autoComplete="username" required /></label>
        <label>Senha<input name="senha" type="password" autoComplete="current-password" required /></label>
        {estado.erro && <p className="painel-erro" role="alert">{estado.erro}</p>}
        <button type="submit" className="button button-dark" disabled={enviando}>{enviando ? "Entrando..." : "Entrar"}</button>
        {negado && <button type="button" className="painel-botao" onClick={() => startTransition(() => sair())}>Sair da conta atual</button>}
      </form>
    </div>
  );
}
