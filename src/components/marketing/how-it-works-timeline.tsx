"use client";

import { useEffect, useRef, useState } from "react";
import { PlaceholderImage } from "./placeholder-image";

type Step = { n: string; title: string; desc: string };

// Sticky two-column layout: left pane is position:sticky and mirrors
// whichever step is nearest viewport-center on the right; right column
// holds all 7 steps stacked (~60vh each). "Nearest center" is tracked
// with an IntersectionObserver whose root margin brackets a thin band
// around the vertical middle, rather than the design reference's
// continuous rAF distance calculation — same effect, cheaper.
export function HowItWorksTimeline({ steps }: { steps: Step[] }) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = refs.current.findIndex((el) => el === entry.target);
          if (idx !== -1) setActive(idx);
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [steps.length]);

  return (
    <section className="mx-auto grid max-w-[1200px] grid-cols-1 gap-[60px] px-5 py-20 md:grid-cols-[minmax(200px,340px)_1fr] md:px-10 md:py-[120px]">
      {/* Outer grid item stretches to the row's full height (the tall
          right column) by default grid alignment — the inner div is
          what actually sticks, pinned within that tall containing
          block. Sticky positioned directly on a self-start/h-fit grid
          item collapses its own containing block to content height,
          which silently breaks sticking — this split avoids that. */}
      <div>
        <div className="top-[120px] h-fit md:sticky">
          <div className="mkt-font-serif mb-2.5 text-[15px] text-[var(--ea-accent-ink)]">
            step {String(active + 1).padStart(2, "0")} of {String(steps.length).padStart(2, "0")}
          </div>
          <div className="mkt-font-serif mb-4 text-[32px] leading-[1.2] text-[var(--ea-ink)]">
            {steps[active].title}
          </div>
          <PlaceholderImage caption="step visual placeholder" aspectRatio="4 / 5" />
        </div>
      </div>
      <div>
        {steps.map((step, i) => (
          <div
            key={step.n}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="flex min-h-[60vh] flex-col justify-center border-b border-[var(--ea-border)] py-10"
          >
            <div className="mb-3.5 text-[13px] text-[var(--ea-accent-ink)]">
              {step.n} / {String(steps.length).padStart(2, "0")}
            </div>
            <h3 className="mkt-font-serif mb-4 text-[clamp(24px,3vw,32px)] text-[var(--ea-ink)]">
              {step.title}
            </h3>
            <p className="max-w-[480px] text-base leading-[1.7] text-[var(--ea-ink-secondary)]">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
