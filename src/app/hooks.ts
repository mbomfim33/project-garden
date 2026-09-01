import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A frame loop that only exists while it's wanted. The callback is held in a
 * ref so the loop always calls the freshest closure without being restarted,
 * and the cleanup matters: without it StrictMode leaves two loops racing and
 * everything runs at double speed.
 */
export function useAnimationFrame(onFrame: (dt: number) => void, active: boolean) {
  const cb = useRef(onFrame);
  useEffect(() => {
    cb.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last: number | null = null;
    const loop = (ts: number) => {
      if (last == null) last = ts;
      const dt = (ts - last) / 1000;
      last = ts;
      cb.current(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** Element size in CSS pixels, kept current without a window resize listener. */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const measure = useCallback((el: T) => {
    const r = el.getBoundingClientRect();
    setSize((prev) => {
      const width = Math.max(1, Math.round(r.width));
      const height = Math.max(1, Math.round(r.height));
      return prev.width === width && prev.height === height ? prev : { width, height };
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure(el));
    ro.observe(el);
    measure(el);
    return () => ro.disconnect();
  }, [measure]);

  return { ref, ...size };
}
