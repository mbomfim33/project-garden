import type { Space } from '../space/types';
import { area } from '../engine';
import type { Action } from './editorReducer';

/** Everything standing in the space, so nothing is only findable by clicking. */
export function ObstacleList({
  space,
  selected,
  onSelect,
  act,
}: {
  space: Space;
  selected: number;
  onSelect: (i: number) => void;
  act: (a: Action) => void;
}) {
  if (!space.obstacles.length) {
    return (
      <p className="hint">
        Nothing standing in the space yet. Use Structure for a shed or a wall, Tree for a canopy.
      </p>
    );
  }

  return (
    <ul className="objlist">
      {space.obstacles.map((o, i) => {
        const on = i === selected;
        return (
          <li key={i} className={on ? 'on' : undefined}>
            <button className="row" onClick={() => onSelect(on ? -1 : i)}>
              <span className={o.solid ? 'chip solid' : 'chip canopy'}>
                {o.solid ? 'Solid' : 'Canopy'}
              </span>
              <span className="name">{o.label ?? 'Structure'}</span>
              <span className="dim">{area(o.footprint).toFixed(1)} m²</span>
              <span className="h">{o.height.toFixed(1)} m</span>
            </button>

            {on ? (
              <div className="detail">
                <label className="field">
                  Tall
                  <input
                    type="number"
                    value={o.height}
                    step={0.1}
                    min={0.1}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v)) act({ kind: 'SET_OBSTACLE', i, patch: { height: v } });
                    }}
                  />
                  <span className="dim">m</span>
                </label>

                <div className="seg" role="group" aria-label="What it does to the ground">
                  <button
                    aria-pressed={o.solid === true}
                    onClick={() => act({ kind: 'SET_OBSTACLE', i, patch: { solid: true } })}
                  >
                    Blocks
                  </button>
                  <button
                    aria-pressed={!o.solid}
                    onClick={() => act({ kind: 'SET_OBSTACLE', i, patch: { solid: false } })}
                  >
                    Plantable
                  </button>
                </div>
                <p className="hint">
                  {o.solid
                    ? 'Nothing grows under it, and it casts shade.'
                    : 'Casts shade, but the ground under it still counts.'}
                </p>

                <div className="row">
                  <button
                    className="danger"
                    onClick={() => {
                      act({ kind: 'DELETE_OBSTACLE', i });
                      onSelect(-1);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
