import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Space } from '../space/types';
import { type Grid, type Sun, clockLabel, compassPoint, daylight, seasonsFor } from '../engine';
import { useReducedMotion } from '../app/hooks';
import { StudioCanvas } from './StudioCanvas';
import { DataPanel } from './DataPanel';
import type { Mode } from './studioDraw';

const MODES: { key: Mode; label: string }[] = [
  { key: 'live', label: 'Live shadow' },
  { key: 'summer', label: 'Summer hours' },
  { key: 'winter', label: 'Winter hours' },
];

export function SpaceStudio({ space, grid }: { space: Space; grid: Grid }) {
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<Mode>(reduced ? 'summer' : 'live');
  const [playing, setPlaying] = useState(!reduced);
  const [opacity, setOpacity] = useState(0.74);
  const [seasonKey, setSeasonKey] = useState<'summer' | 'winter'>('summer');
  const [scrub, setScrub] = useState(340);
  const [sun, setSun] = useState<Sun | null>(null);
  const [hovered, setHovered] = useState(-1);
  const [maxHours, setMaxHours] = useState(0);

  const tRef = useRef(0.34);

  const seasons = useMemo(() => seasonsFor(space.geo.lat), [space.geo.lat]);
  const season = seasons.find((s) => s.key === seasonKey) ?? seasons[0];
  const summerLabel = `sunlight through ${seasons[0].label.toLowerCase()}`;

  const day = useMemo(
    () => daylight(season.day, space.geo.lat * (Math.PI / 180)),
    [season.day, space.geo.lat],
  );

  const live = mode === 'live';

  const scrubTo = (value: number) => {
    setScrub(value);
    tRef.current = value / 1000;
    setPlaying(false);
  };

  return (
    <>
      <div className="stage">
        <StudioCanvas
          space={space}
          grid={grid}
          mode={mode}
          season={season}
          opacity={opacity}
          playing={playing && live}
          tRef={tRef}
          onSun={setSun}
          onHoverIndex={setHovered}
          hovered={hovered}
          onMaxHours={setMaxHours}
        />
      </div>

      <div className="readout">
        <span>
          <span className="k">{season.label.toLowerCase()}</span>{' '}
          <b>
            {clockLabel(day.sunrise)}–{clockLabel(day.sunset)}
          </b>
        </span>
        {live ? (
          <>
            <span>
              <span className="k">time</span> <b>{sun ? clockLabel(sun.hour) : '—'}</b>
            </span>
            <span>
              <span className="k">sun</span>{' '}
              <b>
                {sun && sun.altDeg > 0
                  ? `${Math.round(sun.altDeg)}° up, ${Math.round(sun.azDeg)}° ${compassPoint(sun.azDeg)}`
                  : 'below the horizon'}
              </b>
            </span>
          </>
        ) : (
          <span>
            <span className="k">showing</span>{' '}
            <b>{mode === 'winter' ? 'midwinter' : 'midsummer'} sunlight totals</b>
          </span>
        )}
        {space.geo.bearing ? (
          <span>
            <span className="k">plan turned</span>{' '}
            <b>{Math.round((space.geo.bearing * 180) / Math.PI)}° off north</b>
          </span>
        ) : null}
      </div>

      <div className="controls">
        <div className="ctl">
          <button
            className="playbtn"
            onClick={() => setPlaying((p) => !p)}
            disabled={!live}
            aria-label={playing ? 'Pause the sun' : 'Play the sun'}
          >
            {playing ? '❚❚' : '▶'}
          </button>
          <div className="seg" role="group" aria-label="What the squares show">
            {MODES.map((m) => (
              <button key={m.key} aria-pressed={mode === m.key} onClick={() => setMode(m.key)}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ctl grow">
          <span className="mono dim">time</span>
          <input
            type="range"
            min={0}
            max={1000}
            value={scrub}
            disabled={!live}
            onChange={(e) => scrubTo(Number(e.target.value))}
            aria-label="Time of day"
          />
          <span className="mono">{sun ? clockLabel(sun.hour) : '—'}</span>
        </div>

        <div className="ctl">
          <span className="mono dim">day</span>
          <div className="seg" role="group" aria-label="Which day to animate">
            <button aria-pressed={seasonKey === 'summer'} onClick={() => setSeasonKey('summer')}>
              Midsummer
            </button>
            <button aria-pressed={seasonKey === 'winter'} onClick={() => setSeasonKey('winter')}>
              Midwinter
            </button>
          </div>
        </div>

        <div className="ctl grow">
          <span className="mono dim">overlay</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(opacity * 100)}
            onChange={(e) => setOpacity(Number(e.target.value) / 100)}
            aria-label="Overlay strength"
          />
          <span className="mono">{Math.round(opacity * 100)}%</span>
        </div>

        <div className="ctl">
          <Link to={`/editor/${space.id}`}>
            <button className="ghost">Edit this space</button>
          </Link>
        </div>
      </div>

      <div className="legend">
        {live ? (
          <>
            <span>
              <span className="dot lit" />
              sun reaches it now
            </span>
            <span>
              <span className="dot unlit" />
              in shadow now
            </span>
          </>
        ) : (
          <span>
            <span className="ramp" />
            no sun → {maxHours.toFixed(1)} h
          </span>
        )}
        <span>
          · {grid.cellSize} m squares · {grid.cols}×{grid.rows}
        </span>
        {reduced ? <span className="dim">· motion reduced, animation off by default</span> : null}
      </div>

      <DataPanel space={space} grid={grid} hovered={hovered} summerLabel={summerLabel} />
    </>
  );
}
