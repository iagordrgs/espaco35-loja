"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";

export default function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const n = images.length;

  const go = useCallback(
    (d: number) => setI((p) => (p + d + n) % n),
    [n]
  );

  useEffect(() => {
    if (!zoom) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [zoom, go]);

  return (
    <div>
      {/* imagem principal */}
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        <Image
          src={images[i]}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="cursor-zoom-in object-contain p-3"
          priority
          onClick={() => setZoom(true)}
        />
        {n > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur transition hover:bg-background"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Próxima"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur transition hover:bg-background"
            >
              ›
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground/90 backdrop-blur">
              {i + 1}/{n}
            </span>
          </>
        )}
      </div>

      {/* miniaturas */}
      {n > 1 && (
        <div className="mt-3 flex gap-3">
          {images.map((src, idx) => (
            <button
              key={src}
              type="button"
              onClick={() => setI(idx)}
              className={`relative h-20 w-20 overflow-hidden rounded-lg border bg-white transition ${
                idx === i ? "border-brand" : "border-[var(--line)] hover:border-brand/50"
              }`}
            >
              <Image src={src} alt={`${alt} ${idx + 1}`} fill sizes="80px" className="object-contain p-1" />
            </button>
          ))}
        </div>
      )}

      {/* lightbox */}
      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoom(false)}
        >
          <button
            type="button"
            aria-label="Fechar"
            className="absolute right-5 top-5 text-3xl text-white/80 hover:text-white"
          >
            ×
          </button>
          <div
            className="relative h-[80vh] w-[90vw] max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image src={images[i]} alt={alt} fill sizes="90vw" className="object-contain" />
            {n > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Anterior"
                  className="absolute left-0 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-2xl text-white backdrop-blur hover:bg-white/25"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Próxima"
                  className="absolute right-0 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-2xl text-white backdrop-blur hover:bg-white/25"
                >
                  ›
                </button>
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm text-white backdrop-blur">
                  {i + 1}/{n}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
