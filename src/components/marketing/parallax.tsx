"use client";

import { useEffect, useRef } from "react";

// Layered scroll depth, transform-only (translate3d/scale), driven by a
// per-instance rAF loop reading getBoundingClientRect — same technique
// the design reference (design_handoff_ever_after/Ever After.dc.html)
// uses, ported 1:1 since it works everywhere without a CSS
// scroll-timeline dependency. Disabled under prefers-reduced-motion and
// on mobile (<880px, matching the plan's own breakpoint) — the multi-
// plane hero/promise treatment stays static there.
export function Parallax({
  factor,
  axis = "y",
  mode = "translate",
  className = "",
  style,
  children,
}: {
  factor: number;
  axis?: "x" | "y";
  mode?: "translate" | "scale";
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 879px)").matches;
    if (reduced || isMobile) return;

    let raf = 0;
    const tick = () => {
      const rect = el.getBoundingClientRect();
      if (mode === "scale") {
        const p = Math.min(
          1,
          Math.max(0, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)),
        );
        el.style.transform = `scale(${(1 + p * 0.08).toFixed(3)})`;
      } else {
        const offset = (rect.top * factor).toFixed(2);
        el.style.transform =
          axis === "y" ? `translate3d(0, ${offset}px, 0)` : `translate3d(${offset}px, 0, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [factor, axis, mode]);

  return (
    <div ref={ref} className={className} style={{ transformOrigin: "center", ...style }}>
      {children}
    </div>
  );
}
