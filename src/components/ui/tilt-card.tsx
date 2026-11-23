"use client";

import { useEffect, useRef, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";

type TiltTag = "article" | "div" | "li" | "section";

type TiltCardProps = HTMLAttributes<HTMLElement> & {
  as?: TiltTag;
  children: ReactNode;
  maxTilt?: number;
};

export function TiltCard({ as = "div", children, className, maxTilt = 6, style, ...attributes }: TiltCardProps) {
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = elementRef.current;
    if (root === null) return;
    const element: HTMLElement = root;

    const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: no-preference)");
    let frame = 0;

    function reset() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        element.style.setProperty("--tilt-rotate-x", "0deg");
        element.style.setProperty("--tilt-rotate-y", "0deg");
        element.style.setProperty("--tilt-pointer-x", "50%");
        element.style.setProperty("--tilt-pointer-y", "50%");
        element.style.setProperty("--tilt-shine-opacity", "0");
      });
    }

    function move(event: PointerEvent) {
      if (event.pointerType === "touch" || !hoverQuery.matches || !motionQuery.matches) return;
      const point = { x: event.clientX, y: event.clientY };
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const bounds = element.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        const x = Math.max(0, Math.min(1, (point.x - bounds.left) / bounds.width));
        const y = Math.max(0, Math.min(1, (point.y - bounds.top) / bounds.height));
        element.style.setProperty("--tilt-rotate-x", `${(0.5 - y) * maxTilt}deg`);
        element.style.setProperty("--tilt-rotate-y", `${(x - 0.5) * maxTilt}deg`);
        element.style.setProperty("--tilt-pointer-x", `${x * 100}%`);
        element.style.setProperty("--tilt-pointer-y", `${y * 100}%`);
        element.style.setProperty("--tilt-shine-opacity", "1");
      });
    }

    element.addEventListener("pointermove", move, { passive: true });
    element.addEventListener("pointerleave", reset, { passive: true });
    hoverQuery.addEventListener("change", reset);
    motionQuery.addEventListener("change", reset);

    return () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", reset);
      hoverQuery.removeEventListener("change", reset);
      motionQuery.removeEventListener("change", reset);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [maxTilt]);

  const cardStyle = {
    ...style,
    "--tilt-rotate-x": "0deg",
    "--tilt-rotate-y": "0deg",
    "--tilt-pointer-x": "50%",
    "--tilt-pointer-y": "50%",
    "--tilt-shine-opacity": "0",
  } as CSSProperties;
  const shared = { ...attributes, className: ["tilt-card", className].filter(Boolean).join(" "), style: cardStyle };

  if (as === "article") return <article {...shared} ref={(node) => { elementRef.current = node; }}>{children}</article>;
  if (as === "li") return <li {...shared} ref={(node) => { elementRef.current = node; }}>{children}</li>;
  if (as === "section") return <section {...shared} ref={(node) => { elementRef.current = node; }}>{children}</section>;
  return <div {...shared} ref={(node) => { elementRef.current = node; }}>{children}</div>;
}
