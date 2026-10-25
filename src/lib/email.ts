import "server-only";

// Aviso por e-mail para a equipe (Resend). Variáveis na Vercel:
//   RESEND_API_KEY   resend.com > API Keys
//   EMAIL_EQUIPE     quem recebe os avisos (pode ser mais de um, separados por vírgula)
//   EMAIL_REMETENTE  remetente verificado no Resend (ex.: "Espaço 35 <pedidos@seudominio.com.br>");
//                    sem domínio próprio, use "Espaço 35 <onboarding@resend.dev>" (só envia para o e-mail da conta)
// Sem as variáveis, não envia nada: o pedido continua aparecendo no painel.
export async function avisarEquipe(assunto: string, html: string): Promise<boolean> {
  const chave = process.env.RESEND_API_KEY;
  const para = process.env.EMAIL_EQUIPE;
  if (!chave || !para) return false;
  try {
    const resposta = await fetch(process.env.RESEND_API ?? "https://api.resend.com/emails", {
      method: "POST",
      cache: "no-store",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_REMETENTE ?? "Espaço 35 <onboarding@resend.dev>",
        to: para.split(",").map((e) => e.trim()).filter(Boolean),
        subject: assunto,
        html,
      }),
    });
    return resposta.ok;
  } catch {
    return false;
  }
}

export const escapar = (texto: unknown) =>
  String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
