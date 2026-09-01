import type { Vec2 } from '../space/types';

export type SeasonKey = 'summer' | 'equinox' | 'winter';

export type Season = { key: SeasonKey; day: number; label: string };

export type Sun = {
  /** Altitude above the horizon, radians. Negative means down. */
  alt: number;
  altDeg: number;
  /** Azimuth clockwise from true north, radians. */
  az: number;
  azDeg: number;
  /** Ground unit vector pointing at the sun, in the space's local frame. */
  dir: Vec2;
  /** Hour of the day this position was taken at. */
  hour: number;
};

const DEG = Math.PI / 180;

const SOLSTICE_JUN = 172;
const SOLSTICE_DEC = 355;
const EQUINOX_MAR = 80;

/**
 * Which day of the year counts as summer depends on which hemisphere you're in.
 * The declination formula gets the sign right on its own; all this picks is the date.
 */
export function seasonsFor(latDeg: number): Season[] {
  const northern = latDeg >= 0;
  return [
    { key: 'summer', day: northern ? SOLSTICE_JUN : SOLSTICE_DEC, label: 'Summer solstice' },
    { key: 'equinox', day: EQUINOX_MAR, label: 'Equinox' },
    { key: 'winter', day: northern ? SOLSTICE_DEC : SOLSTICE_JUN, label: 'Winter solstice' },
  ];
}

/** Cooper's approximation. Swings between +23.45 and -23.45 degrees over the year. */
export function declination(dayOfYear: number): number {
  return 23.45 * DEG * Math.sin(((2 * Math.PI) / 365) * (284 + dayOfYear));
}

/**
 * Where the sun is, for a day, an hour and a latitude.
 *
 * bearingRad rotates the result into the space's own frame: it's the compass
 * heading that local +y points along, so a space whose "north" is really
 * north-east gets shadows that fall the right way.
 */
export function sunAt(dayOfYear: number, hour: number, latRad: number, bearingRad = 0): Sun {
  const decl = declination(dayOfYear);
  const H = (hour - 12) * 15 * DEG;

  const alt = Math.asin(
    Math.sin(latRad) * Math.sin(decl) + Math.cos(latRad) * Math.cos(decl) * Math.cos(H),
  );

  // atan2 rather than acos: acos goes unstable when the sun is near the zenith,
  // which happens every summer noon in the tropics. Measured from south, so add
  // half a turn to get a compass bearing.
  const azFromSouth = Math.atan2(
    Math.sin(H),
    Math.cos(H) * Math.sin(latRad) - Math.tan(decl) * Math.cos(latRad),
  );
  let az = azFromSouth + Math.PI;
  if (az < 0) az += 2 * Math.PI;
  if (az >= 2 * Math.PI) az -= 2 * Math.PI;

  const local = az - bearingRad;
  return {
    alt,
    altDeg: alt / DEG,
    az,
    azDeg: az / DEG,
    dir: { x: Math.sin(local), y: Math.cos(local) },
    hour,
  };
}

export type Daylight = { sunrise: number; sunset: number; hours: number };

/**
 * Sunrise and sunset in solar hours. Inside the polar circles the sun can stay
 * up or down all day, which is what the clamp is for.
 */
export function daylight(dayOfYear: number, latRad: number): Daylight {
  const decl = declination(dayOfYear);
  const cosH0 = -Math.tan(latRad) * Math.tan(decl);
  if (cosH0 <= -1) return { sunrise: 0, sunset: 24, hours: 24 };
  if (cosH0 >= 1) return { sunrise: 12, sunset: 12, hours: 0 };
  const halfHours = (Math.acos(cosH0) / DEG) / 15;
  return { sunrise: 12 - halfHours, sunset: 12 + halfHours, hours: 2 * halfHours };
}

/**
 * The animation dial. t runs 0..1 from sunrise to sunset on the given day, so
 * playback always starts and ends with the sun on the horizon whatever the
 * latitude or season.
 */
export function sunAlongDay(
  t: number,
  dayOfYear: number,
  latRad: number,
  bearingRad = 0,
): Sun {
  const { sunrise, sunset } = daylight(dayOfYear, latRad);
  const clamped = Math.max(0, Math.min(1, t));
  return sunAt(dayOfYear, sunrise + clamped * (sunset - sunrise), latRad, bearingRad);
}

export function clockLabel(hour: number): string {
  const wrapped = ((hour % 24) + 24) % 24;
  const hh = Math.floor(wrapped);
  const mm = Math.round((wrapped - hh) * 60);
  if (mm === 60) return `${String((hh + 1) % 24).padStart(2, '0')}:00`;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function compassPoint(azDeg: number): string {
  return POINTS[Math.round((((azDeg % 360) + 360) % 360) / 45) % 8];
}
