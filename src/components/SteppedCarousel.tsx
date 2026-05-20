import { ReactNode, useEffect, useRef, useState } from "react";

interface Props {
  items: ReactNode[];
  dwellMs?: number;
  transitionMs?: number;
  gapClass?: string;
  className?: string;
  trackClassName?: string;
}

/**
 * Steps through cards one at a time with a dwell pause between moves.
 * Pauses on hover/touch. Loops seamlessly by rendering items twice.
 */
export default function SteppedCarousel({
  items,
  dwellMs = 2500,
  transitionMs = 700,
  gapClass = "gap-3",
  className = "",
  trackClassName = "",
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [animate, setAnimate] = useState(true);
  const pausedRef = useRef(false);

  // Advance one card on a timer
  useEffect(() => {
    if (!items.length) return;
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      setIndex((i) => i + 1);
    }, dwellMs + transitionMs);
    return () => window.clearInterval(id);
  }, [items.length, dwellMs, transitionMs]);

  // Measure offset to center the (index)-th child in the viewport
  useEffect(() => {
    const track = trackRef.current;
    const viewport = track?.parentElement;
    if (!track || !viewport || !items.length) return;
    const children = Array.from(track.children) as HTMLElement[];
    const target = children[index];
    if (!target) return;
    const centerOffset =
      target.offsetLeft - (viewport.clientWidth - target.offsetWidth) / 2;
    setAnimate(true);
    setOffset(centerOffset);

    // Seamless loop: when we reach the start of the second copy, snap back
    if (index >= items.length) {
      const t = window.setTimeout(() => {
        const first = children[0];
        const startOffset = first
          ? first.offsetLeft - (viewport.clientWidth - first.offsetWidth) / 2
          : 0;
        setAnimate(false);
        setOffset(startOffset);
        setIndex(0);
        // re-enable animation on next frame
        requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
      }, transitionMs + 20);
      return () => window.clearTimeout(t);
    }
  }, [index, items.length, transitionMs]);

  const pause = () => (pausedRef.current = true);
  const resume = () => (pausedRef.current = false);

  return (
    <div
      className={`overflow-hidden ${className}`}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onTouchStart={pause}
      onTouchEnd={resume}
    >
      <div
        ref={trackRef}
        className={`flex w-max ${gapClass} ${trackClassName}`}
        style={{
          transform: `translate3d(${-offset}px, 0, 0)`,
          transition: animate ? `transform ${transitionMs}ms ease-in-out` : "none",
        }}
      >
        {[...items, ...items].map((node, i) => (
          <div key={i} className="shrink-0">
            {node}
          </div>
        ))}
      </div>
    </div>
  );
}
