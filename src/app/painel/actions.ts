"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getProduct } from "@/data/products";
import { TAG_ESTOQUE } from "@/lib/estoque";
import { exigirUsuario, supabaseServidor } from "@/lib/supabase/server";
import { STATUS_PEDIDO, type StatusPedido } from "@/lib/painel";

export type EstadoForm = { erro?: string };

const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();
const dinheiro = (form: FormData, campo: string) => {
  const valor = Number(texto(form, campo).replace(/\./g, "").replace(",", ".") || 0);
  return Number.isFinite(valor) && valor >= 0 ? Math.round(valor * 100) / 100 : 0;
};

// O site e o painel passam a mostrar a situação nova na próxima visita.
function atualizarTelas() {
  updateTag(TAG_ESTOQUE);
  revalidatePath("/painel", "layout");
}

export async function entrar(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: texto(form, "email"),
    password: String(form.get("senha") ?? ""),
  });
  if (error) return { erro: "E-mail ou senha incorretos." };
  redirect("/painel");
}

export async function sair() {
  const supabase = await supabaseServidor();
  await supabase.auth.signOut();
  redirect("/painel/login");
}

export async function definirEstoque(form: FormData) {
  const { supabase } = await exigirUsuario();
  const slug = texto(form, "slug");
  const status = texto(form, "status");
  const horas = Number(texto(form, "horas")) || null;
  if (!getProduct(slug)) return;
  const { error } = await supabase.rpc("definir_estoque", { par: slug, novo_status: status, horas });
  if (error) throw new Error(error.message);
  atualizarTelas();
}

export async function criarPedido(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { supabase } = await exigirUsuario();

  const slugs = [...new Set(form.getAll("pares").map(String))];
  const pares = slugs.map((slug) => getProduct(slug)).filter((p) => p !== undefined);
  if (pares.length === 0) return { erro: "Escolha pelo menos um par." };
  const cliente = texto(form, "cliente_nome");
  if (!cliente) return { erro: "Informe o nome da cliente." };

  // preço sempre do catálogo, nunca do formulário
  const itens = pares.map((p) => ({ slug: p.slug, nome: p.name, codigo: p.code, categoria: p.category, preco: p.price ?? 0 }));
  const subtotal = itens.reduce((soma, item) => soma + item.preco, 0);
  const desconto = Math.min(dinheiro(form, "desconto"), subtotal);
  const frete = dinheiro(form, "frete");
  const status = texto(form, "status") === "pago" ? "pago" : "novo";

  const { data, error } = await supabase.rpc("criar_pedido", {
    dados: {
      status,
      cliente_nome: cliente,
      cliente_telefone: texto(form, "cliente_telefone"),
      cliente_cidade: texto(form, "cliente_cidade"),
      itens,
      subtotal,
      desconto,
      frete,
      total: Math.round((subtotal - desconto + frete) * 100) / 100,
      pagamento: texto(form, "pagamento"),
      entrega: texto(form, "entrega"),
      vendedor: texto(form, "vendedor"),
      observacoes: texto(form, "observacoes"),
    },
  });
  if (error) {
    return { erro: error.message.startsWith("Par indisponível") ? `${error.message}. Atualize a página: alguém já pegou esse par.` : error.message };
  }
  atualizarTelas();
  redirect(`/painel/pedidos/${data}`);
}

export async function atualizarPedido(form: FormData) {
  const { supabase } = await exigirUsuario();
  const id = Number(texto(form, "id"));
  const status = texto(form, "status") as StatusPedido;
  if (!id || !STATUS_PEDIDO.includes(status)) return;
  const { error } = await supabase.rpc("atualizar_pedido", { pedido: id, novo_status: status });
  if (error) throw new Error(error.message);
  atualizarTelas();
}
