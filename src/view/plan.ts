import type { Space, Vec2 } from '../space/types';
import { compassPoint, occludersOf, type Sun } from '../engine';

export const COL = {
  ground: '#0f0d09',
  floor: '#37322b',
  soil: '#4a3a28',
  wall: '#2c2820',
  glass: '#23415a',
  canopy: 'rgba(52, 84, 54, 0.92)',
  canopyLight: 'rgba(78, 118, 78, 0.55)',
  text: '#ebe3d2',
  dim: '#a89f8c',
  line: '#3a352a',
  accent: '#e9a23a',
  shade: '#6e86b8',
  sage: '#93a77e',
  danger: '#c96a4b',
} as const;

export type Project = (p: Vec2) => Vec2;
/** World metres to screen pixels, for lengths rather than points. */
export type Span = (m: number) => number;

export function pathPoly(ctx: CanvasRenderingContext2D, project: Project, poly: Vec2[]) {
  if (!poly.length) return;
  ctx.beginPath();
  poly.forEach((p, i) => {
    const s = project(p);
    if (i) ctx.lineTo(s.x, s.y);
    else ctx.moveTo(s.x, s.y);
  });
  ctx.closePath();
}

export function fillPoly(ctx: CanvasRenderingContext2D, project: Project, poly: Vec2[], style: string) {
  pathPoly(ctx, project, poly);
  ctx.fillStyle = style;
  ctx.fill();
}

