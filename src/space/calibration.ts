import type { Calibration, LatLng, Vec2 } from './types';

const EARTH_R = 6_378_137;
const DEG = Math.PI / 180;

/**
 * Equirectangular projection about a reference point. Over a plot a few hundred
 * metres across the flat-earth error is centimetres.
 */
export function toLocalMetres(p: LatLng, origin: LatLng): Vec2 {
  return {
    x: (p.lng - origin.lng) * DEG * EARTH_R * Math.cos(origin.lat * DEG),
    y: (p.lat - origin.lat) * DEG * EARTH_R,
  };
}

export function toLatLng(p: Vec2, origin: LatLng): LatLng {
  return {
    lat: origin.lat + p.y / (DEG * EARTH_R),
    lng: origin.lng + p.x / (DEG * EARTH_R * Math.cos(origin.lat * DEG)),
  };
}

/**
 * The whole of scale calibration: drag a line over something you know the
 * length of, type the length, divide.
 */
export function calibrateScale(
  aPx: Vec2,
  bPx: Vec2,
  realMetres: number,
  originPx: Vec2 = aPx,
  rotationRad = 0,
): Calibration {
  const pixelLength = Math.hypot(bPx.x - aPx.x, bPx.y - aPx.y);
  if (pixelLength < 1) throw new Error('That line is too short to measure.');
  if (!(realMetres > 0)) throw new Error('Type how long the line really is, in metres.');
  return { metresPerPixel: realMetres / pixelLength, originPx, rotationRad };
}

/** Image pixels to local metres. Image y grows downward, local y grows north. */
export function imagePxToWorld(pImg: Vec2, cal: Calibration): Vec2 {
  const k = cal.metresPerPixel;
  const east = (pImg.x - cal.originPx.x) * k;
  const north = (cal.originPx.y - pImg.y) * k;
  if (!cal.rotationRad) return { x: east, y: north };
  const c = Math.cos(cal.rotationRad);
  const s = Math.sin(cal.rotationRad);
  return { x: east * c - north * s, y: east * s + north * c };
}

export function worldToImagePx(p: Vec2, cal: Calibration): Vec2 {
  let east = p.x;
  let north = p.y;
  if (cal.rotationRad) {
    const c = Math.cos(-cal.rotationRad);
    const s = Math.sin(-cal.rotationRad);
    east = p.x * c - p.y * s;
    north = p.x * s + p.y * c;
  }
  const k = cal.metresPerPixel;
  return { x: cal.originPx.x + east / k, y: cal.originPx.y - north / k };
}

export type Similarity = { scale: number; rotationRad: number };

/**
 * Two points you can name on the image and locate in the world pin down scale
 * and rotation exactly — four unknowns, four equations, no fitting needed.
 */
export function solveSimilarity(
  aPx: Vec2,
  bPx: Vec2,
  aLL: LatLng,
  bLL: LatLng,
  ref: LatLng = aLL,
): Similarity {
  const aW = toLocalMetres(aLL, ref);
  const bW = toLocalMetres(bLL, ref);

  const vx = bW.x - aW.x;
  const vy = bW.y - aW.y;
  // Flip the image vector's y so both are measured with north up.
  const ux = bPx.x - aPx.x;
  const uy = aPx.y - bPx.y;

  const worldLen = Math.hypot(vx, vy);
  const pxLen = Math.hypot(ux, uy);
  if (pxLen < 1) throw new Error('The two points are too close together on the image.');
  if (worldLen < 0.5) throw new Error('The two coordinates are too close together on the ground.');

  return {
    scale: worldLen / pxLen,
    rotationRad: Math.atan2(vy, vx) - Math.atan2(uy, ux),
  };
}

export function georefToCalibration(sim: Similarity, originPx: Vec2): Calibration {
  return { metresPerPixel: sim.scale, rotationRad: sim.rotationRad, originPx };
}

/**
 * Once the image is georeferenced, local +y is no longer true north — the
 * rotation that squared it up is exactly the space's bearing.
 */
export function bearingFromSimilarity(sim: Similarity): number {
  const b = -sim.rotationRad;
  return ((b % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}
