import { useEffect, useRef } from 'react';
import { COL } from '../view/plan';
import { dpr } from '../view/resize';
import { bearingFromPointer } from './tools';

const SIZE = 96;

/**
 * Which way the plan is turned relative to true north. Drag the needle round;
 * everything downstream reads it as radians clockwise from north.
 */
export function CompassDial({
  bearing,
  onChange,
}: {
  bearing: number;
  onChange: (rad: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = dpr();
    canvas.width = SIZE * ratio;
    canvas.height = SIZE * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);

    const c = SIZE / 2;
    const r = c - 14;

    ctx.strokeStyle = COL.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '600 9px ui-monospace, Menlo, monospace';
    ctx.fillStyle = COL.dim;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Labels sit where the plan's own axes point, so "up" is always the plan's up.
    ctx.fillText('up', c, c - r - 7);
    ctx.fillText('down', c, c + r + 7);

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 2 * Math.PI;
      const inner = i % 3 === 0 ? r - 6 : r - 3;
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(168,159,140,0.5)' : 'rgba(168,159,140,0.25)';
      ctx.beginPath();
      ctx.moveTo(c + Math.sin(a) * inner, c - Math.cos(a) * inner);
      ctx.lineTo(c + Math.sin(a) * r, c - Math.cos(a) * r);
      ctx.stroke();
    }

    // The needle points at true north, which sits at -bearing on the plan.
    const north = -bearing;
    const tip = { x: c + Math.sin(north) * (r - 4), y: c - Math.cos(north) * (r - 4) };
    ctx.strokeStyle = COL.sage;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();

    ctx.fillStyle = COL.sage;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#20180a';
    ctx.font = '700 8px ui-monospace, Menlo, monospace';
    ctx.fillText('N', tip.x, tip.y + 0.5);

    ctx.fillStyle = COL.accent;
    ctx.beginPath();
    ctx.arc(c, c, 3, 0, Math.PI * 2);
    ctx.fill();
  }, [bearing]);

  const set = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const northDir = bearingFromPointer(
      e.clientX - rect.left,
      e.clientY - rect.top,
      rect.width / 2,
      rect.height / 2,
    );
    // Dragging places north; the bearing is the turn that puts it there.
    const next = (2 * Math.PI - northDir) % (2 * Math.PI);
    onChange(next);
  };

  return (
    <canvas
      ref={ref}
      className="dial"
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        set(e);
      }}
      onPointerMove={(e) => {
        if (dragging.current) set(e);
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      role="slider"
      aria-label="Which way is north"
      aria-valuemin={0}
      aria-valuemax={359}
      aria-valuenow={Math.round((bearing * 180) / Math.PI)}
      tabIndex={0}
      onKeyDown={(e) => {
        const step = (e.shiftKey ? 15 : 1) * (Math.PI / 180);
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange((bearing - step + 2 * Math.PI) % (2 * Math.PI));
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange((bearing + step) % (2 * Math.PI));
      }}
    />
  );
}
