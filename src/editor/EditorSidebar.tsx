import { useRef, useState } from 'react';
import type { LatLng, Space, Vec2 } from '../space/types';
import {
  bearingFromSimilarity,
  georefToCalibration,
  solveSimilarity,
  worldToImagePx,
} from '../space/calibration';
import { fileToBaseImage } from '../view/baseImage';
import type { Action, EditorDoc } from './editorReducer';
import { NEEDS_SHAPE, type Tool } from './tools';
import { CompassDial } from './CompassDial';

const TOOLS: { key: Tool; label: string; key2: string }[] = [
  { key: 'select', label: 'Select', key2: 'V' },
  { key: 'draw', label: 'Draw', key2: 'D' },
  { key: 'insert', label: 'Add corner', key2: 'A' },
  { key: 'wall', label: 'Walls', key2: 'W' },
  { key: 'door', label: 'Door', key2: 'R' },
  { key: 'box', label: 'Structure', key2: 'B' },
  { key: 'tree', label: 'Tree', key2: 'T' },
  { key: 'overhead', label: 'Overhead', key2: 'O' },
];

/** How wide the image is assumed to be before anyone calibrates it. */
const ASSUMED_SPAN_M: Record<Space['type'], number> = { balcony: 8, garden: 25, land: 80 };

type Props = {
  doc: EditorDoc;
  tool: Tool;
  setTool: (t: Tool) => void;
  commit: (a: Action) => void;
  selectedEdge: number;
  selectedObstacle: number;
  setSelectedObstacle: (i: number) => void;
  boxHeight: number;
  setBoxHeight: (v: number) => void;
  treeRadius: number;
  setTreeRadius: (v: number) => void;
  treeHeight: number;
  setTreeHeight: (v: number) => void;
  clearance: number;
  setClearance: (v: number) => void;
  calibrationLine: [Vec2, Vec2] | null;
  setCalibrationLine: (l: [Vec2, Vec2] | null) => void;
  notice: string | null;
  setNotice: (s: string | null) => void;
  markDirty: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  fitView: () => void;
};

