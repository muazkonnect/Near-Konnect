import { useCallback, useEffect, useRef, useState } from "react";

export type AutoScrollOptions = {
  /** Time between card advances (ms). */
  intervalMs?: number;
  /** How long to stay paused after user interaction ends (ms). */
  resumeDelayMs?: number;
  /** Override step size in px. Defaults to first card width + gap. */
  stepPx?: number;
};

/**
 * Auto-scrolls a horizontal container one card at a time, ad-carousel style.
 * Pauses briefly on hover/touch then resumes on its own.
 */
export function useAutoScroll<T extends HTMLElement>(
  options: AutoScrollOptions | number = {},
) {
  const opts: AutoScrollOptions =
    typeof options === "number" ? { intervalMs: options } : options;
  const { intervalMs = 2800, resumeDelayMs = 1500, stepPx } = opts;

  const [el, setEl] = useState<T | null>(null);
  const ref = useCallback((node: T | null) => setEl(node), []);
  const pausedUntilRef = useRef(0);

  useEffect(() => {
    if (!el) return;
    const pauseFor = (ms: number) => {
      pausedUntilRef.current = Date.now() + ms;
    };
    const onEnter = () => pauseFor(60_000);
    const onLeave = () => pauseFor(resumeDelayMs);
    const onTouchStart = () => pauseFor(60_000);
    const onTouchEnd = () => pauseFor(resumeDelayMs);

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd);

    const getStep = () => {
      if (stepPx) return stepPx;
      const first = el.firstElementChild as HTMLElement | null;
      const second = first?.nextElementSibling as HTMLElement | null;
      if (first && second) return second.offsetLeft - first.offsetLeft;
      return first?.offsetWidth ?? el.clientWidth;
    };

    const id = window.setInterval(() => {
      if (Date.now() < pausedUntilRef.current) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 4) return;
      const step = getStep();
      const next = el.scrollLeft + step;
      if (next >= max - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollTo({ left: next, behavior: "smooth" });
      }
    }, intervalMs);

    return () => {
      window.clearInterval(id);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [el, intervalMs, resumeDelayMs, stepPx]);

  return ref;
}
