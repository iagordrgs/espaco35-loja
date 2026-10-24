"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

export default function HeroCampaign() {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);
  const copyY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const lines = ["O 35 tem", "um lugar", "só dele."];

  return (
    <section ref={ref} className="campaign-hero" aria-label="Campanha Espaço 35">
      <motion.div className="campaign-hero-media" style={reduceMotion ? undefined : { y: imageY }}>
        <motion.div
          className="campaign-hero-zoom"
          initial={reduceMotion ? false : { scale: 1.12 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease }}
        >
          <Image
            src="/campanha/hero.jpg"
            alt="Modelo descendo uma escada de pedra com a sandália caramelo de salto bloco"
            fill
            priority
            sizes="100vw"
          />
        </motion.div>
      </motion.div>

      <motion.div className="campaign-hero-copy" style={reduceMotion ? undefined : { y: copyY, opacity: copyOpacity }}>
        <motion.span
          className="eyebrow"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease }}
        >
          Coleção 35 · Peças únicas
        </motion.span>
        <h1>
          {lines.map((line, index) => (
            <span key={line} className="campaign-line">
              <motion.span
                className={index === 2 ? "campaign-line-accent" : undefined}
                initial={reduceMotion ? false : { y: "110%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 0.9, delay: 0.45 + index * 0.12, ease }}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.95, ease }}
        >
          Calçados femininos novos e originais, escolhidos a dedo no número 35. Cada modelo existe uma vez só.
        </motion.p>
        <motion.div
          className="hero-actions"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.1, ease }}
        >
          <Link href="/produtos" className="button button-dark">Ver a coleção <span aria-hidden="true">↗</span></Link>
          <Link href="#vitrine" className="button button-outline">Destaques da semana</Link>
        </motion.div>
      </motion.div>

      <div className="campaign-hero-scroll" aria-hidden="true"><span /></div>
    </section>
  );
}
