import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import type { TestProject } from "vitest/node";

// Roda uma vez antes de todos os testes: garante o Supabase local no ar, recria as tabelas da loja pelo
// supabase/schema.sql (o mesmo arquivo que roda em produção) e passa as chaves locais para os testes.
// Só aceita banco em 127.0.0.1: nunca aponta para o Supabase de produção.

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));

function statusLocal(): Record<string, string> | null {
  try {
    const saida = execSync("npx supabase status -o env", { cwd: RAIZ, stdio: ["ignore", "pipe", "ignore"] }).toString();
    const env = Object.fromEntries(
      saida.split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/)).filter((m): m is RegExpMatchArray => Boolean(m)).map((m) => [m[1], m[2]]),
    );
    return env.API_URL && env.DB_URL ? env : null;
  } catch {
    return null;
  }
}

export default async function preparar(project: TestProject) {
  let env = statusLocal();
  if (!env) {
    console.log("[testes] subindo o Supabase local (Docker)...");
    execSync(
      "npx supabase start -x studio,imgproxy,storage-api,realtime,edge-runtime,logflare,vector,supavisor,mailpit,postgres-meta",
      { cwd: RAIZ, stdio: "inherit" },
    );
    env = statusLocal();
  }
  if (!env) throw new Error("Supabase local não subiu. O Docker Desktop está ligado?");
  for (const url of [env.API_URL, env.DB_URL]) {
    if (!/^(https?|postgresql):\/\/([^@/]*@)?127\.0\.0\.1:/.test(url)) throw new Error(`Recusado: o banco de teste precisa ser local, veio ${url}`);
  }

  // Trava da rodada: duas rodadas ao mesmo tempo apagariam o banco uma da outra. Esta conexão fica aberta
  // até o fim da rodada segurando a trava; a segunda rodada para na hora com o aviso.
  const trava = new Client({ connectionString: env.DB_URL });
  await trava.connect();
  const [{ livre }] = (await trava.query("select pg_try_advisory_lock(353535) as livre")).rows;
  if (!livre) {
    await trava.end();
    throw new Error("Outra rodada de testes está usando o banco de teste agora. Espere ela terminar e rode de novo.");
  }

  // começa do zero a cada rodada: apaga as tabelas da loja e roda o schema.sql de produção
  await trava.query("drop table if exists public.pedidos, public.estoque, public.equipe cascade");
  await trava.query(readFileSync(`${RAIZ}/supabase/schema.sql`, "utf8"));
  await trava.query("delete from auth.users where email like '%@teste.espaco35'");

  project.provide("supabase", {
    url: env.API_URL,
    anon: env.ANON_KEY ?? env.PUBLISHABLE_KEY,
    servico: env.SERVICE_ROLE_KEY ?? env.SECRET_KEY,
    banco: env.DB_URL,
  });

  // fim da rodada: solta a trava
  return async () => {
    await trava.end();
  };
}

declare module "vitest" {
  export interface ProvidedContext {
    supabase: { url: string; anon: string; servico: string; banco: string };
  }
}
