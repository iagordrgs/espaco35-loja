import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath, revalidateTag } from "next/cache";
import { avisarEquipe, emailConfigurado, escapar } from "@/lib/email";
import { TAG_ESTOQUE } from "@/lib/estoque";
import { buscarPagamentosAlterados, cancelarPagamento, type Pagamento } from "@/lib/mercadopago";
import { reais, type ItemPedido } from "@/lib/painel";
import { SITE_URL } from "@/lib/site";

// Regra única do pagamento: o que acontece com o pedido quando o Mercado Pago diz a situação de um pagamento.
// Três caminhos chegam aqui, sempre com o pagamento consultado na API (nunca o que vem no endereço ou no corpo):
//   aviso        webhook do Mercado Pago (src/app/api/mercadopago/webhook)
//   retorno      a cliente voltando do Mercado Pago para o site (src/app/api/mercadopago/retorno)
//   conferencia  conferência diária da Vercel Cron (src/app/api/cron/conferir-pagamentos)
// Se o aviso falhar (assinatura errada, banco fora do ar), a volta da cliente ou a conferência registram o pagamento.
// Chamar só de Route Handler: revalida o cache do estoque e do painel.

// Pix gerado ou cartão em análise: é agora que os pares ficam reservados para a cliente (até o pedido vencer).
const PENDENTES = ["pending", "in_process", "authorized"];
// Antes de pagar: cancela o pedido e devolve os pares. Depois de pago: marca "NÃO ENVIAR" e avisa a equipe.
const RECUSADOS = ["rejected", "cancelled"];
const ESTORNOS = ["refunded", "charged_back", "in_mediation"];
export const PAGOS = ["pago", "enviado", "entregue"];

const JANELA_DIAS = 4; // a conferência roda 1 vez por dia e olha os pagamentos que mudaram nos últimos 4 dias
const MAX_PAGAMENTOS = 1000; // teto por rodada; passou disso, o resumo avisa que ficou incompleta
const AVISO_ESPERA_MIN = 10; // aviso pendente mais novo que isso pode estar saindo agora pelo próprio aviso
const AVISO_DIAS = 7; // depois disso a conferência para de reenviar o e-mail (o painel continua mostrando)

export type Origem = "aviso" | "retorno" | "conferencia";
type Aviso = "pago" | "conferir" | "estorno";
type PedidoResumo = { id: number; status: string; pagamento_id: string | null; pagamento_status: string | null };
export type ResumoConferencia = {
  pagamentos: number;
  acertados: string[];
  suspeitas: string[];
  avisosReenviados: number;
  erros: string[];
  incompleta: boolean;
};

// Erro do Supabase numa etapa do pagamento. Conexão, tempo esgotado ou função faltando: vale tentar de novo (o aviso
// responde 500 e o Mercado Pago repete). RAISE das funções do schema.sql (código P0001, ex.: pedido que não existe):
// tentar de novo não muda nada.
export class ErroBanco extends Error {
  readonly definitivo: boolean;
  constructor(etapa: string, erro: { message: string; code?: string }) {
    super(`${etapa}: ${erro.message}`);
    this.name = "ErroBanco";
    this.definitivo = erro.code === "P0001";
  }
}

// Linha nos logs da Vercel, só com números de pedido e de pagamento: nada de dado de cliente.
export function registrar(nivel: "erro" | "aviso" | "info", mensagem: string, dados: Record<string, unknown> = {}) {
  const linha = `[pagamentos] ${mensagem} ${JSON.stringify(dados)}`;
  if (nivel === "erro") console.error(linha);
  else if (nivel === "aviso") console.warn(linha);
  else console.info(linha);
}

export const mensagemDe = (erro: unknown) =>
  erro instanceof Error ? erro.message : erro && typeof erro === "object" && "message" in erro ? String(erro.message) : String(erro);

async function rpc(admin: SupabaseClient, funcao: string, args: Record<string, unknown>) {
  const { data, error } = await admin.rpc(funcao, args);
  if (error) throw new ErroBanco(funcao, error);
  return data as string | null;
}

