export const MAX_DPR = 2;

export function dpr(): number {
  return Math.min(globalThis.devicePixelRatio || 1, MAX_DPR);
}

/**
 * Sizes the backing store to CSS pixels x dpr and scales the context to match,
 * so every draw call can keep working in CSS pixels. Returns whether the buffer
 * was actually resized.
 */
export function fitCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
): boolean {
  const ratio = dpr();
  const bw = Math.max(1, Math.round(cssW * ratio));
  const bh = Math.max(1, Math.round(cssH * ratio));
  const changed = canvas.width !== bw || canvas.height !== bh;
  if (changed) {
    // Assigning width or height wipes the context, transform included.
    canvas.width = bw;
    canvas.height = bh;
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return changed;
}

/** Watches the element's box and calls back with CSS pixel dimensions. */
export function observeSize(
  el: HTMLElement,
  onResize: (cssW: number, cssH: number) => void,
): () => void {
  const apply = () => {
    const rect = el.getBoundingClientRect();
    onResize(Math.max(1, Math.round(rect.width)), Math.max(1, Math.round(rect.height)));
  };
  const ro = new ResizeObserver(apply);
  ro.observe(el);
  apply();
  return () => ro.disconnect();
}
