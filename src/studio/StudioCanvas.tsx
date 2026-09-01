import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Space } from '../space/types';
import {
  type Grid,
  type Season,
  type Sun,
  daylight,
  indexAt,
  maskOf,
  occludersOf,
  shadowOf,
  sunAlongDay,
} from '../engine';
import { makeT, padForSpace, toWorld } from '../view/transform';
import { fitCanvas } from '../view/resize';
import { drawCompassRose, drawGround, drawScaleBar } from '../view/plan';
import { useAnimationFrame, useElementSize } from '../app/hooks';
import {
  type Mode,
  type SkyPoint,
  drawPlanBase,
  drawShadows,
  drawStructures,
  drawSunGlyph,
  drawSunPath,
  paintGrid,
} from './studioDraw';

/** Real seconds for one simulated day. */
const DAY_SECONDS = 14;

const PATH_SAMPLES = 60;

/** The readout only needs to keep up with the eye, not with the frame rate. */
const READOUT_MS = 140;

type Props = {
  space: Space;
  grid: Grid;
  mode: Mode;
  season: Season;
  opacity: number;
  playing: boolean;
  tRef: React.RefObject<number>;
  onSun: (sun: Sun) => void;
  onHoverIndex: (i: number) => void;
  hovered: number;
  onMaxHours: (h: number) => void;
};

export function StudioCanvas({
  space,
  grid,
  mode,
  season,
  opacity,
  playing,
  tRef,
  onSun,
  onHoverIndex,
  hovered,
  onMaxHours,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { ref: sizeRef, width, height } = useElementSize<HTMLCanvasElement>();
  const [imageTick, setImageTick] = useState(0);

  const latRad = space.geo.lat * (Math.PI / 180);
  const bearing = space.geo.bearing ?? 0;

  // The loop must not push time through React, so the readout is reported on a
  // timer instead of every frame.
  const onSunRef = useRef(onSun);
  useEffect(() => {
    onSunRef.current = onSun;
  }, [onSun]);
  const lastReport = useRef(0);

  const occ = useMemo(() => occludersOf(space), [space]);

  const worldDiag = useMemo(() => {
    if (!space.boundary.length) return 10;
    const xs = space.boundary.map((p) => p.x);
    const ys = space.boundary.map((p) => p.y);
    return Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  }, [space]);

  const maxHours = useMemo(() => {
    let max = 0.0001;
    for (let i = 0; i < grid.inside.length; i++) {
      if (!grid.inside[i]) continue;
      if (grid.sunHoursSummer[i] > max) max = grid.sunHoursSummer[i];
      if (grid.sunHoursWinter[i] > max) max = grid.sunHoursWinter[i];
    }
    return max;
  }, [grid]);

  useEffect(() => onMaxHours(maxHours), [maxHours, onMaxHours]);

  const sunPath = useMemo(() => {
    const out: SkyPoint[] = [];
    for (let i = 0; i <= PATH_SAMPLES; i++) {
      const s = sunAlongDay(i / PATH_SAMPLES, season.day, latRad, bearing);
      out.push({ dir: s.dir, alt: s.alt });
    }
    return out;
  }, [season.day, latRad, bearing]);

  const noDaylight = daylight(season.day, latRad).hours === 0;

  const draw = useCallback(
    (t: number, force = false) => {
      const canvas = canvasRef.current;
      if (!canvas || !width || !height) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      fitCanvas(canvas, ctx, width, height);
      const T = makeT(space, width, height, padForSpace(space));

      drawGround(ctx, width, height);
      drawPlanBase(ctx, T, space, () => setImageTick((n) => n + 1));

      const sun = sunAlongDay(t, season.day, latRad, bearing);
      const sunUp = sun.altDeg > 0.5 && !noDaylight;
      const masks = sunUp ? occ.map((o) => maskOf(shadowOf(o, sun, worldDiag))) : [];

      if (mode === 'live' && sunUp) drawShadows(ctx, T, masks);

      // Only the cell layer answers to the slider, so the plan stays readable
      // underneath and the shadows keep their weight.
      ctx.globalAlpha = opacity;
      paintGrid(ctx, T, grid, { mode, masks, sunUp, maxHours, hovered });
      ctx.globalAlpha = 1;

      drawStructures(ctx, T, space);
      drawSunPath(ctx, width, height, T, sunPath);
      if (mode === 'live' && sunUp) drawSunGlyph(ctx, width, height, T, sun);
      drawCompassRose(ctx, width - 38, 38, 18, bearing, sunUp ? sun : undefined);
      drawScaleBar(ctx, T.S, width - 18, height - 16, 'right');

      const now = performance.now();
      if (force || now - lastReport.current > READOUT_MS) {
        lastReport.current = now;
        onSunRef.current(sun);
      }
    },
    [
      space,
      grid,
      mode,
      season.day,
      opacity,
      width,
      height,
      latRad,
      bearing,
      occ,
      worldDiag,
      maxHours,
      hovered,
      sunPath,
      noDaylight,
    ],
  );

  // Anything other than the clock ticking gets a single repaint.
  useEffect(() => {
    if (!playing || mode !== 'live') draw(tRef.current, true);
  }, [draw, playing, mode, tRef, imageTick]);

  useAnimationFrame(
    (dt) => {
      tRef.current = (tRef.current + dt / DAY_SECONDS) % 1;
      draw(tRef.current);
    },
    playing && mode === 'live',
  );

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !grid.cols) return;
    const rect = canvas.getBoundingClientRect();
    const T = makeT(space, rect.width, rect.height, padForSpace(space));
    const p = toWorld(T, e.clientX - rect.left, e.clientY - rect.top);
    const i = indexAt(grid, p);
    onHoverIndex(i >= 0 && grid.inside[i] ? i : -1);
  };

  return (
    <canvas
      className="plan"
      ref={(el) => {
        canvasRef.current = el;
        sizeRef.current = el;
      }}
      onPointerMove={onPointerMove}
      onPointerLeave={() => onHoverIndex(-1)}
      aria-label={`Plan of ${space.name} with the sun map overlaid`}
    />
  );
}
