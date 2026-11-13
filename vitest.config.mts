import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testes de integração: cada teste chama a rota (ou a server action) de verdade, com o banco de teste de verdade
// (Supabase local no Docker, nunca o de produção). Só o que é de fora é simulado: Mercado Pago, e-mail (Resend) e CEP.
// Rodar: npm test   (o comando sobe o Supabase local se ele estiver parado)
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // "server-only" só existe para o build do Next não mandar o arquivo para o navegador
      "server-only": fileURLToPath(new URL("./testes/apoio/vazio.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    globalSetup: ["./testes/apoio/preparar-banco.ts"],
    setupFiles: ["./testes/apoio/ambiente.ts"],
    include: ["testes/**/*.test.ts"],
    // um banco só para todos: um arquivo de teste por vez (dentro do teste, as requisições simultâneas são de propósito)
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
