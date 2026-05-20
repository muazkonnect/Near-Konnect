import { useCallback, useEffect, useState } from "react";

export type AutoScrollOptions = {
  intervalMs?: number;
  resumeDelayMs?: number;
  stepPx?: number;
  speedPxPerSecond?: number;
};

/**
 * Infinite auto-scrolling horizontal carousel.
 * Clones children once so scrolling loops seamlessly and keeps moving like an ad strip.
 */
export function useAutoScroll<T extends HTMLElement>(
  options: AutoScrollOptions | number = {},
) {
  const opts: AutoScrollOptions =
    typeof options === "number" ? { intervalMs: options } : options;
  const { speedPxPerSecond = 42 } = opts;

  const [el, setEl] = useState<T | null>(null);
  const ref = useCallback((node: T | null) => setEl(node), []);

  useEffect(() => {
    if (!el) return;

    // Clone children once for infinite loop. Re-clone if real children change.
    const originals = Array.from(el.children).filter(
      (child) => !(child as HTMLElement).dataset.autoscrollClone,
    ) as HTMLElement[];
    if (originals.length === 0) return;
    el.querySelectorAll('[data-autoscroll-clone="true"]').forEach((n) => n.remove());

    const clones = originals.map((c) => {
      const clone = c.cloneNode(true) as HTMLElement;
      clone.setAttribute("data-autoscroll-clone", "true");
      clone.setAttribute("aria-hidden", "true");
      return clone;
    });
    clones.forEach((c) => el.appendChild(c));

    const getHalfWidth = () => {
      // Width of one full set of originals = offsetLeft of first clone.
      const firstClone = el.querySelector<HTMLElement>(
        '[data-autoscroll-clone="true"]',
      );
      return firstClone ? firstClone.offsetLeft : el.scrollWidth / 2;
    };

    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const delta = Math.min(now - last, 64);
      last = now;

      const half = getHalfWidth();
      if (half > 0 && el.scrollWidth > el.clientWidth) {
        el.scrollLeft += (speedPxPerSecond * delta) / 1000;
        if (el.scrollLeft >= half) el.scrollLeft -= half;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      el.querySelectorAll('[data-autoscroll-clone="true"]').forEach((n) =>
        n.remove(),
      );
    };
  }, [el, speedPxPerSecond]);

  return ref;
}