export function EditorSidebar(props: Props) {
  const { doc, tool, setTool, commit, markDirty } = props;
  const { space } = doc;
  const edge = space.edges[props.selectedEdge];
  const obstacle = space.obstacles[props.selectedObstacle];

  const act = (a: Action) => {
    commit(a);
    markDirty();
  };

  return (
    <aside className="sidebar">
      <section>
        <h3>Space</h3>
        <input
          type="text"
          value={space.name}
          onChange={(e) => act({ kind: 'SET_NAME', name: e.target.value })}
          aria-label="Name"
        />
        <div className="row">
          <button onClick={props.undo} disabled={!props.canUndo}>
            Undo
          </button>
          <button onClick={props.redo} disabled={!props.canRedo}>
            Redo
          </button>
          <button onClick={props.fitView}>Fit view</button>
        </div>
      </section>

      {props.notice ? (
        <p className="notice" role="status">
          {props.notice}
        </p>
      ) : null}

      <section>
        <h3>Tools</h3>
        <div className="toolgrid">
          {TOOLS.map((t) => (
            <button
              key={t.key}
              aria-pressed={tool === t.key}
              disabled={NEEDS_SHAPE.includes(t.key) && !doc.closed}
              onClick={() => setTool(t.key)}
              title={`${t.label} (${t.key2})`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {!doc.closed ? (
          <ShapeStart doc={doc} act={act} setTool={setTool} />
        ) : (
          <p className="hint">Shift-drag pans, scroll zooms. Cmd-Z undoes.</p>
        )}
      </section>

      {tool === 'box' ? (
        <section>
          <h3>New structure</h3>
          <NumberField label="Height" value={props.boxHeight} onChange={props.setBoxHeight} step={0.1} min={0.1} />
          <p className="hint">Drag a rectangle. Blocks the ground under it as well as casting shade.</p>
        </section>
      ) : null}

      {tool === 'tree' ? (
        <section>
          <h3>New tree</h3>
          <NumberField label="Canopy r" value={props.treeRadius} onChange={props.setTreeRadius} step={0.1} min={0.2} />
          <NumberField label="Height" value={props.treeHeight} onChange={props.setTreeHeight} step={0.1} min={0.2} />
          <p className="hint">Casts shade, but you can still plant underneath.</p>
        </section>
      ) : null}

      {tool === 'overhead' ? (
        <section>
          <h3>Overhead slab</h3>
          <NumberField label="Clearance" value={props.clearance} onChange={props.setClearance} step={0.1} min={0.3} />
          <p className="hint">
            How high above the floor it sits. On a balcony this is usually the single biggest
            thing blocking the sun.
          </p>
        </section>
      ) : null}

      {edge ? (
        <section>
          <h3>Edge {props.selectedEdge + 1}</h3>
          <div className="row">
            <button onClick={() => act({ kind: 'CYCLE_WALL', i: props.selectedEdge })}>
              {edge.wall === 'full' ? 'Full wall' : edge.wall === 'half' ? 'Half wall' : 'Open'}
            </button>
          </div>
          {edge.wall !== 'none' ? (
            <NumberField
              label="Height"
              value={edge.height}
              step={0.1}
              min={0}
              onChange={(height) => act({ kind: 'SET_EDGE', i: props.selectedEdge, patch: { height } })}
            />
          ) : null}
          <div className="row">
            {edge.door == null ? (
              <button onClick={() => act({ kind: 'SET_DOOR', i: props.selectedEdge, t: 0.5 })}>
                Add a door
              </button>
            ) : (
              <button onClick={() => act({ kind: 'SET_DOOR', i: props.selectedEdge, t: null })}>
                Remove door
              </button>
            )}
          </div>
          <p className="hint">A half wall counts as half its height when shade is worked out.</p>
        </section>
      ) : null}

      {obstacle ? (
        <section>
          <h3>{obstacle.label ?? 'Obstacle'}</h3>
          <NumberField
            label="Height"
            value={obstacle.height}
            step={0.1}
            min={0.1}
            onChange={(height) => act({ kind: 'SET_OBSTACLE', i: props.selectedObstacle, patch: { height } })}
          />
          <div className="row">
            <button
              onClick={() =>
                act({
                  kind: 'SET_OBSTACLE',
                  i: props.selectedObstacle,
                  patch: { solid: !obstacle.solid },
                })
              }
            >
              {obstacle.solid ? 'Blocks the ground' : 'Can plant under it'}
            </button>
            <button
              className="danger"
              onClick={() => {
                act({ kind: 'DELETE_OBSTACLE', i: props.selectedObstacle });
                props.setSelectedObstacle(-1);
              }}
            >
              Delete
            </button>
          </div>
        </section>
      ) : null}

      {space.overhead ? (
        <section>
          <h3>Overhead</h3>
          <NumberField
            label="Clearance"
            value={space.overhead.height}
            step={0.1}
            min={0.3}
            onChange={(height) =>
              act({ kind: 'SET_OVERHEAD', overhead: { ...space.overhead!, height } })
            }
          />
          <div className="row">
            <button className="danger" onClick={() => act({ kind: 'SET_OVERHEAD', overhead: undefined })}>
              Remove slab
            </button>
          </div>
        </section>
      ) : null}

      <section>
        <h3>Where on earth</h3>
        <NumberField
          label="Latitude"
          value={space.geo.lat}
          step={0.01}
          min={-90}
          max={90}
          onChange={(lat) => act({ kind: 'SET_GEO', patch: { lat } })}
        />
        <NumberField
          label="Longitude"
          value={space.geo.lng ?? 0}
          step={0.01}
          min={-180}
          max={180}
          onChange={(lng) => act({ kind: 'SET_GEO', patch: { lng } })}
        />
        <p className="hint">
          Latitude decides how high the sun climbs and how far the seasons swing. Negative is
          south.
        </p>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <CompassDial
            bearing={space.geo.bearing ?? 0}
            onChange={(bearing) => act({ kind: 'SET_GEO', patch: { bearing } })}
          />
          <div>
            <p className="hint">
              Turn the needle until it points the way true north lies on your drawing.
            </p>
            <p className="hint accent">{Math.round(((space.geo.bearing ?? 0) * 180) / Math.PI)}° off north</p>
          </div>
        </div>
      </section>

      <BasePanel {...props} />
    </aside>
  );
}

function ShapeStart({
  doc,
  act,
  setTool,
}: {
  doc: EditorDoc;
  act: (a: Action) => void;
  setTool: (t: Tool) => void;
}) {
  const [w, setW] = useState(doc.space.type === 'balcony' ? 4 : 10);
  const [h, setH] = useState(doc.space.type === 'balcony' ? 2.5 : 8);

  return (
    <>
      <p className="hint">
        {doc.space.boundary.length
          ? `${doc.space.boundary.length} corner${doc.space.boundary.length === 1 ? '' : 's'} down. Close the shape when you get back to the first one.`
          : 'Draw it corner by corner, or start from a rectangle and drag it about.'}
      </p>
      <div className="row">
        <NumberField label="W" value={w} onChange={setW} step={0.1} min={0.5} />
        <NumberField label="D" value={h} onChange={setH} step={0.1} min={0.5} />
      </div>
      <div className="row">
        <button
          onClick={() => {
            act({ kind: 'SEED_RECT', w, h, walled: doc.space.type === 'balcony' });
            setTool('select');
          }}
        >
          Start from a rectangle
        </button>
      </div>
      {doc.space.boundary.length >= 3 ? (
        <div className="row">
          <button
            className="primary"
            onClick={() => {
              act({ kind: 'CLOSE' });
              setTool('select');
            }}
          >
            Close the shape
          </button>
        </div>
      ) : null}
    </>
  );
}

function BasePanel(props: Props) {
  const { doc, commit, markDirty, calibrationLine, setCalibrationLine, setNotice, setTool } = props;
  const { space } = doc;
  const fileRef = useRef<HTMLInputElement>(null);
  const [realLength, setRealLength] = useState(10);
  const [a, setA] = useState<LatLng>({ lat: 0, lng: 0 });
  const [b, setB] = useState<LatLng>({ lat: 0, lng: 0 });
  const [busy, setBusy] = useState(false);

  const act = (action: Action) => {
    commit(action);
    markDirty();
  };

  const load = async (file: File) => {
    setBusy(true);
    setNotice(null);
    try {
      const loaded = await fileToBaseImage(file);
      const span = ASSUMED_SPAN_M[space.type];
      act({
        kind: 'SET_BASE',
        base: {
          dataUrl: loaded.dataUrl,
          widthPx: loaded.widthPx,
          heightPx: loaded.heightPx,
          calibration: {
            metresPerPixel: span / loaded.widthPx,
            originPx: { x: loaded.widthPx / 2, y: loaded.heightPx / 2 },
            rotationRad: 0,
          },
        },
      });
      setNotice(
        `Loaded at a guessed ${span} m across. Calibrate it against something you know the length of.`,
      );
      setTool('calibrate');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not read that image.');
    } finally {
      setBusy(false);
    }
  };

  const applyScale = () => {
    if (!space.base || !calibrationLine) return;
    const cal = space.base.calibration;
    const aPx = worldToImagePx(calibrationLine[0], cal);
    const bPx = worldToImagePx(calibrationLine[1], cal);
    const pixels = Math.hypot(bPx.x - aPx.x, bPx.y - aPx.y);
    if (pixels < 1 || !(realLength > 0)) {
      setNotice('Draw a longer line, or give it a real length.');
      return;
    }
    act({
      kind: 'SET_BASE',
      base: { ...space.base, calibration: { ...cal, metresPerPixel: realLength / pixels } },
    });
    setCalibrationLine(null);
    setNotice(
      space.boundary.length >= 3
        ? 'Rescaled. Anything already traced moved with it — check the area still reads right.'
        : 'Rescaled. Now trace the outline over the image.',
    );
    setTool('draw');
  };

  const applyGeoref = () => {
    if (!space.base || !calibrationLine) return;
    const cal = space.base.calibration;
    try {
      const sim = solveSimilarity(
        worldToImagePx(calibrationLine[0], cal),
        worldToImagePx(calibrationLine[1], cal),
        a,
        b,
      );
      const next = georefToCalibration(sim, worldToImagePx(calibrationLine[0], cal));
      act({ kind: 'SET_BASE', base: { ...space.base, calibration: next, georef: { a, b } } });
      act({ kind: 'SET_GEO', patch: { lat: a.lat, lng: a.lng, bearing: bearingFromSimilarity(sim) } });
      setCalibrationLine(null);
      setNotice('Georeferenced. Scale, north and latitude all came from those two points.');
      setTool('draw');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Those two points did not work out.');
    }
  };

  return (
    <section
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file?.type.startsWith('image/')) void load(file);
      }}
    >
      <h3>Trace over an image</h3>
      {space.base ? (
        <>
          <p className="hint">
            {space.base.widthPx}×{space.base.heightPx} px ·{' '}
            {(space.base.calibration.metresPerPixel * space.base.widthPx).toFixed(1)} m across
            {space.base.georef ? ' · georeferenced' : ''}
          </p>
          <div className="row">
            <button aria-pressed={props.tool === 'calibrate'} onClick={() => setTool('calibrate')}>
              Calibrate
            </button>
            <button className="danger" onClick={() => act({ kind: 'SET_BASE', base: undefined })}>
              Remove
            </button>
          </div>

          {calibrationLine ? (
            <>
              <p className="hint sage">Line drawn. Now tell it what that line really is.</p>
              <div className="row">
                <NumberField label="Length m" value={realLength} onChange={setRealLength} step={0.1} min={0.1} />
                <button className="primary" onClick={applyScale}>
                  Set scale
                </button>
              </div>
              <p className="hint">
                Or, if you know where both ends are in the world, pin them and get north and
                latitude too.
              </p>
              <div className="row">
                <NumberField label="A lat" value={a.lat} onChange={(lat) => setA({ ...a, lat })} step={0.0001} />
                <NumberField label="A lng" value={a.lng} onChange={(lng) => setA({ ...a, lng })} step={0.0001} />
              </div>
              <div className="row">
                <NumberField label="B lat" value={b.lat} onChange={(lat) => setB({ ...b, lat })} step={0.0001} />
                <NumberField label="B lng" value={b.lng} onChange={(lng) => setB({ ...b, lng })} step={0.0001} />
              </div>
              <div className="row">
                <button onClick={applyGeoref}>Pin both ends</button>
                <button className="ghost" onClick={() => setCalibrationLine(null)}>
                  Clear line
                </button>
              </div>
            </>
          ) : null}
        </>
      ) : (
        <>
          <p className="hint">
            Drop a top-down photo, a satellite screenshot or a site plan here, then trace over it.
            A photo taken at an angle won't measure straight.
          </p>
          <div className="row">
            <button onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? 'Reading…' : 'Choose an image'}
            </button>
          </div>
        </>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void load(file);
        }}
      />
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <label className="field">
      {label}
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
      />
    </label>
  );
}
