"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Vitrine horizontal: arrasta com o dedo (nativo) ou com o mouse, e tem setas e barra de progresso.
export default function ProductRail({ children, label }: { children: ReactNode; label: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, moved: false, startX: 0, startScroll: 0 });
  const [progress, setProgress] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      setProgress(max > 0 ? track.scrollLeft / max : 0);
      setEdges({ start: track.scrollLeft < 8, end: track.scrollLeft > max - 8 });
    };
    update();
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      track.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  function step(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: "smooth" });
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || !trackRef.current) return;
    drag.current = { active: true, moved: false, startX: event.clientX, startScroll: trackRef.current.scrollLeft };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const track = trackRef.current;
    if (!drag.current.active || !track) return;
    const delta = event.clientX - drag.current.startX;
    if (Math.abs(delta) > 5 && !drag.current.moved) {
      drag.current.moved = true;
      track.classList.add("is-dragging");
      track.setPointerCapture(event.pointerId);
    }
    if (drag.current.moved) track.scrollLeft = drag.current.startScroll - delta;
  }

  function endDrag() {
    drag.current.active = false;
    trackRef.current?.classList.remove("is-dragging");
  }

  // Depois de arrastar, o clique que vem junto não deve abrir o produto.
  function onClickCapture(event: React.MouseEvent) {
    if (drag.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      drag.current.moved = false;
    }
  }

  return (
    <div className="rail">
      <div
        ref={trackRef}
        className="rail-track"
        role="region"
        aria-label={label}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
      <div className="rail-controls">
        <div className="rail-progress" aria-hidden="true"><span style={{ transform: `scaleX(${Math.max(progress, 0.08)})` }} /></div>
        <div className="rail-buttons">
          <button type="button" onClick={() => step(-1)} disabled={edges.start} aria-label="Pares anteriores">←</button>
          <button type="button" onClick={() => step(1)} disabled={edges.end} aria-label="Próximos pares">→</button>
        </div>
      </div>
    </div>
  );
}
