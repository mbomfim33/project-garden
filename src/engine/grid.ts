import type { Cell, Space, SpaceType, Vec2 } from '../space/types';
import { bounds, pip } from './geom';
import { maskOf, occludersOf, shadowOf } from './occluders';
import { microclimate } from './microclimate';
import { seasonsFor, sunAt } from './solar';

export const HOUR_STEP = 0.5;
export const HOUR_START = 0;
export const HOUR_END = 24;

/** Inclusive of both ends, which is one more than the number of steps. */
export const SAMPLES = Math.round((HOUR_END - HOUR_START) / HOUR_STEP) + 1;

export const DEFAULT_CELL_SIZE: Record<SpaceType, number> = {
  balcony: 0.25,
  garden: 0.5,
  land: 1,
};

/** Past this the sweep gets slow enough to feel, so coarsen instead. */
const MAX_CELLS = 24_000;

export type Grid = {
  cols: number;
  rows: number;
  cellSize: number;
  minX: number;
  minY: number;
  /** 1 where a cell is usable: inside the boundary and not under something solid. */
  inside: Uint8Array;
  sunHoursSummer: Float32Array;
  sunHoursWinter: Float32Array;
  /** Lit or not, per sample, on the summer day. Indexed i * SAMPLES + h. */
  hourly: Float32Array;
  hours: Float64Array;
  nearWall: Float32Array;
  wind: Float32Array;
  access: Float32Array;
};

export function lightClass(summerHours: number): Cell['light'] {
  if (summerHours >= 6) return 'full';
  if (summerHours >= 3) return 'partial';
  return 'shade';
}

/** Coarsens the cell size until the sweep stays a reasonable size. */
export function resolveCellSize(space: Space, requested?: number): number {
  let size = requested ?? DEFAULT_CELL_SIZE[space.type];
  if (space.boundary.length < 3) return size;
  const b = bounds(space.boundary);
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  while ((w / size) * (h / size) > MAX_CELLS) size *= 2;
  return size;
}

/** How many cells the sweep would cover, without laying any of them out. */
export function estimateCells(space: Space, cellSize?: number): number {
  if (space.boundary.length < 3) return 0;
  const size = resolveCellSize(space, cellSize);
  const b = bounds(space.boundary);
  return Math.ceil((b.maxX - b.minX) / size) * Math.ceil((b.maxY - b.minY) / size);
}

function emptyGrid(cellSize: number): Grid {
  return {
    cols: 0,
    rows: 0,
    cellSize,
    minX: 0,
    minY: 0,
    inside: new Uint8Array(0),
    sunHoursSummer: new Float32Array(0),
    sunHoursWinter: new Float32Array(0),
    hourly: new Float32Array(0),
    hours: new Float64Array(0),
    nearWall: new Float32Array(0),
    wind: new Float32Array(0),
    access: new Float32Array(0),
  };
}

/**
 * Sweeps three representative days at half-hour steps, projecting every
 * occluder's shadow and banking half an hour of sun onto each cell it misses.
 */
