import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

// Cliente do Supabase com a sessão de quem está no painel (lida dos cookies). Um por requisição.
export async function supabaseServidor() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // em Server Component não dá para gravar cookie; o proxy renova a sessão
        }
      },
    },
  });
}

// Garante que há alguém logado. Usado em toda página e ação do painel (o proxy é só a primeira barreira).
export async function exigirUsuario() {
  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/painel/login");
  return { supabase, usuario: data.user };
}
