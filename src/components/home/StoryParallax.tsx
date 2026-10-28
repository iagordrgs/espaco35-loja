"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

export default function StoryParallax() {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  return (
    <section ref={ref} className="story">
      <div className="story-inner">
        <div className="story-copy">
          <span className="eyebrow eyebrow-light">Uma loja feita para o seu número</span>
          <h2>Procurar menos.<br />Encontrar melhor.</h2>
          <p>A Espaço 35 nasceu para reunir modelos que quase nunca aparecem no 35. Uma curadoria pequena e direta: cada par é novo, original e único. Quando sai, não volta.</p>
          <ol className="story-steps">
            <li><strong>01</strong><span>Escolha o seu par no site ou no catálogo</span></li>
            <li><strong>02</strong><span>Pague no site com Pix ou cartão, ou reserve pelo WhatsApp</span></li>
            <li><strong>03</strong><span>Receba em casa (postamos em até 2 dias úteis) ou retire com a equipe</span></li>
          </ol>
          <Link href="/produtos" className="button button-light">Explorar a coleção <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="story-art">
          <motion.div className="story-art-inner" style={reduceMotion ? undefined : { y: imageY }}>
            <Image src="/campanha/historia.jpg" alt="Modelo sentada usando a sandália flatform caramelo com tachas" fill sizes="(max-width: 860px) 100vw, 46vw" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
