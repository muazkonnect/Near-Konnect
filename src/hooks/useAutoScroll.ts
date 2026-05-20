import { useCallback, useEffect, useRef, useState } from "react";

export type AutoScrollOptions = {
  intervalMs?: number;
  resumeDelayMs?: number;
  stepPx?: number;
};

/**
 * Infinite auto-scrolling horizontal carousel.
 * Clones children once so scrolling loops seamlessly.
 * Pauses briefly on hover/touch, then resumes.
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

    // Clone children once for infinite loop. Re-clone if real children change.
    const originals = Array.from(el.children) as HTMLElement[];
    if (originals.length === 0) return;
    const clones = originals.map((c) => {
      const clone = c.cloneNode(true) as HTMLElement;
      clone.setAttribute("data-autoscroll-clone", "true");
      clone.setAttribute("aria-hidden", "true");
      return clone;
    });
    clones.forEach((c) => el.appendChild(c));

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

    const getHalfWidth = () => {
      // Width of one full set of originals = offsetLeft of first clone.
      const firstClone = el.querySelector<HTMLElement>(
        '[data-autoscroll-clone="true"]',
      );
      return firstClone ? firstClone.offsetLeft : el.scrollWidth / 2;
    };

    const id = window.setInterval(() => {
      if (Date.now() < pausedUntilRef.current) return;
      const step = getStep();
      if (step <= 0) return;
      const half = getHalfWidth();
      let next = el.scrollLeft + step;
      if (next >= half) {
        // Instant rewind by one set, then smooth-scroll the remainder.
        el.scrollLeft = el.scrollLeft - half;
        next = el.scrollLeft + step;
      }
      el.scrollTo({ left: next, behavior: "smooth" });
    }, intervalMs);

    return () => {
      window.clearInterval(id);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.querySelectorAll('[data-autoscroll-clone="true"]').forEach((n) =>
        n.remove(),
      );
    };
  }, [el, intervalMs, resumeDelayMs, stepPx]);

  return ref;
}
