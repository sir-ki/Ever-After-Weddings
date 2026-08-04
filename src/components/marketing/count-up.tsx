"use client";

import { useEffect, useRef, useState } from "react";

// Counts from 0 to target once ~75% into the viewport, cubic ease-out
// over 1.1s — matches the design reference's pricing-figure animation.
// Reduced motion jumps straight to the target, no intermediate frames.
export function CountUp({ target, prefix = "" }: { target: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let started = false;

    const animate = () => {
      if (started) return;
      started = true;
      if (reduced) {
        setValue(target);
        return;
      }
      const start = performance.now();
      const dur = 1100;
      const step = (t: number) => {
        const p = Math.min(1, (t - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate();
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -25% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {prefix}
      {value.toLocaleString("en-PH")}
    </span>
  );
}
