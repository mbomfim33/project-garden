import { useEffect, useRef } from 'react';
import type { Space } from '../space/types';
import { makeT, padForSpace } from '../view/transform';
import { fitCanvas } from '../view/resize';
import { drawGround } from '../view/plan';
import { drawPlanBase, drawStructures } from '../studio/studioDraw';

const HEIGHT = 132;

/** A small plan of the space, for the gallery card. */
export function PlanThumb({ space, onClick }: { space: Space; onClick?: () => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = Math.max(1, Math.round(canvas.getBoundingClientRect().width));
    canvas.style.height = `${HEIGHT}px`;
    fitCanvas(canvas, ctx, width, HEIGHT);
    drawGround(ctx, width, HEIGHT);
    if (space.boundary.length < 3) return;

    const T = makeT(space, width, HEIGHT, padForSpace(space));
    drawPlanBase(ctx, T, space);
    drawStructures(ctx, T, space);
  }, [space]);

  return (
    <canvas
      className="thumb"
      ref={ref}
      onClick={onClick}
      style={{ height: HEIGHT, cursor: onClick ? 'pointer' : 'default' }}
      aria-hidden
    />
  );
}