export function buildGridSeries(space: Space, requestedCellSize?: number): Grid {
  const cellSize = resolveCellSize(space, requestedCellSize);
  if (space.boundary.length < 3) return emptyGrid(cellSize);

  const latRad = space.geo.lat * (Math.PI / 180);
  const bearingRad = space.geo.bearing ?? 0;
  const occluders = occludersOf(space);
  const solids = occluders.filter((o) => o.solid);

  const b = bounds(space.boundary);
  const cols = Math.max(1, Math.ceil((b.maxX - b.minX) / cellSize));
  const rows = Math.max(1, Math.ceil((b.maxY - b.minY) / cellSize));
  const n = cols * rows;
  const worldDiag = Math.hypot(b.maxX - b.minX, b.maxY - b.minY);

  const inside = new Uint8Array(n);
  const sunHoursSummer = new Float32Array(n);
  const sunHoursWinter = new Float32Array(n);
  const hourly = new Float32Array(n * SAMPLES);
  const hours = new Float64Array(SAMPLES);
  const nearWall = new Float32Array(n);
  const wind = new Float32Array(n);
  const access = new Float32Array(n);

  // Cell centres, laid out once and reused by every timestep.
  const cx = new Float64Array(n);
  const cy = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = (i - col) / cols;
    cx[i] = b.minX + (col + 0.5) * cellSize;
    cy[i] = b.minY + (row + 0.5) * cellSize;
  }

  for (let i = 0; i < n; i++) {
    if (!pip(cx[i], cy[i], space.boundary)) continue;
    if (solids.some((o) => pip(cx[i], cy[i], o.footprint))) continue;
    inside[i] = 1;
  }

  for (let h = 0; h < SAMPLES; h++) hours[h] = HOUR_START + h * HOUR_STEP;

  for (const season of seasonsFor(space.geo.lat)) {
    const isSummer = season.key === 'summer';
    const isWinter = season.key === 'winter';
    if (!isSummer && !isWinter) continue;

    for (let h = 0; h < SAMPLES; h++) {
      const s = sunAt(season.day, hours[h], latRad, bearingRad);
      if (s.alt <= 0) continue;

      const masks = occluders.map((o) => maskOf(shadowOf(o, s, worldDiag)));

      for (let i = 0; i < n; i++) {
        if (!inside[i]) continue;
        const x = cx[i];
        const y = cy[i];

        let lit = true;
        for (const m of masks) {
          if (x < m.minX || x > m.maxX || y < m.minY || y > m.maxY) continue;
          if (pip(x, y, m.poly)) {
            lit = false;
            break;
          }
        }
        if (!lit) continue;

        if (isSummer) {
          sunHoursSummer[i] += HOUR_STEP;
          hourly[i * SAMPLES + h] = 1;
        } else {
          sunHoursWinter[i] += HOUR_STEP;
        }
      }
    }
  }

  for (let i = 0; i < n; i++) {
    if (!inside[i]) continue;
    const m = microclimate({ x: cx[i], y: cy[i] }, space);
    nearWall[i] = m.nearWall;
    wind[i] = m.wind;
    access[i] = m.access;
  }

  return {
    cols,
    rows,
    cellSize,
    minX: b.minX,
    minY: b.minY,
    inside,
    sunHoursSummer,
    sunHoursWinter,
    hourly,
    hours,
    nearWall,
    wind,
    access,
  };
}

export function cellCentre(g: Grid, i: number): Vec2 {
  const col = i % g.cols;
  const row = (i - col) / g.cols;
  return { x: g.minX + (col + 0.5) * g.cellSize, y: g.minY + (row + 0.5) * g.cellSize };
}

export function cellAt(g: Grid, i: number): Cell {
  return {
    pos: cellCentre(g, i),
    sunHours: { summer: g.sunHoursSummer[i], winter: g.sunHoursWinter[i] },
    light: lightClass(g.sunHoursSummer[i]),
    nearWall: g.nearWall[i],
    wind: g.wind[i],
    access: g.access[i],
  };
}

/** One cell's lit-or-not trace across the summer day. */
export function cellHourly(g: Grid, i: number): number[] {
  const out: number[] = [];
  for (let h = 0; h < SAMPLES; h++) out.push(g.hourly[i * SAMPLES + h]);
  return out;
}

export function indexAt(g: Grid, p: Vec2): number {
  const col = Math.floor((p.x - g.minX) / g.cellSize);
  const row = Math.floor((p.y - g.minY) / g.cellSize);
  if (col < 0 || col >= g.cols || row < 0 || row >= g.rows) return -1;
  return row * g.cols + col;
}

export type GridSummary = {
  usable: number;
  areaM2: number;
  full: number;
  partial: number;
  shade: number;
  minSummer: number;
  maxSummer: number;
  meanSummer: number;
  meanWinter: number;
};

export function summarise(g: Grid): GridSummary {
  let usable = 0;
  let full = 0;
  let partial = 0;
  let shade = 0;
  let sumS = 0;
  let sumW = 0;
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < g.inside.length; i++) {
    if (!g.inside[i]) continue;
    usable++;
    const s = g.sunHoursSummer[i];
    sumS += s;
    sumW += g.sunHoursWinter[i];
    if (s < min) min = s;
    if (s > max) max = s;
    const c = lightClass(s);
    if (c === 'full') full++;
    else if (c === 'partial') partial++;
    else shade++;
  }

  return {
    usable,
    areaM2: usable * g.cellSize * g.cellSize,
    full,
    partial,
    shade,
    minSummer: usable ? min : 0,
    maxSummer: usable ? max : 0,
    meanSummer: usable ? sumS / usable : 0,
    meanWinter: usable ? sumW / usable : 0,
  };
}
