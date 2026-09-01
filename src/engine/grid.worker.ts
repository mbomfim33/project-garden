/// <reference lib="webworker" />
import type { Space } from '../space/types';
import { type Grid, buildGridSeries } from './grid';

export type GridRequest = { reqId: number; space: Space; cellSize?: number };
export type GridReply =
  | ({ reqId: number; ok: true } & Grid)
  | { reqId: number; ok: false; error: string };

self.onmessage = (e: MessageEvent<GridRequest>) => {
  const { reqId, space, cellSize } = e.data;
  try {
    const g = buildGridSeries(space, cellSize);
    // Hand the buffers over rather than copying them; each array owns its own,
    // so nothing gets transferred twice.
    (self as unknown as Worker).postMessage({ reqId, ok: true, ...g }, [
      g.inside.buffer,
      g.sunHoursSummer.buffer,
      g.sunHoursWinter.buffer,
      g.hourly.buffer,
      g.hours.buffer,
      g.nearWall.buffer,
      g.wind.buffer,
      g.access.buffer,
    ]);
  } catch (err) {
    (self as unknown as Worker).postMessage({
      reqId,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
