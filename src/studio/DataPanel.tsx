import { useEffect, useMemo, useRef } from 'react';
import type { Space } from '../space/types';
import { type Grid, cellAt, cellHourly, summarise } from '../engine';
import { fitCanvas } from '../view/resize';
import { useElementSize } from '../app/hooks';
import { drawChartPlaceholder, drawDayTrace, drawLightHistogram } from './charts';

type Props = { space: Space; grid: Grid; hovered: number; summerLabel: string };

export function DataPanel({ space, grid, hovered, summerLabel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { ref: sizeRef, width, height } = useElementSize<HTMLCanvasElement>();

  const summary = useMemo(() => summarise(grid), [grid]);
  const cell = hovered >= 0 && grid.inside[hovered] ? cellAt(grid, hovered) : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width || !height) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    fitCanvas(canvas, ctx, width, height);
    ctx.clearRect(0, 0, width, height);

    const half = width / 2;
    const left = { x: 0, y: 0, w: half, h: height };
    const right = { x: half, y: 0, w: half, h: height };

    if (cell) {
      drawDayTrace(ctx, cellHourly(grid, hovered), Array.from(grid.hours), left, summerLabel);
    } else {
      drawChartPlaceholder(ctx, left, 'hover the plan to read one square');
    }
    drawLightHistogram(
      ctx,
      { full: summary.full, partial: summary.partial, shade: summary.shade },
      grid.cellSize * grid.cellSize,
      right,
    );
  }, [grid, hovered, cell, width, height, summary, summerLabel]);

  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <div className="data-panel">
      <div className="readout">
        {cell ? (
          <>
            <span>
              <span className="k">at</span>{' '}
              <b>
                {cell.pos.x.toFixed(1)}, {cell.pos.y.toFixed(1)} m
              </b>
            </span>
            <span>
              <span className="k">summer</span> <b>{cell.sunHours.summer.toFixed(1)} h</b>
            </span>
            <span>
              <span className="k">winter</span> <b>{cell.sunHours.winter.toFixed(1)} h</b>
            </span>
            <span>
              <span className="k">class</span> <b>{cell.light}</b>
            </span>
            <span>
              <span className="k">shelter</span> <b>{pct(cell.nearWall)}</b>
            </span>
            <span>
              <span className="k">exposure</span> <b>{pct(cell.wind)}</b>
            </span>
            <span>
              <span className="k">reach</span> <b>{pct(cell.access)}</b>
            </span>
          </>
        ) : (
          <>
            <span>
              <span className="k">usable</span> <b>{summary.areaM2.toFixed(1)} m²</b>
            </span>
            <span>
              <span className="k">grid</span> <b>{grid.cellSize} m squares</b>
            </span>
            <span>
              <span className="k">summer</span>{' '}
              <b>
                {summary.minSummer.toFixed(1)}–{summary.maxSummer.toFixed(1)} h
              </b>
            </span>
            <span>
              <span className="k">winter mean</span> <b>{summary.meanWinter.toFixed(1)} h</b>
            </span>
            <span>
              <span className="k">at</span>{' '}
              <b>
                {Math.abs(space.geo.lat).toFixed(2)}° {space.geo.lat >= 0 ? 'N' : 'S'}
              </b>
            </span>
          </>
        )}
      </div>
      <canvas
        ref={(el) => {
          canvasRef.current = el;
          sizeRef.current = el;
        }}
        aria-label="Sunlight through the day for the hovered square, and the area in each light class"
      />
    </div>
  );
}
