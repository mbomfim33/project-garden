import type { Space, Vec2 } from '../space/types';
import { area, centroid, occludersOf } from '../engine';
import type { Viewport } from '../view/viewport';
import {
  COL,
  type Project,
  drawBoundary,
  drawDoors,
  drawFloor,
  drawGround,
  drawMetricGrid,
  drawObstacles,
  drawOverhead,
  drawScaleBar,
  drawWalls,
  drawCompassRose,
  drawLabel,
  pathPoly,
} from '../view/plan';
import { cachedImage, drawBaseLayer } from '../view/baseImage';
import type { Snap } from './snap';
import { type Tool, rectFootprint } from './tools';

export type EditorScene = {
  space: Space;
  closed: boolean;
  tool: Tool;
  vp: Viewport;
  width: number;
  height: number;
  /** Vertices being laid down before the shape is closed. */
  draft: Vec2[];
  hoverPoint: Vec2 | null;
  snapCue: Snap | null;
  selectedVertex: number;
  selectedEdge: number;
  selectedObstacle: number;
  calibrationLine: [Vec2, Vec2] | null;
  /** Rectangle being dragged out, before it's committed. */
  pendingRect: [Vec2, Vec2] | null;
};

export function drawEditor(
  ctx: CanvasRenderingContext2D,
  scene: EditorScene,
  onImageReady?: () => void,
) {
  const { space, vp, width, height } = scene;
  const project: Project = (p) => vp.worldToScreen(p);
  const span = (m: number) => vp.metresToPx(m);

  drawGround(ctx, width, height);

  const topLeft = vp.screenToWorld(0, 0);
  const bottomRight = vp.screenToWorld(width, height);
  drawMetricGrid(ctx, project, span, {
    minX: Math.min(topLeft.x, bottomRight.x),
    maxX: Math.max(topLeft.x, bottomRight.x),
    minY: Math.min(topLeft.y, bottomRight.y),
    maxY: Math.max(topLeft.y, bottomRight.y),
  });

  if (space.base) {
    const img = cachedImage(space.base.dataUrl, onImageReady);
    if (img) drawBaseLayer(ctx, img, space.base.calibration, project, span, 0.92);
  }

  if (scene.closed && space.boundary.length >= 3) {
    if (!space.base) drawFloor(ctx, project, space);
    drawObstacles(ctx, project, space);
    drawWalls(ctx, project, space);
    drawOverhead(ctx, project, space);
    drawDoors(ctx, project, space);
  } else if (space.boundary.length) {
    drawObstacles(ctx, project, space);
  }

  drawWallHeights(ctx, project, space, scene);
  drawSelectedEdge(ctx, project, space, scene.selectedEdge);
  drawSelectedObstacle(ctx, project, space, scene.selectedObstacle);

  drawBoundary(ctx, project, space.boundary, {
    closed: scene.closed,
    handles: true,
    selected: scene.selectedVertex,
  });

  if (!scene.closed) drawDraftTail(ctx, project, scene);
  if (scene.pendingRect) drawPendingRect(ctx, project, scene.pendingRect, scene.tool);
  if (scene.snapCue) drawSnapCue(ctx, project, scene.snapCue);
  if (scene.calibrationLine) drawCalibrationLine(ctx, project, scene.calibrationLine);

  drawCompassRose(ctx, width - 38, 38, 18, space.geo.bearing ?? 0);
  drawScaleBar(ctx, span, width - 18, height - 16, 'right');

  if (scene.closed && space.boundary.length >= 3) {
    const c = space.boundary.map(project);
    const cx = c.reduce((a, p) => a + p.x, 0) / c.length;
    const cy = c.reduce((a, p) => a + p.y, 0) / c.length;
    drawLabel(ctx, cx, cy, `${area(space.boundary).toFixed(1)} m²`, 'rgba(235,227,210,0.5)', 12);
  }
}

