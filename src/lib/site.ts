// Dados do negócio num lugar só. Mudou o número do WhatsApp, o endereço do site ou o horário? Muda aqui.

export const SITE_URL = "https://espaco35-loja.vercel.app";

export const WHATSAPP = "5585992442091"; // 55 + DDD + número, só dígitos
export const WHATSAPP_EXIBIDO = "(85) 99244-2091";
export const INSTAGRAM = "espaco35calcados";
export const HORARIO = "Seg a Sáb · 9h às 18h";

export function linkWhatsApp(mensagem?: string): string {
  const base = `https://wa.me/${WHATSAPP}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}

// Quem vende. O decreto do e-commerce (Decreto 7.962/2013, art. 2º) pede, em lugar de destaque do site:
// nome empresarial, CNPJ ou CPF, endereço físico e endereço eletrônico.
// Preencha quando a loja tiver CNPJ: o rodapé passa a mostrar sozinho. Vazio = não aparece.
export const VENDEDOR = {
  nomeEmpresarial: "",
  documento: "", // CNPJ (ou CPF)
  endereco: "",
  email: "",
};
