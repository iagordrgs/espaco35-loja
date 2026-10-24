import EstoqueTabela, { type LinhaTabela } from "@/components/painel/EstoqueTabela";
import { products } from "@/data/products";
import { agoraMs, type LinhaEstoque } from "@/lib/painel";
import { exigirUsuario } from "@/lib/supabase/server";

export default async function EstoquePage() {
  const { supabase } = await exigirUsuario();
  const { data, error } = await supabase.from("estoque").select("slug,status,reservado_ate,pedido_id");
  if (error) throw new Error(error.message);

  const porSlug = new Map((data as LinhaEstoque[]).map((linha) => [linha.slug, linha]));
  const agora = agoraMs();
  const linhas: LinhaTabela[] = products.map((p) => {
    const e = porSlug.get(p.slug);
    const vencida = e?.status === "reservado" && !e.pedido_id && e.reservado_ate && new Date(e.reservado_ate).getTime() < agora;
    const status = p.soldOut ? "vendido" : !e || vencida ? "disponivel" : e.status;
    return {
      slug: p.slug,
      code: p.code,
      name: p.name,
      category: p.category,
      brand: p.brand,
      price: p.price,
      image: p.images[0],
      status,
      reservadoAte: status === "reservado" ? e?.reservado_ate ?? null : null,
      pedidoId: status !== "disponivel" ? e?.pedido_id ?? null : null,
      fixoNoCatalogo: Boolean(p.soldOut),
    };
  });

  const conta = (s: string) => linhas.filter((l) => l.status === s).length;

  return (
    <div className="painel-pagina">
      <header className="painel-cabecalho">
        <div>
          <h1>Estoque</h1>
          <p>Cada modelo é um par único. Mude aqui e o site atualiza na hora.</p>
        </div>
        <div className="painel-contadores">
          <span><strong>{conta("disponivel")}</strong> disponíveis</span>
          <span><strong>{conta("reservado")}</strong> reservados</span>
          <span><strong>{conta("vendido")}</strong> vendidos</span>
        </div>
      </header>
      <EstoqueTabela linhas={linhas} />
    </div>
  );
}