// Aplica a situação de um pagamento ao pedido dele (external_reference = número do pedido). Lança ErroBanco se o
// banco falhar, para quem chamou poder tentar de novo. Devolve o que aconteceu, para os logs e a conferência.
export async function processarPagamento(admin: SupabaseClient, pagamento: Pagamento, origem: Origem): Promise<string> {
  const idPedido = Number(pagamento.external_reference);
  if (!Number.isSafeInteger(idPedido) || idPedido <= 0) return "sem_pedido";
  const idPagamento = String(pagamento.id);
  let resultado: string;

  if (pagamento.status === "approved") {
    // o banco confere se o valor cobre o total do pedido; moeda diferente de real conta como valor inválido
    const valor = pagamento.currency_id === "BRL" ? Number(pagamento.transaction_amount) : null;
    resultado = (await rpc(admin, "confirmar_pagamento", { pedido: idPedido, id_pagamento: idPagamento, valor })) ?? "";
    if (resultado === "ok" || resultado === "conflito") await enviarAviso(admin, idPedido, resultado === "ok" ? "pago" : "conferir");
  } else if (PENDENTES.includes(pagamento.status)) {
    resultado = (await rpc(admin, "reservar_pedido", { pedido: idPedido })) ?? "";
    if (resultado === "indisponivel") {
      // outra cliente gerou o Pix (ou pagou) antes: cancela este pagamento no Mercado Pago e o pedido
      await cancelarPagamento(idPagamento).catch((erro) =>
        registrar("aviso", "não cancelou o pagamento no Mercado Pago", { pedido: idPedido, pagamento: idPagamento, erro: mensagemDe(erro) }),
      );
      await rpc(admin, "cancelar_pedido_site", { pedido: idPedido, situacao: "par_indisponivel" });
    } else {
      await anotarSituacao(admin, idPedido, pagamento);
    }
  } else if (RECUSADOS.includes(pagamento.status)) {
    await rpc(admin, "cancelar_pedido_site", { pedido: idPedido, situacao: pagamento.status });
    resultado = "cancelado";
  } else if (ESTORNOS.includes(pagamento.status)) {
    const antes = await registrarEstorno(admin, idPedido, pagamento.status, idPagamento);
    if (antes === "outro_pagamento") {
      // estorno do pagamento extra de quem pagou duas vezes: o pedido continua valendo
      resultado = "estorno_de_outro_pagamento";
    } else if (antes) {
      await enviarAviso(admin, idPedido, "estorno", pagamento.status);
      resultado = "estorno_registrado";
    } else {
      if (pagamento.status !== "in_mediation") await rpc(admin, "cancelar_pedido_site", { pedido: idPedido, situacao: pagamento.status });
      resultado = "estorno_sem_pedido_pago";
    }
  } else {
    await anotarSituacao(admin, idPedido, pagamento);
    resultado = "anotado";
  }

  revalidateTag(TAG_ESTOQUE, { expire: 0 }); // expira já: o par vendido não pode aparecer nem uma vez a mais
  revalidatePath("/painel", "layout");
  registrar("info", "pagamento processado", { origem, pedido: idPedido, pagamento: idPagamento, situacao: pagamento.status, resultado });
  return resultado;
}

// O banco confere se o estorno é do pagamento que o pedido registrou. Banco ainda sem o schema.sql novo (função sem o
// id do pagamento, erro PGRST202 do PostgREST): confere aqui e chama a função antiga.
async function registrarEstorno(admin: SupabaseClient, idPedido: number, situacao: string, idPagamento: string) {
  const { data, error } = await admin.rpc("registrar_estorno", { pedido: idPedido, situacao, id_pagamento: idPagamento });
  if (!error) return data as string | null;
  if (error.code !== "PGRST202") throw new ErroBanco("registrar_estorno", error);
  const { data: p, error: erroLer } = await admin.from("pedidos").select("pagamento_id,pagamento_status").eq("id", idPedido).maybeSingle();
  if (erroLer) throw new ErroBanco("ler o pedido do estorno", erroLer);
  // mesma regra do banco novo: só é "outro" se o pedido tem outro pagamento aprovado registrado
  if (p?.pagamento_id && p.pagamento_id !== idPagamento && ["approved", "valor_divergente"].includes(p.pagamento_status ?? "")) return "outro_pagamento";
  return rpc(admin, "registrar_estorno", { pedido: idPedido, situacao });
}

// Pedido ainda aguardando: guarda a situação do pagamento (Pix gerado, cartão em análise...).
async function anotarSituacao(admin: SupabaseClient, idPedido: number, pagamento: Pagamento) {
  const { error } = await admin
    .from("pedidos")
    .update({ pagamento_status: pagamento.status, pagamento_id: String(pagamento.id) })
    .eq("id", idPedido)
    .eq("status", "novo");
  if (error) throw new ErroBanco("anotar situação do pagamento", error);
}

