"use client";

import { useEffect, useRef, useState } from "react";

// Fade-and-rise on scroll-into-view, per the marketing plan's animation
// spec (~92% viewport threshold, 0.7s ease). Reduced motion is handled
// entirely by the .mkt-reveal CSS (globals.css) — no JS branch needed
// here, the class always gets set once visible.
export function Reveal({
  delay = 0,
  className = "",
  style,
  children,
}: {
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`mkt-reveal ${visible ? "is-visible" : ""} ${className}`}
      style={delay ? { ...style, transitionDelay: `${delay}ms` } : style}
    >
      {children}
    </div>
  );
}
