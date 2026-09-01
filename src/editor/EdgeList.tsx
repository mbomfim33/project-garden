import { useEffect, useRef } from 'react';
import type { Space } from '../space/types';
import { distanceToPoint, edgeSpan, wallHeight } from '../engine';
import type { Action } from './editorReducer';

const STATE_LABEL = { full: 'Wall', half: 'Half', none: 'Open' } as const;

/** Tallest thing on the plan, so the little bars share one scale. */
function tallest(space: Space): number {
  let max = 1;
  for (const e of space.edges) {
    const h = wallHeight(e);
    if (h > max) max = h;
  }
  for (const slab of space.overheads ?? []) max = Math.max(max, slab.height);
  return max;
}

/**
 * Every edge at once, with the one being edited opened up in place. The plan
 * shows where they are; this shows what they are, and the two highlight
 * together.
 */
export function EdgeList({
  space,
  selected,
  onSelect,
  onHover,
  act,
}: {
  space: Space;
  selected: number;
  onSelect: (i: number) => void;
  onHover: (i: number) => void;
  act: (a: Action) => void;
}) {
  const listRef = useRef<HTMLUListElement | null>(null);

  // Selecting an edge on the plan should bring its row into view here.
  useEffect(() => {
    listRef.current?.querySelector('li.on')?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const n = space.boundary.length;
  const scale = tallest(space);
  if (n < 3) return null;

  return (
    <>
      <ul className="edgelist" ref={listRef} onPointerLeave={() => onHover(-1)}>
        {space.edges.slice(0, n).map((e, i) => {
          const a = space.boundary[i];
          const b = space.boundary[(i + 1) % n];
          const length = distanceToPoint(a, b);
          const height = wallHeight(e);
          const open = height <= 0;
          const { from, to } = edgeSpan(e);
          const run = (to - from) * length;
          const start = from * length;
          const partial = !open && run < length - 0.01;
          const on = i === selected;

          // Fractions in the model, metres in the interface.
          const setRun = (metres: number) => {
            const clamped = Math.max(0.05, Math.min(length, metres));
            const nextFrom = Math.min(from, Math.max(0, 1 - clamped / length));
            act({ kind: 'SET_EDGE', i, patch: { span: { from: nextFrom, to: nextFrom + clamped / length } } });
          };
          const setStart = (metres: number) => {
            const clamped = Math.max(0, Math.min(length - run, metres));
            const nextFrom = clamped / length;
            act({ kind: 'SET_EDGE', i, patch: { span: { from: nextFrom, to: nextFrom + run / length } } });
          };

          return (
            <li key={i} className={on ? 'on' : undefined} onPointerEnter={() => onHover(i)}>
              <button className="row" onClick={() => onSelect(on ? -1 : i)}>
                <span className="n">{i + 1}</span>
                <span className={`bar ${e.wall}`} aria-hidden>
                  <i className={`fill h${Math.round((height / scale) * 10) * 10}`} />
                </span>
                <span className={`state ${e.wall}`}>{STATE_LABEL[e.wall]}</span>
                <span className="len">
                  {partial ? `${run.toFixed(1)}/${length.toFixed(1)}` : length.toFixed(1)} m
                </span>
                <span className="h">{open ? '—' : `${height.toFixed(1)} m`}</span>
                <span className={e.door != null ? 'door on' : 'door'}>
                  {e.door != null ? '◍' : '·'}
                </span>
              </button>

              {on ? (
                <div className="detail">
                  <div className="seg" role="group" aria-label={`Edge ${i + 1} type`}>
                    {(['full', 'half', 'none'] as const).map((wall) => (
                      <button
                        key={wall}
                        aria-pressed={e.wall === wall}
                        onClick={() =>
                          act({
                            kind: 'SET_EDGE',
                            i,
                            patch: {
                              wall,
                              height: wall === 'none' ? 0 : e.height || 2.4,
                            },
                          })
                        }
                      >
                        {STATE_LABEL[wall]}
                      </button>
                    ))}
                  </div>

                  {e.wall === 'none' ? (
                    <p className="hint">Open to the sky. Nothing along here casts shade.</p>
                  ) : (
                    <>
                      <label className="field">
                        Tall
                        <input
                          type="number"
                          value={e.height}
                          step={0.1}
                          min={0}
                          onChange={(ev) => {
                            const v = Number(ev.target.value);
                            if (Number.isFinite(v)) act({ kind: 'SET_EDGE', i, patch: { height: v } });
                          }}
                        />
                        <span className="dim">
                          m{e.wall === 'half' ? ` · stands ${height.toFixed(1)} m` : ''}
                        </span>
                      </label>

                      <label className="field">
                        Runs
                        <input
                          type="number"
                          value={Number(run.toFixed(2))}
                          step={0.1}
                          min={0.05}
                          max={Number(length.toFixed(2))}
                          onChange={(ev) => {
                            const v = Number(ev.target.value);
                            if (Number.isFinite(v)) setRun(v);
                          }}
                        />
                        <span className="dim">of {length.toFixed(1)} m</span>
                      </label>

                      {partial ? (
                        <label className="field">
                          From
                          <input
                            type="number"
                            value={Number(start.toFixed(2))}
                            step={0.1}
                            min={0}
                            max={Number((length - run).toFixed(2))}
                            onChange={(ev) => {
                              const v = Number(ev.target.value);
                              if (Number.isFinite(v)) setStart(v);
                            }}
                          />
                          <span className="dim">m from corner {i + 1}</span>
                        </label>
                      ) : null}

                      {partial ? (
                        <p className="hint">
                          The remaining {(length - run).toFixed(1)} m is open, and light comes
                          through it.
                        </p>
                      ) : null}
                    </>
                  )}

                  <div className="row">
                    {e.door == null ? (
                      <button onClick={() => act({ kind: 'SET_DOOR', i, t: 0.5 })}>Add a door</button>
                    ) : (
                      <button onClick={() => act({ kind: 'SET_DOOR', i, t: null })}>
                        Remove door
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="keybox">
        <span className="tag">What the marks mean</span>
        <div className="wallkey">
          <div>
            <span className="mark full" aria-hidden />
            Full height
          </div>
          <div>
            <span className="mark half" aria-hidden />
            Half as tall — a rail or parapet
          </div>
          <div>
            <span className="mark none" aria-hidden />
            Nothing built along it
          </div>
        </div>
      </div>
      <p className="hint">Pick a row to edit it. Hover one to find it on the plan.</p>
    </>
  );
}
