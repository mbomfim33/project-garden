import type { Edge, Space } from './types';

export const SCHEMA_VERSION = 2;

type AnySpace = Record<string, unknown>;

/** One step per version bump, each returning the blob at the next version. */
const steps: Record<number, (s: AnySpace) => AnySpace> = {
  // A space used to have at most one roof piece. Real roofs come in parts —
  // a soffit over the back, an eave past the rail — so it became a list.
  1: (s) => {
    const { overhead, ...rest } = s;
    return {
      ...rest,
      overheads: overhead ? [overhead] : (s.overheads ?? []),
      schemaVersion: 2,
    };
  },
};

/** edges[i] describes the segment leaving boundary[i], so the two stay the same length. */
function repairEdges(s: AnySpace): void {
  const n = Array.isArray(s.boundary) ? s.boundary.length : 0;
  // Copy, don't repair in place: the caller still owns the object we were handed.
  s.edges = Array.isArray(s.edges) ? [...s.edges] : [];
  const edges = s.edges as Edge[];
  while (edges.length < n) edges.push({ wall: 'none', height: 0 });
  edges.length = n;
}

function migrateNode(raw: AnySpace): AnySpace {
  let s: AnySpace = { ...raw };
  let v = typeof s.schemaVersion === 'number' ? s.schemaVersion : 1;

  while (v < SCHEMA_VERSION) {
    const step = steps[v];
    if (!step) throw new Error(`No migration from schema v${v}`);
    s = step(s);
    v = s.schemaVersion as number;
  }
  if (v > SCHEMA_VERSION) {
    throw new Error(`Space schema v${v} is newer than this build`);
  }

  s.schemaVersion = SCHEMA_VERSION;
  if (!Array.isArray(s.boundary)) s.boundary = [];
  if (!Array.isArray(s.obstacles)) s.obstacles = [];
  if (!Array.isArray(s.overheads)) s.overheads = [];
  if (typeof s.geo !== 'object' || s.geo === null) s.geo = { lat: -23.5, bearing: 0 };
  repairEdges(s);
  return s;
}

export function migrate(raw: unknown): Space {
  return migrateNode(raw as AnySpace) as unknown as Space;
}
