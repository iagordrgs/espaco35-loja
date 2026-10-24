import NovoPedidoForm, { type ParOpcao } from "@/components/painel/NovoPedidoForm";
import { getCatalogo } from "@/lib/estoque";
import { exigirUsuario } from "@/lib/supabase/server";
import { ATACADO_MINIMO, isAvailable } from "@/data/products";
import { PRECO_ATACADO } from "@/lib/atacado";

export default async function NovoPedidoPage({ searchParams }: { searchParams: Promise<{ par?: string }> }) {
  const { supabase } = await exigirUsuario();
  const { par } = await searchParams;

  const [catalogo, vendedores] = await Promise.all([
    getCatalogo(),
    supabase.from("pedidos").select("vendedor").not("vendedor", "is", null).order("criado_em", { ascending: false }).limit(200),
  ]);

  const opcoes: ParOpcao[] = catalogo
    .filter(isAvailable)
    .map((p) => ({ slug: p.slug, name: p.name, code: p.code, brand: p.brand, price: p.price ?? 0, atacado: PRECO_ATACADO[p.category], image: p.images[0] }));
  const nomes = [...new Set((vendedores.data ?? []).map((v) => String(v.vendedor)).filter(Boolean))];

  return (
    <div className="painel-pagina">
      <header className="painel-cabecalho">
        <div>
          <h1>Novo pedido</h1>
          <p>Registre a venda fechada no WhatsApp. Os pares escolhidos saem do site na hora.</p>
        </div>
      </header>
      <NovoPedidoForm minimoAtacado={ATACADO_MINIMO} pares={opcoes} vendedores={nomes} inicial={par && opcoes.some((o) => o.slug === par) ? [par] : []} />
    </div>
  );
}
