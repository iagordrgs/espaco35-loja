// Endereço e chave pública do projeto no Supabase (Dashboard > Project Settings > API).
// Ficam em .env.local no computador e nas variáveis de ambiente da Vercel. Sem elas o site
// funciona igual (estoque só pelo products.ts) e o painel mostra como configurar.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseConfigurado = Boolean(SUPABASE_URL && SUPABASE_KEY);
