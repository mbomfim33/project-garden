import type { Space, Vec2 } from '../space/types';
import { type Grid, type ShadowMask, type Sun, pip } from '../engine';
import type { T } from '../view/transform';
import {
  COL,
  type Project,
  drawBoundary,
  drawDoors,
  drawFloor,
  drawObstacles,
  drawOverheads,
  drawWalls,
  pathPoly,
} from '../view/plan';
import { cachedImage, drawBaseLayer } from '../view/baseImage';

export type Mode = 'live' | 'summer' | 'winter';

/** Shade to full sun. */
const RAMP = ['#3a4d72', '#6e86b8', '#c6a45e', '#f2b84b'];

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

function mix(a: string, b: string, f: number): string {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${A.map((c, i) => Math.round(c + (B[i] - c) * f)).join(',')})`;
}

export function ramp(f: number): string {
  const clamped = Math.max(0, Math.min(1, f));
  const seg = clamped * (RAMP.length - 1);
  const i = Math.min(Math.floor(seg), RAMP.length - 2);
  return mix(RAMP[i], RAMP[i + 1], seg - i);
}

export const LIT = '#f2b84b';
export const UNLIT = '#2c3550';

const project = (T: T): Project => (p) => ({ x: T.X(p.x), y: T.Y(p.y) });

export function drawPlanBase(
  ctx: CanvasRenderingContext2D,
  T: T,
  space: Space,
  onImageReady?: () => void,
) {
  const to = project(T);
  if (space.base) {
    const img = cachedImage(space.base.dataUrl, onImageReady);
    if (img) drawBaseLayer(ctx, img, space.base.calibration, to, T.S, 0.85);
  } else {
    drawFloor(ctx, to, space);
  }
  drawObstacles(ctx, to, space);
}

export function drawStructures(ctx: CanvasRenderingContext2D, T: T, space: Space) {
  const to = project(T);
  drawWalls(ctx, to, space);
  drawOverheads(ctx, to, space);
  drawDoors(ctx, to, space);
  drawBoundary(ctx, to, space.boundary);
}

export function drawShadows(ctx: CanvasRenderingContext2D, T: T, masks: ShadowMask[]) {
  const to = project(T);
  ctx.save();
  ctx.fillStyle = 'rgba(20,22,30,0.32)';
  for (const m of masks) {
    pathPoly(ctx, to, m.poly);
    ctx.fill();
  }
  ctx.restore();
}

export type GridPaint = {
  mode: Mode;
  masks: ShadowMask[];
  sunUp: boolean;
  /**
   * Both seasonal maps share one scale, so flipping between them shows the
   * difference instead of two independently stretched pictures.
   */
  maxHours: number;
  hovered: number;
};

export function paintGrid(ctx: CanvasRenderingContext2D, T: T, grid: Grid, paint: GridPaint) {
  const cs = grid.cellSize;
  const half = cs / 2;
  const w = T.S(cs) + 0.6;
  const hours = paint.mode === 'winter' ? grid.sunHoursWinter : grid.sunHoursSummer;

  for (let i = 0; i < grid.inside.length; i++) {
    if (!grid.inside[i]) continue;
    const col = i % grid.cols;
    const row = (i - col) / grid.cols;
    const cx = grid.minX + (col + 0.5) * cs;
    const cy = grid.minY + (row + 0.5) * cs;

    ctx.fillStyle =
      paint.mode === 'live'
        ? paint.sunUp && !shaded(cx, cy, paint.masks)
          ? LIT
          : UNLIT
        : ramp(hours[i] / paint.maxHours);

    ctx.fillRect(T.X(cx - half), T.Y(cy + half), w, w);
  }

  if (paint.hovered >= 0 && grid.inside[paint.hovered]) {
    const col = paint.hovered % grid.cols;
    const row = (paint.hovered - col) / grid.cols;
    const cx = grid.minX + (col + 0.5) * cs;
    const cy = grid.minY + (row + 0.5) * cs;
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(T.X(cx - half), T.Y(cy + half), T.S(cs), T.S(cs));
    ctx.restore();
  }
}

function shaded(x: number, y: number, masks: ShadowMask[]): boolean {
  for (const m of masks) {
    if (x < m.minX || x > m.maxX || y < m.minY || y > m.maxY) continue;
    if (pip(x, y, m.poly)) return true;
  }
  return false;
}

/**
 * Where a sun of this altitude sits on the plan: out at the rim on the horizon,
 * drawn in toward the middle as it climbs. Without the altitude term, a sun that
 * crosses the zenith — which it does every tropical summer — swings azimuth by
 * half a turn instantly and the path draws a spike.
 */
function skyRadius(CW: number, CH: number, alt: number): number {
  const outer = Math.min(CW, CH) * 0.47;
  const inner = outer * 0.62;
  return inner + (outer - inner) * Math.cos(Math.max(0, alt));
}

/** The sun disc, over the plan in screen space. */
export function drawSunGlyph(ctx: CanvasRenderingContext2D, CW: number, CH: number, T: T, sun: Sun) {
  const r = skyRadius(CW, CH, sun.alt);
  const px = T.cx + sun.dir.x * r;
  const py = T.cy - sun.dir.y * r;

  ctx.save();
  const glow = ctx.createRadialGradient(px, py, 0, px, py, 40);
  glow.addColorStop(0, 'rgba(233,162,58,0.85)');
  glow.addColorStop(1, 'rgba(233,162,58,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(px, py, 40, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(233,162,58,0.5)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(a) * 12, py + Math.sin(a) * 12);
    ctx.lineTo(px + Math.cos(a) * 18, py + Math.sin(a) * 18);
    ctx.stroke();
  }
  ctx.fillStyle = COL.accent;
  ctx.beginPath();
  ctx.arc(px, py, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export type SkyPoint = { dir: Vec2; alt: number };

/** The day's whole arc, so you can see where the sun has been and where it's going. */
export function drawSunPath(
  ctx: CanvasRenderingContext2D,
  CW: number,
  CH: number,
  T: T,
  path: SkyPoint[],
) {
  if (path.length < 2) return;
  ctx.save();
  ctx.setLineDash([2, 6]);
  ctx.strokeStyle = 'rgba(233,162,58,0.32)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  path.forEach((s, i) => {
    const r = skyRadius(CW, CH, s.alt);
    const px = T.cx + s.dir.x * r;
    const py = T.cy - s.dir.y * r;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  });
  ctx.stroke();
  ctx.restore();
}
