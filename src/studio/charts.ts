import { COL } from '../view/plan';

export type Rect = { x: number; y: number; w: number; h: number };

/** A value in [lo, hi] onto an axis. `up` flips it so bigger sits higher. */
function toPx(v: number, lo: number, hi: number, base: number, len: number, up = false): number {
  const f = hi === lo ? 0 : (v - lo) / (hi - lo);
  return up ? base + len - f * len : base + f * len;
}

const PLOT_INSET = { left: 38, top: 14, right: 12, bottom: 26 };

function plotRect(outer: Rect): Rect {
  return {
    x: outer.x + PLOT_INSET.left,
    y: outer.y + PLOT_INSET.top,
    w: Math.max(10, outer.w - PLOT_INSET.left - PLOT_INSET.right),
    h: Math.max(10, outer.h - PLOT_INSET.top - PLOT_INSET.bottom),
  };
}

/** Rounds an axis top up to something a person would choose. */
export function niceMax(v: number): number {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  const norm = v / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 4 ? 4 : norm <= 5 ? 5 : 10;
  return step * mag;
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  xTicks: { at: number; label: string }[],
  yMax: number,
  yLabels: (v: number) => string,
  caption: string,
) {
  ctx.save();
  ctx.font = '10px ui-monospace, Menlo, monospace';
  ctx.lineWidth = 1;

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const v = (yMax * i) / 4;
    const py = toPx(v, 0, yMax, r.y, r.h, true);
    ctx.strokeStyle = 'rgba(58,53,42,0.75)';
    ctx.beginPath();
    ctx.moveTo(r.x, py);
    ctx.lineTo(r.x + r.w, py);
    ctx.stroke();
    ctx.fillStyle = COL.dim;
    ctx.fillText(yLabels(v), r.x - 6, py);
  }

  ctx.strokeStyle = COL.line;
  ctx.beginPath();
  ctx.moveTo(r.x, r.y);
  ctx.lineTo(r.x, r.y + r.h);
  ctx.lineTo(r.x + r.w, r.y + r.h);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = COL.dim;
  for (const t of xTicks) ctx.fillText(t.label, r.x + t.at * r.w, r.y + r.h + 6);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = COL.sage;
  ctx.fillText(caption, r.x, r.y - 12);
  ctx.restore();
}

/** One cell's day: lit or shaded, half hour by half hour. */
export function drawDayTrace(
  ctx: CanvasRenderingContext2D,
  series: number[],
  hours: number[],
  outer: Rect,
  caption: string,
) {
  const r = plotRect(outer);
  const first = hours[0] ?? 0;
  const last = hours[hours.length - 1] ?? 24;
  const at = (h: number) => (h - first) / (last - first || 1);

  drawAxes(
    ctx,
    r,
    [6, 9, 12, 15, 18].map((h) => ({ at: at(h), label: `${h}` })),
    1,
    (v) => (v === 0 ? 'shade' : v === 1 ? 'sun' : ''),
    caption,
  );
  if (!series.length) return;

  ctx.save();
  // Blocks rather than a line: the value is a state, not a measurement.
  const bw = r.w / series.length;
  for (let i = 0; i < series.length; i++) {
    if (!series[i]) continue;
    ctx.fillStyle = 'rgba(233,162,58,0.85)';
    ctx.fillRect(r.x + i * bw, r.y, Math.max(1, bw + 0.4), r.h);
  }

  ctx.strokeStyle = COL.accent;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  series.forEach((v, i) => {
    const px = r.x + (i + 0.5) * bw;
    const py = toPx(v, 0, 1, r.y, r.h, true);
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  });
  ctx.stroke();
  ctx.restore();
}

/** How much of the space falls in each light class. */
export function drawLightHistogram(
  ctx: CanvasRenderingContext2D,
  counts: { full: number; partial: number; shade: number },
  cellArea: number,
  outer: Rect,
) {
  const r = plotRect(outer);
  const bars = [
    { key: 'full sun', v: counts.full, c: '#f2b84b' },
    { key: 'partial', v: counts.partial, c: '#c6a45e' },
    { key: 'shade', v: counts.shade, c: '#6e86b8' },
  ];
  // Headroom, so the tallest bar's own label doesn't land on the caption.
  const yMax = niceMax(Math.max(1, ...bars.map((b) => b.v * cellArea)) * 1.12);

  drawAxes(
    ctx,
    r,
    bars.map((b, i) => ({ at: (i + 0.5) / bars.length, label: b.key })),
    yMax,
    (v) => (yMax >= 20 ? v.toFixed(0) : v.toFixed(1)),
    'area by light, m²',
  );

  ctx.save();
  const slot = r.w / bars.length;
  const bw = slot * 0.52;
  ctx.font = '10px ui-monospace, Menlo, monospace';
  bars.forEach((b, i) => {
    const m2 = b.v * cellArea;
    const bx = r.x + i * slot + (slot - bw) / 2;
    const top = toPx(m2, 0, yMax, r.y, r.h, true);
    ctx.fillStyle = b.c;
    ctx.fillRect(bx, top, bw, r.y + r.h - top);
    ctx.fillStyle = COL.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(m2 >= 10 ? m2.toFixed(0) : m2.toFixed(1), bx + bw / 2, top - 3);
  });
  ctx.restore();
}

export function drawChartPlaceholder(ctx: CanvasRenderingContext2D, outer: Rect, text: string) {
  ctx.save();
  ctx.font = '11px ui-monospace, Menlo, monospace';
  ctx.fillStyle = COL.dim;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, outer.x + outer.w / 2, outer.y + outer.h / 2);
  ctx.restore();
}
