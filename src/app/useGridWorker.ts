import { useEffect, useRef, useState } from 'react';
import type { Space } from '../space/types';
import { type Grid, buildGridSeries } from '../engine';
import type { GridReply, GridRequest } from '../engine/grid.worker';

function spawn(): Worker | null {
  try {
    return new Worker(new URL('../engine/grid.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return null;
  }
}

/**
 * Runs the sweep off the main thread so a big plot doesn't stall a drag. Falls
 * back to computing inline if workers aren't available.
 */
export function useGridWorker(space: Space | null, cellSize?: number) {
  const [grid, setGrid] = useState<Grid | null>(null);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const w = spawn();
    workerRef.current = w;
    if (!w) return;

    w.onmessage = (e: MessageEvent<GridReply>) => {
      // Anything from a superseded space is stale by definition.
      if (e.data.reqId !== reqIdRef.current) return;
      if (!e.data.ok) {
        setError(e.data.error);
        return;
      }
      const { reqId: _reqId, ok: _ok, ...g } = e.data;
      setGrid(g as Grid);
      setError(null);
    };
    w.onerror = () => setError('The sun map worker failed to start.');

    return () => {
      workerRef.current = null;
      w.terminate();
    };
  }, []);

  useEffect(() => {
    if (!space) {
      setGrid(null);
      return;
    }
    const reqId = ++reqIdRef.current;
    setGrid(null);
    setError(null);

    const w = workerRef.current;
    if (!w) {
      setGrid(buildGridSeries(space, cellSize));
      return;
    }
    const msg: GridRequest = { reqId, space, cellSize };
    w.postMessage(msg);
  }, [space, cellSize]);

  return { grid, pending: !grid && !error, error };
}