/** A number beside every wall, so heights are visible without clicking around. */
function drawWallHeights(
  ctx: CanvasRenderingContext2D,
  project: Project,
  space: Space,
  scene: EditorScene,
) {
  if (!scene.closed) return;
  const n = space.boundary.length;
  if (n < 3) return;
  const mid = centroid(space.boundary.map(project));

  for (let i = 0; i < n; i++) {
    const e = space.edges[i];
    if (!e || e.wall === 'none' || e.height <= 0) continue;
    const a = project(space.boundary[i]);
    const b = project(space.boundary[(i + 1) % n]);
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;

    // Push the label off the line, away from the middle, so it doesn't sit on
    // the wall it's labelling.
    let nx = cx - mid.x;
    let ny = cy - mid.y;
    const len = Math.hypot(nx, ny) || 1;
    nx = (nx / len) * 13;
    ny = (ny / len) * 13;

    const label = e.wall === 'half' ? `${(e.height / 2).toFixed(1)}m` : `${e.height.toFixed(1)}m`;
    drawLabel(ctx, cx + nx, cy + ny, label, COL.sage, 9);
  }
}

function drawSelectedEdge(
  ctx: CanvasRenderingContext2D,
  project: Project,
  space: Space,
  index: number,
) {
  const n = space.boundary.length;
  if (index < 0 || index >= n) return;
  const a = project(space.boundary[index]);
  const b = project(space.boundary[(index + 1) % n]);
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();
}

function drawSelectedObstacle(
  ctx: CanvasRenderingContext2D,
  project: Project,
  space: Space,
  index: number,
) {
  const o = space.obstacles[index];
  if (!o || o.footprint.length < 3) return;
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.7;
  pathPoly(ctx, project, o.footprint);
  ctx.stroke();
  ctx.restore();
}

/** The rubber-band segment from the last placed corner to the pointer. */
function drawDraftTail(ctx: CanvasRenderingContext2D, project: Project, scene: EditorScene) {
  const last = scene.space.boundary[scene.space.boundary.length - 1];
  if (!last || !scene.hoverPoint) return;
  const a = project(last);
  const b = project(scene.hoverPoint);
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(233,162,58,0.6)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();

  const metres = Math.hypot(scene.hoverPoint.x - last.x, scene.hoverPoint.y - last.y);
  drawLabel(ctx, (a.x + b.x) / 2, (a.y + b.y) / 2 - 10, `${metres.toFixed(2)} m`, COL.accent, 10);
}

function drawSnapCue(ctx: CanvasRenderingContext2D, project: Project, cue: Snap) {
  const p = project(cue.p);
  ctx.save();
  if (cue.kind === 'vertex') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    ctx.stroke();
  } else if (cue.kind === 'angle' && cue.ref) {
    const r = project(cue.ref);
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = 'rgba(147,167,126,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = COL.sage;
    ctx.strokeRect(p.x - 4, p.y - 4, 8, 8);
  } else {
    ctx.fillStyle = 'rgba(147,167,126,0.9)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPendingRect(
  ctx: CanvasRenderingContext2D,
  project: Project,
  drag: [Vec2, Vec2],
  tool: Tool,
) {
  const poly = rectFootprint(drag[0], drag[1]);
  ctx.save();
  ctx.setLineDash(tool === 'overhead' ? [6, 5] : []);
  ctx.strokeStyle = tool === 'overhead' ? 'rgba(110,134,184,0.9)' : COL.sage;
  ctx.fillStyle = tool === 'overhead' ? 'rgba(110,134,184,0.14)' : 'rgba(147,167,126,0.16)';
  ctx.lineWidth = 1.6;
  pathPoly(ctx, project, poly);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const w = Math.abs(drag[1].x - drag[0].x);
  const h = Math.abs(drag[1].y - drag[0].y);
  const c = poly.map(project);
  drawLabel(
    ctx,
    (c[0].x + c[2].x) / 2,
    (c[0].y + c[2].y) / 2,
    `${w.toFixed(1)} × ${h.toFixed(1)} m`,
    COL.text,
    10,
  );
}

function drawCalibrationLine(
  ctx: CanvasRenderingContext2D,
  project: Project,
  line: [Vec2, Vec2],
) {
  const a = project(line[0]);
  const b = project(line[1]);
  ctx.save();
  ctx.strokeStyle = '#f2b84b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  for (const p of [a, b]) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#20180a';
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** Which walls the engine will actually raise — useful when a height looks wrong. */
export function wallCount(space: Space): number {
  return occludersOf(space).filter((o) => o.kind === 'vertical').length;
}