/** Diagonal hatching, clipped to a polygon — reads as "built", not "planted". */
export function hatchPoly(
  ctx: CanvasRenderingContext2D,
  project: Project,
  poly: Vec2[],
  style: string,
  gap = 7,
) {
  if (poly.length < 3) return;
  ctx.save();
  pathPoly(ctx, project, poly);
  ctx.clip();
  const pts = poly.map(project);
  const x0 = Math.min(...pts.map((p) => p.x));
  const x1 = Math.max(...pts.map((p) => p.x));
  const y0 = Math.min(...pts.map((p) => p.y));
  const y1 = Math.max(...pts.map((p) => p.y));
  ctx.strokeStyle = style;
  ctx.lineWidth = 1;
  for (let d = x0 - (y1 - y0); d < x1; d += gap) {
    ctx.beginPath();
    ctx.moveTo(d, y1);
    ctx.lineTo(d + (y1 - y0), y0);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number, style = COL.ground) {
  ctx.fillStyle = style;
  ctx.fillRect(0, 0, w, h);
}

/** A faint metric grid, so distances stay legible while drawing. */
export function drawMetricGrid(
  ctx: CanvasRenderingContext2D,
  project: Project,
  span: Span,
  view: { minX: number; maxX: number; minY: number; maxY: number },
) {
  const px = span(1);
  const step = px < 8 ? 10 : px < 24 ? 5 : 1;
  ctx.save();
  ctx.lineWidth = 1;
  for (let x = Math.floor(view.minX / step) * step; x <= view.maxX; x += step) {
    const major = Math.abs(x % (step * 5)) < 1e-9;
    ctx.strokeStyle = major ? 'rgba(147,167,126,0.16)' : 'rgba(147,167,126,0.07)';
    const a = project({ x, y: view.minY });
    const b = project({ x, y: view.maxY });
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (let y = Math.floor(view.minY / step) * step; y <= view.maxY; y += step) {
    const major = Math.abs(y % (step * 5)) < 1e-9;
    ctx.strokeStyle = major ? 'rgba(147,167,126,0.16)' : 'rgba(147,167,126,0.07)';
    const a = project({ x: view.minX, y });
    const b = project({ x: view.maxX, y });
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawFloor(ctx: CanvasRenderingContext2D, project: Project, space: Space) {
  if (space.boundary.length < 3) return;
  fillPoly(ctx, project, space.boundary, space.type === 'balcony' ? COL.floor : '#3f5235');
}

export function drawObstacles(ctx: CanvasRenderingContext2D, project: Project, space: Space) {
  for (const o of space.obstacles) {
    if (o.footprint.length < 3) continue;
    if (o.solid) {
      fillPoly(ctx, project, o.footprint, '#332d23');
      hatchPoly(ctx, project, o.footprint, 'rgba(147,167,126,0.22)', 8);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1;
      pathPoly(ctx, project, o.footprint);
      ctx.stroke();
    } else {
      fillPoly(ctx, project, o.footprint, COL.canopy);
      ctx.save();
      pathPoly(ctx, project, o.footprint);
      ctx.clip();
      const pts = o.footprint.map(project);
      const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
      const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
      const r = Math.max(...pts.map((p) => Math.hypot(p.x - cx, p.y - cy)));
      ctx.fillStyle = COL.canopyLight;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

export function drawOverhead(ctx: CanvasRenderingContext2D, project: Project, space: Space) {
  if (!space.overhead || space.overhead.footprint.length < 3) return;
  ctx.save();
  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = 'rgba(110,134,184,0.62)';
  ctx.lineWidth = 1.4;
  pathPoly(ctx, project, space.overhead.footprint);
  ctx.stroke();
  ctx.restore();
}

/** Walls as solid strokes, half walls dashed, open edges a thin guide line. */
export function drawWalls(ctx: CanvasRenderingContext2D, project: Project, space: Space) {
  const occ = occludersOf(space).filter((o) => o.kind === 'vertical');
  const n = space.boundary.length;
  if (n < 2) return;

  for (const o of occ) {
    if (o.footprint.length !== 4) continue;
    fillPoly(ctx, project, o.footprint, COL.wall);
  }

  ctx.save();
  for (let i = 0; i < n; i++) {
    const e = space.edges[i];
    const a = project(space.boundary[i]);
    const b = project(space.boundary[(i + 1) % n]);
    const open = !e || e.wall === 'none' || e.height <= 0;

    ctx.setLineDash(e?.wall === 'half' ? [7, 4] : []);
    ctx.strokeStyle = open ? 'rgba(168,159,140,0.5)' : COL.sage;
    ctx.lineWidth = open ? 1 : e?.wall === 'half' ? 2 : 2.6;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawDoors(ctx: CanvasRenderingContext2D, project: Project, space: Space) {
  const n = space.boundary.length;
  for (let i = 0; i < n; i++) {
    const e = space.edges[i];
    if (!e || e.door == null) continue;
    const a = space.boundary[i];
    const b = space.boundary[(i + 1) % n];
    const p = project({ x: a.x + e.door * (b.x - a.x), y: a.y + e.door * (b.y - a.y) });

    ctx.save();
    ctx.strokeStyle = COL.glass;
    ctx.fillStyle = '#2f5878';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COL.shade;
    ctx.stroke();
    ctx.restore();
  }
}

export function drawBoundary(
  ctx: CanvasRenderingContext2D,
  project: Project,
  boundary: Vec2[],
  opts: { closed?: boolean; handles?: boolean; selected?: number } = {},
) {
  if (!boundary.length) return;
  const { closed = true, handles = false, selected = -1 } = opts;
  const pts = boundary.map(project);

  ctx.save();
  ctx.setLineDash([7, 5]);
  ctx.strokeStyle = COL.accent;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  if (closed) ctx.closePath();
  ctx.stroke();
  ctx.restore();

  pts.forEach((p, i) => {
    const on = i === selected;
    ctx.fillStyle = on ? '#f7d9a0' : COL.accent;
    ctx.beginPath();
    ctx.arc(p.x, p.y, handles ? (on ? 6 : 4.5) : 2.6, 0, Math.PI * 2);
    ctx.fill();
    if (handles) {
      ctx.strokeStyle = '#20180a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });
}

export function drawCompassRose(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  bearingRad: number,
  sun?: Sun,
) {
  ctx.save();
  ctx.fillStyle = 'rgba(15,13,9,0.72)';
  ctx.beginPath();
  ctx.arc(cx, cy, r + 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(168,159,140,0.38)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // True north sits at -bearing from the top, because +y on screen is local north.
  const north = -bearingRad;
  ctx.strokeStyle = COL.sage;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(north) * r, cy - Math.cos(north) * r);
  ctx.stroke();

  ctx.font = '600 9px ui-monospace, Menlo, monospace';
  ctx.fillStyle = COL.sage;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', cx + Math.sin(north) * (r + 5), cy - Math.cos(north) * (r + 5));

  if (sun && sun.altDeg > 0) {
    const a = Math.atan2(sun.dir.x, sun.dir.y);
    ctx.fillStyle = COL.accent;
    ctx.beginPath();
    ctx.arc(cx + Math.sin(a) * r, cy - Math.cos(a) * r, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A bar labelled in whole metres, so the drawing has a sense of size. */
export function drawScaleBar(
  ctx: CanvasRenderingContext2D,
  span: Span,
  edge: number,
  y: number,
  align: 'left' | 'right' = 'left',
) {
  const targetPx = 110;
  const nice = [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];
  // Closest to the target rather than the first one past it, or the bar jumps
  // from stubby to half the canvas as you zoom.
  const metres = nice.reduce((best, m) =>
    Math.abs(span(m) - targetPx) < Math.abs(span(best) - targetPx) ? m : best,
  );
  const w = span(metres);
  const x = align === 'right' ? edge - w : edge;

  ctx.save();
  ctx.strokeStyle = 'rgba(235,227,210,0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - 4);
  ctx.lineTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y - 4);
  ctx.stroke();
  ctx.font = '10px ui-monospace, Menlo, monospace';
  ctx.fillStyle = COL.dim;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${metres} m`, x, y - 6);
  ctx.restore();
}

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string = COL.sage,
  size = 10,
) {
  ctx.save();
  ctx.font = `600 ${size}px ui-monospace, Menlo, monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function sunReadout(sun: Sun): string {
  return `${Math.max(0, Math.round(sun.altDeg))}° up · ${Math.round(sun.azDeg)}° ${compassPoint(sun.azDeg)}`;
}
