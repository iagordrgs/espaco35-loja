import Link from "next/link";
import { sair } from "@/app/painel/actions";
import PainelNav from "@/components/painel/PainelNav";
import { exigirUsuario } from "@/lib/supabase/server";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const { usuario } = await exigirUsuario();

  return (
    <div className="painel">
      <aside className="painel-lateral">
        <Link href="/painel" className="painel-marca"><span className="brand-mark">35</span><span>Painel</span></Link>
        <PainelNav />
        <div className="painel-usuario">
          <span>{usuario.email}</span>
          <form action={sair}><button type="submit">Sair</button></form>
          <Link href="/" target="_blank">Ver o site ↗</Link>
        </div>
      </aside>
      <div className="painel-conteudo">{children}</div>
    </div>
  );
}
