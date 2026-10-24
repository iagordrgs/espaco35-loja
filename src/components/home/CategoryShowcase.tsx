"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

export type ShowcaseItem = {
  key: string;
  label: string;
  href: string;
  image: string;
  alt: string;
  caption: string;
  count: number;
};

export default function CategoryShowcase({ items }: { items: ShowcaseItem[] }) {
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();
  const current = items[active];

  return (
    <div className="showcase">
      <nav className="showcase-menu" aria-label="Categorias">
        {items.map((item, index) => (
          <Link
            key={item.key}
            href={item.href}
            className={`showcase-link${index === active ? " is-active" : ""}`}
            onMouseEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            aria-current={index === active ? "true" : undefined}
          >
            <span className="showcase-index">0{index + 1}</span>
            <span className="showcase-label">{item.label}</span>
            <span className="showcase-count">{item.count} pares</span>
            <span className="showcase-arrow" aria-hidden="true">↗</span>
          </Link>
        ))}
        <div className="showcase-tabs" role="tablist" aria-label="Escolha a categoria">
          {items.map((item, index) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={index === active}
              className={index === active ? "is-active" : undefined}
              onClick={() => setActive(index)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      <Link href={current.href} className="showcase-stage" aria-label={`Ver ${current.label}`}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={current.key}
            className="showcase-image"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.06, clipPath: "inset(0 0 0 100%)" }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, clipPath: "inset(0 0 0 0%)" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image src={current.image} alt={current.alt} fill sizes="(max-width: 860px) 100vw, 55vw" />
          </motion.div>
        </AnimatePresence>
        <span className="showcase-caption">
          <strong>{current.label}</strong>
          <span>{current.caption}</span>
        </span>
      </Link>
    </div>
  );
}
