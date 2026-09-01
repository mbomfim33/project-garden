import type { BaseImage, Calibration } from '../space/types';
import type { Project, Span } from './plan';

/** Long edge cap before re-encoding, to stay inside the storage budget. */
export const MAX_EDGE_PX = 1600;

export function decodeImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That file could not be read as an image.'));
    img.src = url;
  });
}

export type LoadedImage = { dataUrl: string; img: HTMLImageElement; widthPx: number; heightPx: number };

/**
 * A picked or dropped file becomes a data URL we can persist plus a decoded
 * image we can draw. Anything large is re-encoded smaller first — a phone photo
 * on its own will blow the whole storage budget.
 */
export async function fileToBaseImage(file: File, maxEdgePx = MAX_EDGE_PX): Promise<LoadedImage> {
  const rawUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error ?? new Error('Could not read that file.'));
    fr.readAsDataURL(file);
  });

  const img = await decodeImage(rawUrl);
  const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
  if (longEdge <= maxEdgePx) {
    return { dataUrl: rawUrl, img, widthPx: img.naturalWidth, heightPx: img.naturalHeight };
  }

  const k = maxEdgePx / longEdge;
  const w = Math.round(img.naturalWidth * k);
  const h = Math.round(img.naturalHeight * k);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  off.getContext('2d')!.drawImage(img, 0, 0, w, h);
  const dataUrl = off.toDataURL('image/jpeg', 0.82);
  return { dataUrl, img: await decodeImage(dataUrl), widthPx: w, heightPx: h };
}

const cache = new Map<string, HTMLImageElement>();
const pending = new Set<string>();

/**
 * Returns the decoded image if it's ready, otherwise starts decoding and calls
 * back so the canvas can repaint once it arrives.
 */
export function cachedImage(dataUrl: string, onReady?: () => void): HTMLImageElement | null {
  const hit = cache.get(dataUrl);
  if (hit) return hit;
  if (pending.has(dataUrl)) return null;
  pending.add(dataUrl);
  decodeImage(dataUrl)
    .then((img) => {
      cache.set(dataUrl, img);
      onReady?.();
    })
    .catch(() => undefined)
    .finally(() => pending.delete(dataUrl));
  return null;
}

/**
 * Places the traced image under the plan.
 *
 * drawImage can only fill an axis-aligned rectangle, so instead of positioning
 * corners by hand we build the one matrix that maps every image pixel to where
 * the calibration says it belongs, and let the canvas do the rest. Placing
 * corners looks like it works until the image is rotated, at which point the
 * corner deltas are diagonals rather than side lengths.
 */
export function drawBaseLayer(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cal: Calibration,
  project: Project,
  span: Span,
  alpha = 0.9,
) {
  const m = span(cal.metresPerPixel);
  const c = cal.rotationRad ? Math.cos(cal.rotationRad) : 1;
  const s = cal.rotationRad ? Math.sin(cal.rotationRad) : 0;

  const a = m * c;
  const b = -m * s;
  const cc = m * s;
  const d = m * c;

  const origin = project({ x: 0, y: 0 });
  const e = origin.x - (a * cal.originPx.x + cc * cal.originPx.y);
  const f = origin.y - (b * cal.originPx.x + d * cal.originPx.y);

  ctx.save();
  ctx.globalAlpha = alpha;
  // transform, not setTransform: the device-pixel scale is already on the matrix.
  ctx.transform(a, b, cc, d, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

/** Before there's a calibration, just fit the image to the stage so it can be seen. */
export function containFit(
  base: Pick<BaseImage, 'widthPx' | 'heightPx'>,
  cssW: number,
  cssH: number,
) {
  const scale = Math.min(cssW / base.widthPx, cssH / base.heightPx);
  return {
    scale,
    offsetX: (cssW - base.widthPx * scale) / 2,
    offsetY: (cssH - base.heightPx * scale) / 2,
  };
}
