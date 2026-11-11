import { timingSafeEqual } from "node:crypto";
import { pagamentoOnlineAtivo } from "@/lib/mercadopago";
import { conferirPagamentos, mensagemDe, registrar } from "@/lib/pagamentos";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Conferência diária dos pagamentos (Vercel Cron; o horário está em vercel.json). A Vercel chama com o cabeçalho
// "Authorization: Bearer <CRON_SECRET>". Sem a variável CRON_SECRET na Vercel, ninguém consegue chamar.
export async function GET(request: Request) {
  if (!autorizado(request.headers.get("authorization"))) return new Response("não autorizado", { status: 401 });
  const admin = supabaseAdmin();
  if (!admin || !pagamentoOnlineAtivo()) return Response.json({ conferido: false, motivo: "pagamento online desligado" });
  try {
    return Response.json(await conferirPagamentos(admin, new Date()));
  } catch (erro) {
    registrar("erro", "conferência diária falhou", { erro: mensagemDe(erro) });
    return Response.json({ conferido: false, erro: mensagemDe(erro) }, { status: 500 });
  }
}

function autorizado(cabecalho: string | null) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || !cabecalho) return false;
  const esperado = Buffer.from(`Bearer ${segredo}`);
  const recebido = Buffer.from(cabecalho);
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
}
