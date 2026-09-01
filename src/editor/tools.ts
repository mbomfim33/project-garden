import type { Obstacle, Overhead, Vec2 } from '../space/types';
import { circlePoly } from '../engine';

export type Tool =
  | 'select'
  | 'draw'
  | 'insert'
  | 'wall'
  | 'door'
  | 'box'
  | 'tree'
  | 'overhead'
  | 'calibrate';

export const TOOL_HINT: Record<Tool, string> = {
  select: 'Drag a corner to move it. Tap one to remove it.',
  draw: 'Click to drop corners. Click the first one again, or press Enter, to close the shape.',
  insert: 'Click a wall to add a corner on it.',
  wall: 'Click an edge to cycle full wall, half wall, open. Set its height on the right.',
  door: 'Click an edge to put a door on it, then drag the marker along.',
  box: 'Drag out a rectangle for a shed, a raised bed or a neighbouring wall.',
  tree: 'Click where the trunk is. Set the canopy radius and height on the right.',
  overhead: 'Drag out the slab above you — a soffit, a pergola, the balcony upstairs.',
  calibrate: 'Drag a line along something whose length you know, then type the length.',
};

/** Which tools need a closed boundary before they mean anything. */
export const NEEDS_SHAPE: Tool[] = ['insert', 'wall', 'door', 'box', 'tree', 'overhead'];

export function rectFootprint(p0: Vec2, p1: Vec2): Vec2[] {
  const x0 = Math.min(p0.x, p1.x);
  const x1 = Math.max(p0.x, p1.x);
  const y0 = Math.min(p0.y, p1.y);
  const y1 = Math.max(p0.y, p1.y);
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

export function makeBox(p0: Vec2, p1: Vec2, height: number, label = 'Structure'): Obstacle {
  return { footprint: rectFootprint(p0, p1), height, solid: true, label };
}

/** A tree casts shade but you can still plant under it, so it isn't solid. */
export function makeTree(centre: Vec2, radius: number, height: number): Obstacle {
  return {
    footprint: circlePoly(centre.x, centre.y, radius, 14),
    height,
    solid: false,
    label: 'Tree',
  };
}

export function makeOverhead(p0: Vec2, p1: Vec2, clearance: number): Overhead {
  return { footprint: rectFootprint(p0, p1), height: clearance };
}

/** Compass dial: pointer offset to a bearing clockwise from north. */
export function bearingFromPointer(mx: number, my: number, cx: number, cy: number): number {
  const b = Math.atan2(mx - cx, -(my - cy));
  return b < 0 ? b + 2 * Math.PI : b;
}
