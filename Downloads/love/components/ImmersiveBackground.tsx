"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/providers/ThemeProvider";

export function ImmersiveBackground() {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.animate(
      [
        { opacity: 0.9, transform: "translate3d(0, 4px, 0)" },
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
      ],
      { duration: 420, easing: "ease-out" },
    );
  }, [theme]);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const node = ref.current;
      if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const x = (event.clientX / window.innerWidth - 0.5) * 4;
      const y = (event.clientY / window.innerHeight - 0.5) * 4;
      node.style.setProperty("--bg-shift-x", `${x}px`);
      node.style.setProperty("--bg-shift-y", `${y}px`);
    };
    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="immersive-bg pointer-events-none"
      style={{
        transform:
          "translate3d(var(--bg-shift-x, 0px), var(--bg-shift-y, 0px), 0)",
      }}
    >
      <div className="immersive-bg__layer immersive-bg__base" />
      <div className="immersive-bg__layer immersive-bg__pattern" />
      <div className="immersive-bg__layer immersive-bg__noise" />
      <div className="immersive-bg__layer immersive-bg__vignette" />
      <div className="immersive-bg__layer immersive-bg__glow" />
    </div>
  );
}
