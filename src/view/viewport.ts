import type { Space, Vec2 } from '../space/types';
import { type T, makeT, toWorld } from './transform';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 12;

/** Layers user pan and zoom over the fitted transform. */
export class Viewport {
  T: T;
  panX = 0;
  panY = 0;
  zoom = 1;

  constructor(space: Space, CW: number, CH: number) {
    this.T = makeT(space, CW, CH);
  }

  refit(space: Space, CW: number, CH: number) {
    this.T = makeT(space, CW, CH);
  }

  reset() {
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
  }

  worldToScreen(p: Vec2): Vec2 {
    return {
      x: this.panX + this.zoom * this.T.X(p.x),
      y: this.panY + this.zoom * this.T.Y(p.y),
    };
  }

  screenToWorld(sx: number, sy: number): Vec2 {
    return toWorld(this.T, (sx - this.panX) / this.zoom, (sy - this.panY) / this.zoom);
  }

  /** A length on screen to a length in metres — for pick and snap radii. */
  pxToMetres(lenPx: number): number {
    return lenPx / (this.zoom * this.T.scale);
  }

  metresToPx(m: number): number {
    return m * this.zoom * this.T.scale;
  }

  panBy(dx: number, dy: number) {
    this.panX += dx;
    this.panY += dy;
  }

  /** Zoom about a screen point, so whatever is under the cursor stays put. */
  zoomAt(anchor: Vec2, factor: number) {
    const before = this.screenToWorld(anchor.x, anchor.y);
    this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom * factor));
    const after = this.worldToScreen(before);
    this.panX += anchor.x - after.x;
    this.panY += anchor.y - after.y;
  }
}
