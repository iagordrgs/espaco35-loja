import type { Metadata } from "next";
import { supabaseConfigurado } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Painel",
  robots: { index: false, follow: false },
};

export default function PainelRaiz({ children }: { children: React.ReactNode }) {
  if (!supabaseConfigurado) {
    return (
      <div className="painel-vazio">
        <div className="painel-vazio-card">
          <span className="brand-mark">35</span>
          <h1>Painel ainda não conectado</h1>
          <p>Falta ligar o painel ao banco de dados (Supabase). O passo a passo está em <code>supabase/LEIA-ME.md</code>, na pasta do projeto.</p>
          <ol>
            <li>Criar o projeto grátis no Supabase.</li>
            <li>Rodar o arquivo <code>supabase/schema.sql</code> no SQL Editor.</li>
            <li>Colocar o endereço e a chave em <code>.env.local</code> e na Vercel.</li>
            <li>Criar seu usuário em Authentication &gt; Users.</li>
          </ol>
        </div>
      </div>
    );
  }
  return children;
}
