/**
 * Local metres. +x east, +y north. The canvas transform flips y so north is up;
 * nothing below the transform layer knows that.
 */
export type Vec2 = { x: number; y: number };

export type LatLng = { lat: number; lng: number };

export type SpaceType = 'balcony' | 'garden' | 'land';

/** One boundary segment: edges[i] runs boundary[i] -> boundary[i+1]. */
export type Edge = {
  wall: 'full' | 'half' | 'none';
  /** How tall the wall stands, in metres. A 'half' wall reaches half of it. */
  height: number;
  /**
   * How far along the edge the wall actually runs, as fractions of the edge
   * from its first corner. Absent means the whole edge. Stored as fractions,
   * not metres, so it survives the corner being dragged.
   */
  span?: { from: number; to: number };
  /** 0..1 along the edge, if there's a door or gate on it. */
  door?: number;
};

/** Anything standing on the ground that casts shade. */
export type Obstacle = {
  footprint: Vec2[];
  height: number;
  /** Blocks the ground it covers — a shed, not a tree. */
  solid?: boolean;
  label?: string;
};

/** A slab floating overhead: soffit, pergola, the neighbour's balcony. */
export type Overhead = {
  footprint: Vec2[];
  /** Clearance above the floor, not the slab's own thickness. */
  height: number;
};

export type Calibration = {
  metresPerPixel: number;
  /** The image pixel that sits at local (0, 0). */
  originPx: Vec2;
  /** Image rotation relative to local north, radians. */
  rotationRad: number;
};

export type BaseImage = {
  dataUrl: string;
  calibration: Calibration;
  /** Two pinned real-world points, if the trace was georeferenced. */
  georef?: { a: LatLng; b: LatLng };
  widthPx: number;
  heightPx: number;
};

export type Space = {
  id: string;
  name: string;
  type: SpaceType;
  /** Outer ring, counter-clockwise. */
  boundary: Vec2[];
  /** One per boundary segment; always the same length as boundary. */
  edges: Edge[];
  obstacles: Obstacle[];
  overhead?: Overhead;
  geo: { lat: number; lng?: number; bearing: number };
  base?: BaseImage;
  schemaVersion: number;
};

/**
 * What one grid cell means. The engine keeps parallel typed arrays rather than
 * an array of these; cellAt builds one on demand.
 */
export type Cell = {
  pos: Vec2;
  sunHours: { summer: number; winter: number };
  light: 'full' | 'partial' | 'shade';
  /** 0..1 shelter and thermal mass from nearby walls. */
  nearWall: number;
  /** 0..1 exposure through open edges. */
  wind: number;
  /** 0..1 closeness to a door — how easy the spot is to tend. */
  access: number;
};
