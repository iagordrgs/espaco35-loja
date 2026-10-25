// Tipos e textos compartilhados pelas telas do painel.

export const STATUS_PEDIDO = ["novo", "pago", "enviado", "entregue", "cancelado"] as const;
export type StatusPedido = (typeof STATUS_PEDIDO)[number];

export const ROTULO_STATUS: Record<StatusPedido, string> = {
  novo: "Novo · par reservado",
  pago: "Pago",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

// Pedidos que contam como venda nos relatórios.
export const STATUS_VENDA: StatusPedido[] = ["pago", "enviado", "entregue"];

export const PAGAMENTOS = ["Pix", "Cartão de crédito", "Cartão de débito", "Link de pagamento", "Dinheiro"];
export const ENTREGAS = ["Correios", "Motoboy / Uber", "Retirada combinada"];

export type ItemPedido = { slug: string; nome: string; codigo: string; categoria: string; preco: number; tabela?: "varejo" | "atacado" };

export type Pedido = {
  id: number;
  criado_em: string;
  status: StatusPedido;
  cliente_nome: string;
  cliente_telefone: string | null;
  cliente_cidade: string | null;
  itens: ItemPedido[];
  subtotal: number;
  desconto: number;
  frete: number;
  total: number;
  pagamento: string | null;
  entrega: string | null;
  vendedor: string | null;
  observacoes: string | null;
  origem?: "painel" | "site";
  cliente_email?: string | null;
  endereco?: { cep?: string; rua?: string; numero?: string; complemento?: string; bairro?: string; cidade?: string; uf?: string } | null;
  pagamento_id?: string | null;
  pagamento_status?: string | null;
  expira_em?: string | null;
};

export type LinhaEstoque = { slug: string; status: "disponivel" | "reservado" | "vendido"; reservado_ate: string | null; pedido_id: number | null };

// Hora da requisição (as páginas do painel são montadas no servidor a cada acesso).
export const agoraMs = () => Date.now();

export const reais = (valor: number) => Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Fortaleza" });

// Link para abrir a conversa com a cliente no WhatsApp da loja.
export function whatsCliente(telefone: string | null): string | null {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return null;
  return `https://wa.me/${digitos.length <= 11 ? `55${digitos}` : digitos}`;
}
