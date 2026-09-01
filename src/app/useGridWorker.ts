import { useEffect, useMemo, useState } from 'react';
import type { Space } from '../space/types';
import { type Grid, buildGridSeries, estimateCells } from '../engine';
import type { GridReply, GridRequest } from '../engine/grid.worker';

/**
 * Under this many cells the sweep finishes in a couple of milliseconds, so
 * computing it here beats a worker round-trip and a flash of loading state.
 */
const INLINE_CELLS = 4_000;

/**
 * One worker for the whole app, made on first use. The sweep is a plain
 * request and response, so there's nothing to keep separate per screen, and
 * reusing it means navigating between spaces doesn't respawn a thread.
 */
let shared: Worker | null | undefined;

function sharedWorker(): Worker | null {
  if (shared !== undefined) return shared;
  try {
    shared =
      typeof Worker === 'undefined'
        ? null
        : new Worker(new URL('../engine/grid.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    shared = null;
  }
  return shared;
}

/** Tagged with the space it came from, so a stale reply is simply ignored. */
type Result = { for: Space; grid: Grid };
type Failure = { for: Space; message: string };

let nextReqId = 1;

/** Keeps a big sweep off the main thread; small ones just run here. */
export function useGridWorker(space: Space | null, cellSize?: number) {
  const worker = sharedWorker();

  const inline = useMemo(() => {
    if (!space) return null;
    const small = estimateCells(space, cellSize) <= INLINE_CELLS;
    return !worker || small ? buildGridSeries(space, cellSize) : null;
  }, [space, cellSize, worker]);

  const [result, setResult] = useState<Result | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);

  useEffect(() => {
    if (!space || inline || !worker) return;

    const reqId = nextReqId++;
    const onMessage = (e: MessageEvent<GridReply>) => {
      if (e.data.reqId !== reqId) return;
      if (!e.data.ok) {
        setFailure({ for: space, message: e.data.error });
        return;
      }
      const { reqId: _reqId, ok: _ok, ...grid } = e.data;
      setResult({ for: space, grid: grid as Grid });
    };
    const onError = () => setFailure({ for: space, message: 'The sun map worker could not start.' });

    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.postMessage({ reqId, space, cellSize } satisfies GridRequest);

    return () => {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
    };
  }, [space, cellSize, inline, worker]);

  const grid = inline ?? (result && space && result.for === space ? result.grid : null);
  const error = failure && space && failure.for === space ? failure.message : null;

  return { grid, pending: !grid && !error, error };
}
