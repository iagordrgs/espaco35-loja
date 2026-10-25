import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigurado } from "@/lib/supabase/config";

// Só roda no painel: renova a sessão do Supabase e manda para o login quem não entrou.
// A checagem de verdade acontece de novo em cada página e ação (exigirUsuario).
export async function proxy(request: NextRequest) {
  const resposta = NextResponse.next({ request });
  if (!supabaseConfigurado) return resposta;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista, headers) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
        Object.entries(headers).forEach(([chave, valor]) => resposta.headers.set(chave, valor));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const naTelaDeLogin = request.nextUrl.pathname.startsWith("/painel/login");

  if (!data.user && !naTelaDeLogin) {
    return NextResponse.redirect(new URL("/painel/login", request.url));
  }
  if (data.user && naTelaDeLogin) {
    // só pula o login quem é da equipe; quem não é fica no login (senão o painel e o login se redirecionam sem fim)
    const { data: membro } = await supabase.from("equipe").select("user_id").eq("user_id", data.user.id).maybeSingle();
    if (membro) return NextResponse.redirect(new URL("/painel", request.url));
  }
  return resposta;
}

export const config = {
  matcher: ["/painel/:path*"],
};
