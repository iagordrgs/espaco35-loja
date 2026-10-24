"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/painel", label: "Resumo" },
  { href: "/painel/pedidos/novo", label: "Novo pedido" },
  { href: "/painel/pedidos", label: "Pedidos" },
  { href: "/painel/estoque", label: "Estoque" },
];

export default function PainelNav() {
  const caminho = usePathname();
  const ativo = (href: string) =>
    href === "/painel" ? caminho === href : href === "/painel/pedidos" ? caminho.startsWith(href) && !caminho.endsWith("/novo") : caminho.startsWith(href);

  return (
    <nav className="painel-nav" aria-label="Painel">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className={ativo(link.href) ? "is-active" : undefined} aria-current={ativo(link.href) ? "page" : undefined}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
