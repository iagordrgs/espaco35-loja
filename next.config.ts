import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Endereços antigos de dois pares cujo nome mudou: quem tiver o link antigo cai no par certo.
  async redirects() {
    return [
      { source: "/produtos/anabela-dourada-tachas", destination: "/produtos/rasteira-bege-florzinhas", permanent: true },
      { source: "/produtos/sandalia-caramelo-salto-taca", destination: "/produtos/papete-caramelo-pedra-verde", permanent: true },
    ];
  },
};

export default nextConfig;