// E-mail para a equipe. Nunca lança: o pedido já mudou no banco e aparece no painel. Com o schema.sql atualizado,
// o banco marca o aviso em aviso_pendente junto com a mudança do pedido; ele só sai da marca quando o e-mail sai,
// e a conferência diária reenvia o que ficou marcado.
async function enviarAviso(admin: SupabaseClient, idPedido: number, tipo: Aviso, situacao?: string): Promise<boolean> {
  try {
    const { data: p, error } = await admin.from("pedidos").select("*").eq("id", idPedido).single();
    if (error) throw new ErroBanco("ler o pedido para o aviso", error);
    const temMarca = "aviso_pendente" in p; // banco com o schema.sql novo
    if (!emailConfigurado()) {
      // e-mail desligado (o passo 4 do ATIVAR-PAGAMENTO é opcional): o pedido fica só no painel, sem marca pendente
      if (temMarca) await limparMarca(admin, idPedido, tipo);
      return false;
    }
    const estorno = situacao ?? p.pagamento_status;
    const e = p.endereco ?? {};
    const itens = (p.itens as ItemPedido[]).map((i) => `<li>${escapar(i.nome)} (${escapar(i.codigo)}) · ${reais(i.preco)}</li>`).join("");
    const assunto = {
      pago: `Novo pedido pago #${p.id} · ${p.cliente_nome} · ${reais(p.total)}`,
      conferir: `⚠️ CONFERIR pedido #${p.id} antes de enviar · ${p.cliente_nome}`,
      estorno: `⛔ NÃO ENVIAR pedido #${p.id}: pagamento ${estorno} no Mercado Pago`,
    }[tipo];
    const alerta = {
      pago: "",
      conferir: `<p><strong>Atenção:</strong> ${escapar(p.observacoes)} O pedido não foi marcado como pago.</p>`,
      estorno: `<p><strong>NÃO ENVIAR.</strong> O pagamento ficou "${escapar(estorno)}" no Mercado Pago (estorno, devolução ou disputa). Se já foi enviado, responda a disputa no Mercado Pago com o código de rastreio.</p>`,
    }[tipo];
    const enviado = await avisarEquipe(
      assunto,
      `<h2>Pedido #${p.id} · ${p.origem === "site" ? "site" : "link de pagamento (venda pela equipe)"}</h2>
       ${alerta}
       <ul>${itens}</ul>
       <p>Frete: ${reais(p.frete)} · ${escapar(p.entrega)}<br><strong>Total: ${reais(p.total)}</strong></p>
       <h3>Enviar para</h3>
       ${p.endereco
         ? `<p>${escapar(p.cliente_nome)}<br>${escapar(e.rua)}, ${escapar(e.numero)}${e.complemento ? ` · ${escapar(e.complemento)}` : ""}<br>
       ${escapar(e.bairro)} · ${escapar(e.cidade)} - ${escapar(e.uf)} · CEP ${escapar(e.cep)}</p>`
         : `<p>${escapar(p.cliente_nome)}${p.cliente_cidade ? ` · ${escapar(p.cliente_cidade)}` : ""}<br>Endereço combinado pela equipe (pedido do painel).</p>`}
       <p>WhatsApp: ${escapar(p.cliente_telefone)} · E-mail: ${escapar(p.cliente_email)}</p>
       <p><a href="${SITE_URL}/painel/pedidos/${p.id}">Abrir no painel</a></p>`,
    );
    if (!enviado) {
      registrar("erro", "aviso por e-mail não saiu", { pedido: idPedido, tipo });
      return false;
    }
    if (temMarca) await limparMarca(admin, idPedido, tipo);
    return true;
  } catch (erro) {
    registrar("erro", "falha ao preparar o aviso por e-mail", { pedido: idPedido, tipo, erro: mensagemDe(erro) });
    return false;
  }
}

// Tira a marca deste aviso, e só dele: se outro mais novo (ex.: estorno) chegou no meio, ele continua marcado.
async function limparMarca(admin: SupabaseClient, idPedido: number, tipo: string) {
  const { error } = await admin.from("pedidos").update({ aviso_pendente: null }).eq("id", idPedido).eq("aviso_pendente", tipo);
  if (error) registrar("aviso", "a marca de aviso pendente ficou", { pedido: idPedido, tipo, erro: error.message });
}

// O aviso marcado ainda faz sentido? A equipe pode ter enviado, cancelado ou reembolsado depois da marca.
// Conflito ('conferir') vale até o pedido ficar pago ou o reembolso ser registrado: o dinheiro continua retido.
function avisoAindaVale(tipo: string, status: string, situacao: string | null) {
  if (tipo === "pago") return status === "pago" && situacao === "approved";
  if (tipo === "conferir") return !PAGOS.includes(status) && !ESTORNOS.includes(situacao ?? "");
  if (tipo === "estorno") return PAGOS.includes(status) && ESTORNOS.includes(situacao ?? "");
  return false;
}

