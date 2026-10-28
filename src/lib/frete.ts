import "server-only";

// Frete do site: Fortaleza com valor fixo (Uber Flash / 99 Entrega chamado na hora) ou retirada grátis combinada
// com a equipe; resto do Brasil cotado pelo CEP no Melhor Envio.
// Variáveis (Vercel > Settings > Environment Variables):
//   LOJA_CEP_ORIGEM     CEP de onde os pares saem em Fortaleza
//   MELHORENVIO_TOKEN   token do Melhor Envio (Integrações > Permissões de acesso)
//   MELHORENVIO_SANDBOX "1" para usar o ambiente de testes do Melhor Envio
export const FRETE_FORTALEZA = 15; // a corrida varia (R$ 8 a 20); a diferença sai da margem do par

// Caixa de um par de sapato (cm/kg). Ajuste se as caixas forem maiores.
const CAIXA = { largura: 22, altura: 13, comprimento: 33, peso: 0.9 };

export type Endereco = { cep: string; rua: string; bairro: string; cidade: string; uf: string };
export type OpcaoFrete = { id: string; nome: string; preco: number; prazo: string };
export type Cotacao = { endereco: Endereco | null; opcoes: OpcaoFrete[]; aviso?: string };

export const soDigitos = (cep: string) => cep.replace(/\D/g, "").slice(0, 8);

const normalizar = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function ehFortaleza(endereco: Pick<Endereco, "cidade" | "uf">) {
  return normalizar(endereco.cidade) === "fortaleza" && endereco.uf.toUpperCase() === "CE";
}

// ViaCEP: endereço a partir do CEP (grátis, sem chave).
export async function buscarEndereco(cep: string): Promise<Endereco | null> {
  const digitos = soDigitos(cep);
  if (digitos.length !== 8) return null;
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`, { next: { revalidate: 86400 } });
    if (!resposta.ok) return null;
    const dados = await resposta.json();
    if (dados.erro) return null;
    return { cep: digitos, rua: dados.logradouro ?? "", bairro: dados.bairro ?? "", cidade: dados.localidade ?? "", uf: dados.uf ?? "" };
  } catch {
    return null;
  }
}

async function cotarMelhorEnvio(cepDestino: string, valores: number[]): Promise<OpcaoFrete[] | null> {
  const token = process.env.MELHORENVIO_TOKEN;
  const origem = soDigitos(process.env.LOJA_CEP_ORIGEM ?? "");
  if (!token || origem.length !== 8) return null;
  const base = process.env.MELHORENVIO_API ?? (process.env.MELHORENVIO_SANDBOX === "1" ? "https://sandbox.melhorenvio.com.br" : "https://melhorenvio.com.br");
  try {
    const resposta = await fetch(`${base}/api/v2/me/shipment/calculate`, {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": `Espaco35 Loja (${process.env.EMAIL_EQUIPE ?? "contato@espaco35"})`,
      },
      body: JSON.stringify({
        from: { postal_code: origem },
        to: { postal_code: cepDestino },
        products: valores.map((valor, i) => ({
          id: String(i + 1),
          width: CAIXA.largura,
          height: CAIXA.altura,
          length: CAIXA.comprimento,
          weight: CAIXA.peso,
          insurance_value: Math.round(valor * 100) / 100,
          quantity: 1,
        })),
      }),
    });
    if (!resposta.ok) return null;
    const lista = (await resposta.json()) as {
      id: number; name: string; error?: string; price?: string; custom_price?: string;
      delivery_time?: number; custom_delivery_time?: number; company?: { name?: string };
    }[];
    return lista
      .filter((s) => !s.error && (s.custom_price ?? s.price))
      .map((s) => {
        const dias = s.custom_delivery_time ?? s.delivery_time ?? 0;
        return {
          id: `me-${s.id}`,
          nome: `${s.company?.name ?? ""} ${s.name}`.trim(),
          preco: Math.round(Number(s.custom_price ?? s.price) * 100) / 100,
          prazo: dias ? `até ${dias} ${dias === 1 ? "dia útil" : "dias úteis"}` : "prazo informado no envio",
        };
      })
      .sort((a, b) => a.preco - b.preco)
      .slice(0, 4);
  } catch {
    return null;
  }
}

// Cota o frete para um CEP e os valores dos pares (o valor entra no seguro do envio).
export async function cotarFrete(cep: string, valores: number[]): Promise<Cotacao> {
  const endereco = await buscarEndereco(cep);
  if (!endereco) return { endereco: null, opcoes: [], aviso: "CEP não encontrado. Confira os números." };
  if (ehFortaleza(endereco)) {
    return {
      endereco,
      opcoes: [
        { id: "fortaleza", nome: "Entrega em Fortaleza (motoboy)", preco: FRETE_FORTALEZA, prazo: "até 2 dias úteis" },
        { id: "retirada", nome: "Retirar com a equipe (grátis)", preco: 0, prazo: "combinamos dia, hora e local pelo WhatsApp" },
      ],
    };
  }
  const opcoes = await cotarMelhorEnvio(endereco.cep, valores);
  if (!opcoes || opcoes.length === 0) {
    return { endereco, opcoes: [], aviso: "Não conseguimos calcular o frete para este CEP agora. Finalize pelo WhatsApp que a equipe calcula para você." };
  }
  return { endereco, opcoes };
}
