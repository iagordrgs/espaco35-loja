import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";

// Cliente com a chave de serviço (SUPABASE_SERVICE_ROLE_KEY): usado só no servidor, para gravar pedidos
// feitos pelo site e confirmar pagamentos. Essa chave ignora as regras de acesso: nunca pode ir para o navegador.
export function supabaseAdmin() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !chave) return null;
  return createClient(SUPABASE_URL, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}