// Conferência diária: compara com o banco os pagamentos que mudaram nos últimos dias e aplica o que o aviso não
// registrou (aprovado que ficou aguardando, vencido ou cancelado; estorno de pedido pago). Reenvia os e-mails que
// não saíram. Se acertou ou estranhou algo, manda um resumo para a equipe: sinal de que o aviso automático falhou.
// Nunca lança: os erros vão para o resumo.
export async function conferirPagamentos(admin: SupabaseClient, agora: Date): Promise<ResumoConferencia> {
  const resumo: ResumoConferencia = { pagamentos: 0, acertados: [], suspeitas: [], avisosReenviados: 0, erros: [], incompleta: false };
  try {
    await acertarPagamentos(admin, agora, resumo);
  } catch (erro) {
    resumo.erros.push(`Conferência dos pagamentos: ${mensagemDe(erro)}`);
  }
  resumo.avisosReenviados = await reenviarAvisos(admin, agora, resumo.erros);
  const temNovidade = resumo.acertados.length || resumo.suspeitas.length || resumo.erros.length || resumo.incompleta;
  if (temNovidade && emailConfigurado()) await avisarResumo(resumo);
  // o resumo inteiro também fica no log (só números de pedido e de pagamento): sem e-mail, é onde ele fica
  registrar(resumo.erros.length ? "erro" : temNovidade ? "aviso" : "info", "conferência diária", { ...resumo });
  return resumo;
}

async function acertarPagamentos(admin: SupabaseClient, agora: Date, resumo: ResumoConferencia) {
  const desde = new Date(agora.getTime() - JANELA_DIAS * 86_400_000);
  const pagamentos: Pagamento[] = [];
  for (let offset = 0; ; ) {
    const pagina = await buscarPagamentosAlterados(desde, agora, offset);
    const lista = pagina.results ?? [];
    pagamentos.push(...lista);
    offset += lista.length;
    if (lista.length === 0 || offset >= (pagina.paging?.total ?? 0)) break;
    if (offset >= MAX_PAGAMENTOS) {
      resumo.incompleta = true;
      break;
    }
  }
  resumo.pagamentos = pagamentos.length;

  const ids = [...new Set(pagamentos.map((p) => Number(p.external_reference)).filter((n) => Number.isSafeInteger(n) && n > 0))];
  if (ids.length === 0) return;
  // pagamentos_vistos só existe com o schema.sql novo: sem ele, reaplicar pagamentos repetiria avisos e conflitos
  const { data, error } = await admin.from("pedidos").select("id,status,pagamento_id,pagamento_status,pagamentos_vistos").in("id", ids);
  if (error && /pagamentos_vistos/.test(error.message))
    throw new Error("Falta rodar o supabase/schema.sql novo no Supabase: a conferência só acerta pagamentos depois disso.");
  if (error) throw new ErroBanco("ler os pedidos da conferência", error);
  const pedidos = new Map(((data ?? []) as PedidoResumo[]).map((p) => [p.id, p]));

  // do mais antigo para o mais recente: se um pedido teve dois pagamentos, vale a ordem em que mudaram
  for (const pagamento of [...pagamentos].reverse()) {
    const pedido = pedidos.get(Number(pagamento.external_reference));
    if (!pedido) continue;
    const idPagamento = String(pagamento.id);
    if (pagamento.status === "approved" && PAGOS.includes(pedido.status) && pedido.pagamento_id !== idPagamento) {
      resumo.suspeitas.push(
        pedido.pagamento_id && pedido.pagamento_status === "approved"
          ? `Pedido #${pedido.id}: já estava pago pelo pagamento ${pedido.pagamento_id} e tem também o pagamento ${idPagamento} aprovado. Confira no Mercado Pago se a cliente pagou duas vezes.`
          : `Pedido #${pedido.id}: foi marcado como pago no painel e tem o pagamento ${idPagamento} aprovado no Mercado Pago. Confira se a cliente pagou duas vezes.`,
      );
      continue;
    }
    if (!precisaAcertar(pedido, pagamento)) continue;
    try {
      const resultado = await processarPagamento(admin, pagamento, "conferencia");
      // 'ja_pago': o banco já tinha tratado este pagamento (pagamentos_vistos); não é acerto
      if (resultado !== "ja_pago") resumo.acertados.push(`Pedido #${pedido.id}: pagamento ${idPagamento} ${pagamento.status} (resultado: ${resultado})`);
      const { data: atual } = await admin.from("pedidos").select("id,status,pagamento_id,pagamento_status").eq("id", pedido.id).maybeSingle();
      if (atual) pedidos.set(pedido.id, atual as PedidoResumo);
    } catch (erro) {
      resumo.erros.push(`Pedido #${pedido.id}, pagamento ${idPagamento}: ${mensagemDe(erro)}`);
    }
  }
}

