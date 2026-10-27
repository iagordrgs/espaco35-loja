"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";

export default function ProductGallery({
  images,
  alt,
  esgotado = false,
}: {
  images: string[];
  alt: string;
  esgotado?: boolean;
}) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const hadZoom = useRef(false);
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
      if (e.key === "Tab" && dialogRef.current) {
        const items = dialogRef.current.querySelectorAll<HTMLElement>("button:not(:disabled)");
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [zoom, go]);

  useEffect(() => {
    if (zoom) closeRef.current?.focus();
    else if (hadZoom.current) triggerRef.current?.focus();
    hadZoom.current = zoom;
  }, [zoom]);

  return (
    <div>
      {/* imagem principal */}
      <div className={`product-gallery-main${esgotado ? " is-sold" : ""}`}>
        {esgotado && <span className="sold-band">Esgotado</span>}
        <button
          type="button"
          ref={triggerRef}
          onClick={() => setZoom(true)}
          aria-label={`Ampliar foto de ${alt}`}
          className="gallery-main-trigger"
        >
        <Image
          src={images[i]}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain p-3"
          priority
        />
        </button>
        {n > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Anterior"
              className="gallery-control previous"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Próxima"
              className="gallery-control next"
            >
              ›
            </button>
            <span className="gallery-count">
              {i + 1}/{n}
            </span>
          </>
        )}
      </div>

      {/* miniaturas */}
      {n > 1 && (
        <div className="gallery-thumbnails" aria-label="Mais fotos deste par">
          {images.map((src, idx) => (
            <button
              key={src}
              type="button"
              onClick={() => setI(idx)}
              aria-label={`Ver foto ${idx + 1} de ${n}`}
              aria-pressed={idx === i}
              className={`gallery-thumb${idx === i ? " active" : ""}`}
            >
              <Image src={src} alt={`${alt} ${idx + 1}`} fill sizes="80px" className="object-contain p-1" />
            </button>
          ))}
        </div>
      )}

      {/* lightbox */}
      {zoom && (
        <div
          className="lightbox"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Fotos de ${alt}`}
          onClick={() => setZoom(false)}
        >
          <button
            type="button"
            ref={closeRef}
            aria-label="Fechar"
            className="lightbox-close"
            onClick={() => setZoom(false)}
          >
            ×
          </button>
          <div
            className="lightbox-image"
            onClick={(e) => e.stopPropagation()}
          >
            <Image src={images[i]} alt={alt} fill sizes="90vw" className="object-contain" />
            {n > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Anterior"
                  className="gallery-control previous"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Próxima"
                  className="gallery-control next"
                >
                  ›
                </button>
                <span className="gallery-count">
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