// O banco talvez ainda não saiba desta situação do pagamento? Para aprovado, a palavra final é do banco: um pagamento
// já tratado (pagamentos_vistos) volta como 'ja_pago', sem anotar nem avisar de novo.
function precisaAcertar(pedido: PedidoResumo, pagamento: Pagamento) {
  const idPagamento = String(pagamento.id);
  if (pagamento.status === "approved") {
    // aprovado que ficou aguardando, vencido ou cancelado porque o aviso não chegou
    const registrado = pedido.pagamento_id === idPagamento && ["approved", "valor_divergente"].includes(pedido.pagamento_status ?? "");
    return !PAGOS.includes(pedido.status) && !registrado;
  }
  // estorno, devolução ou disputa ainda não anotado: do pagamento do pedido (pago vira "NÃO ENVIAR"; não pago só anota)
  // ou de pedido pago sem pagamento aprovado registrado (marcado à mão no painel: o banco fica com o lado seguro)
  if (ESTORNOS.includes(pagamento.status)) {
    if (pedido.pagamento_status === pagamento.status) return false;
    if (pedido.pagamento_id === idPagamento) return true;
    return PAGOS.includes(pedido.status) && !["approved", "valor_divergente"].includes(pedido.pagamento_status ?? "");
  }
  return false;
}

// Avisos por e-mail que não saíram (marcados pelo banco em aviso_pendente). Banco sem a coluna ou e-mail desligado:
// nada a reenviar. Aviso que perdeu o sentido (pedido já enviado, cancelado, reembolsado) só perde a marca.
async function reenviarAvisos(admin: SupabaseClient, agora: Date, erros: string[]) {
  if (!emailConfigurado()) return 0;
  const { data, error } = await admin
    .from("pedidos")
    .select("id,status,pagamento_status,aviso_pendente")
    .not("aviso_pendente", "is", null)
    .lt("atualizado_em", new Date(agora.getTime() - AVISO_ESPERA_MIN * 60_000).toISOString())
    .gt("atualizado_em", new Date(agora.getTime() - AVISO_DIAS * 86_400_000).toISOString())
    .order("id")
    .limit(50);
  if (error) {
    if (!/aviso_pendente/.test(error.message)) erros.push(`Reenviar avisos por e-mail: ${error.message}`);
    return 0;
  }
  let enviados = 0;
  for (const p of (data ?? []) as { id: number; status: string; pagamento_status: string | null; aviso_pendente: string }[]) {
    if (!avisoAindaVale(p.aviso_pendente, p.status, p.pagamento_status)) await limparMarca(admin, p.id, p.aviso_pendente);
    else if (await enviarAviso(admin, p.id, p.aviso_pendente as Aviso)) enviados++;
  }
  return enviados;
}

async function avisarResumo(resumo: ResumoConferencia) {
  const lista = (titulo: string, itens: string[]) =>
    itens.length ? `<h3>${titulo}</h3><ul>${itens.map((i) => `<li>${escapar(i)}</li>`).join("")}</ul>` : "";
  const partes = [
    resumo.acertados.length && `${resumo.acertados.length} acertado(s)`,
    resumo.suspeitas.length && `${resumo.suspeitas.length} para conferir`,
    resumo.erros.length && `${resumo.erros.length} erro(s)`,
  ].filter(Boolean);
  const enviado = await avisarEquipe(
    `⚠️ Conferência dos pagamentos: ${partes.join(", ") || "incompleta"}`,
    `<p>A conferência diária comparou os pagamentos do Mercado Pago com os pedidos do painel.</p>
     ${lista("Acertados agora (o aviso automático do Mercado Pago não tinha registrado)", resumo.acertados)}
     ${lista("Para conferir", resumo.suspeitas)}
     ${lista("Erros", resumo.erros)}
     ${resumo.incompleta ? `<p>Havia mais de ${MAX_PAGAMENTOS} pagamentos para conferir: os mais antigos ficaram de fora.</p>` : ""}
     <p>Pedido acertado aqui mais de uma vez na semana é sinal de que o aviso automático do Mercado Pago está falhando:
     confira a assinatura secreta do webhook (MERCADOPAGO_WEBHOOK_SECRET) na Vercel.</p>
     <p><a href="${SITE_URL}/painel/pedidos">Abrir os pedidos no painel</a></p>`,
  );
  if (!enviado) registrar("erro", "resumo da conferência não saiu por e-mail", { acertados: resumo.acertados.length, erros: resumo.erros.length });
}
