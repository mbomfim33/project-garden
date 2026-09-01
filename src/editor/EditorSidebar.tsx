import { useRef, useState } from 'react';
import type { LatLng, Space, Vec2 } from '../space/types';
import {
  bearingFromSimilarity,
  georefToCalibration,
  solveSimilarity,
  worldToImagePx,
} from '../space/calibration';
import { area, bounds, pip, wallHeight } from '../engine';
import { fileToBaseImage } from '../view/baseImage';
import type { Action, EditorDoc } from './editorReducer';
import { type Tool, overheadOverAll, overheadOverPart } from './tools';
import { CompassDial } from './CompassDial';
import { EdgeList } from './EdgeList';
import { ObstacleList } from './ObstacleList';
import { Panel } from './Panel';

/** How wide the image is assumed to be before anyone calibrates it. */
const ASSUMED_SPAN_M: Record<Space['type'], number> = { balcony: 8, garden: 25, land: 80 };

type PanelKey = 'space' | 'edges' | 'things' | 'overhead' | 'where' | 'image' | '';

/** Which card the current tool is about, so it opens itself. */
const PANEL_FOR_TOOL: Partial<Record<Tool, PanelKey>> = {
  wall: 'edges',
  door: 'edges',
  box: 'things',
  tree: 'things',
  overhead: 'overhead',
  calibrate: 'image',
};

export type SidebarProps = {
  doc: EditorDoc;
  tool: Tool;
  setTool: (t: Tool) => void;
  commit: (a: Action) => void;
  selectedEdge: number;
  setSelectedEdge: (i: number) => void;
  setHoveredEdge: (i: number) => void;
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
  seedRect: (w: number, h: number) => void;
  closeShape: () => void;
};

export function EditorSidebar(props: SidebarProps) {
  const { doc, tool, setTool, commit, markDirty } = props;
  const { space } = doc;

  // Picking up a tool brings its card forward rather than leaving you to hunt
  // for it; opening one by hand overrides that until the tool changes again.
  const [override, setOverride] = useState<{ tool: Tool; key: PanelKey } | null>(null);
  const auto: PanelKey = PANEL_FOR_TOOL[tool] ?? (doc.closed ? 'edges' : 'space');
  const open = override?.tool === tool ? override.key : auto;
  const toggle = (key: PanelKey) => setOverride({ tool, key: open === key ? '' : key });

  const act = (a: Action) => {
    commit(a);
    markDirty();
  };

  const walls = space.edges.filter((e) => wallHeight(e) > 0).length;
  const doors = space.edges.filter((e) => e.door != null).length;

  return (
    <aside className="sidebar">
      {props.notice ? (
        <p className="notice" role="status">
          {props.notice}
        </p>
      ) : null}

      {!doc.closed ? (
        <ShapeStart doc={doc} seedRect={props.seedRect} closeShape={props.closeShape} />
      ) : null}

      <Panel
        title="Space"
        summary={doc.closed ? `${area(space.boundary).toFixed(1)} m²` : 'being drawn'}
        open={open === 'space'}
        onToggle={() => toggle('space')}
      >
        <label className="field stack">
          Name
          <input
            type="text"
            value={space.name}
            onChange={(e) => act({ kind: 'SET_NAME', name: e.target.value })}
          />
        </label>
        <dl className="facts">
          <dt>Kind</dt>
          <dd>{space.type}</dd>
          <dt>Corners</dt>
          <dd>{space.boundary.length}</dd>
          <dt>Area</dt>
          <dd>{doc.closed ? `${area(space.boundary).toFixed(1)} m²` : '—'}</dd>
        </dl>
      </Panel>

      {doc.closed ? (
        <Panel
          title="Edges"
          summary={`${space.boundary.length} · ${walls} walled${doors ? ` · ${doors} door` : ''}`}
          open={open === 'edges'}
          onToggle={() => toggle('edges')}
        >
          <EdgeList
            space={space}
            selected={props.selectedEdge}
            onSelect={props.setSelectedEdge}
            onHover={props.setHoveredEdge}
            act={act}
          />
        </Panel>
      ) : null}

      {doc.closed ? (
        <Panel
          title="Things in it"
          summary={space.obstacles.length ? `${space.obstacles.length}` : 'none'}
          open={open === 'things'}
          onToggle={() => toggle('things')}
        >
          {tool === 'box' ? (
            <div className="newthing">
              <span className="tag accent">New structure</span>
              <NumberField
                label="Tall"
                value={props.boxHeight}
                onChange={props.setBoxHeight}
                step={0.1}
                min={0.1}
              />
              <p className="hint">Drag a rectangle on the plan.</p>
            </div>
          ) : null}

          {tool === 'tree' ? (
            <div className="newthing">
              <span className="tag accent">New tree</span>
              <div className="pair">
                <NumberField
                  label="Canopy"
                  value={props.treeRadius}
                  onChange={props.setTreeRadius}
                  step={0.1}
                  min={0.2}
                />
                <NumberField
                  label="Tall"
                  value={props.treeHeight}
                  onChange={props.setTreeHeight}
                  step={0.1}
                  min={0.2}
                />
              </div>
              <p className="hint">Click where the trunk goes.</p>
            </div>
          ) : null}

          <ObstacleList
            space={space}
            selected={props.selectedObstacle}
            onSelect={props.setSelectedObstacle}
            act={act}
          />
        </Panel>
      ) : null}

      {doc.closed ? (
        <Panel
          title="Overhead"
          summary={space.overhead ? `${space.overhead.height.toFixed(1)} m up` : 'open sky'}
          open={open === 'overhead'}
          onToggle={() => toggle('overhead')}
        >
          {space.overhead ? (
            <>
              <SlabSection clearance={space.overhead.height} coverage={slabCoverage(space)} />
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
                <button aria-pressed={tool === 'overhead'} onClick={() => setTool('overhead')}>
                  Redraw
                </button>
                <button
                  className="danger"
                  onClick={() => act({ kind: 'SET_OVERHEAD', overhead: undefined })}
                >
                  Remove
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="hint">
                A roof, soffit or pergola above the floor. It blocks high sun and lets low sun in
                underneath, so it bites hardest in summer.
              </p>
              <NumberField
                label="Clearance"
                value={props.clearance}
                onChange={props.setClearance}
                step={0.1}
                min={0.3}
              />
              <div className="row">
                <button
                  onClick={() =>
                    act({
                      kind: 'SET_OVERHEAD',
                      overhead: overheadOverAll(space.boundary, props.clearance),
                    })
                  }
                >
                  Over all of it
                </button>
              </div>
              <div className="row">
                {[0.5, 0.66].map((f) => (
                  <button
                    key={f}
                    onClick={() =>
                      act({
                        kind: 'SET_OVERHEAD',
                        overhead: overheadOverPart(
                          space.boundary,
                          props.clearance,
                          f,
                          openestEdge(space),
                        ),
                      })
                    }
                  >
                    Back {Math.round(f * 100)}%
                  </button>
                ))}
              </div>
              <div className="row">
                <button aria-pressed={tool === 'overhead'} onClick={() => setTool('overhead')}>
                  Or drag it out
                </button>
              </div>
            </>
          )}
        </Panel>
      ) : null}

      <Panel
        title="Where on earth"
        summary={`${Math.abs(space.geo.lat).toFixed(1)}° ${space.geo.lat >= 0 ? 'N' : 'S'}`}
        open={open === 'where'}
        onToggle={() => toggle('where')}
      >
        <div className="pair">
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
        </div>
        <p className="hint">Latitude sets how high the sun climbs. Negative is south.</p>

        <div className="northrow">
          <CompassDial
            bearing={space.geo.bearing ?? 0}
            onChange={(bearing) => act({ kind: 'SET_GEO', patch: { bearing } })}
          />
          <div>
            <span className="tag">Which way is north</span>
            <p className="hint">Drag the needle to where true north lies on your drawing.</p>
            <p className="hint accent">
              {Math.round(((space.geo.bearing ?? 0) * 180) / Math.PI)}° off north
            </p>
          </div>
        </div>
      </Panel>

      <Panel
        title="Traced image"
        summary={
          space.base
            ? `${(space.base.calibration.metresPerPixel * space.base.widthPx).toFixed(0)} m across`
            : 'none'
        }
        open={open === 'image'}
        onToggle={() => toggle('image')}
      >
        <BasePanel {...props} act={act} />
      </Panel>
    </aside>
  );
}

function ShapeStart({
  doc,
  seedRect,
  closeShape,
}: {
  doc: EditorDoc;
  seedRect: (w: number, h: number) => void;
  closeShape: () => void;
}) {
  const [w, setW] = useState(doc.space.type === 'balcony' ? 4 : 10);
  const [h, setH] = useState(doc.space.type === 'balcony' ? 2.5 : 8);
  const corners = doc.space.boundary.length;

  return (
    <div className="starter">
      <span className="tag accent">Draw the outline first</span>
      <p className="hint">
        {corners
          ? `${corners} corner${corners === 1 ? '' : 's'} down. Click the first one again to close it.`
          : 'Click corner by corner on the plan, or start from a rectangle.'}
      </p>
      <div className="pair">
        <NumberField label="Wide" value={w} onChange={setW} step={0.1} min={0.5} />
        <NumberField label="Deep" value={h} onChange={setH} step={0.1} min={0.5} />
      </div>
      <div className="row">
        <button onClick={() => seedRect(w, h)}>Start from a rectangle</button>
        {corners >= 3 ? (
          <button className="primary" onClick={closeShape}>
            Close it
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** The longest open edge, which is the side a soffit usually stops short of. */
function openestEdge(space: Space): number {
  let best = 0;
  let bestLen = -1;
  const n = space.boundary.length;
  for (let i = 0; i < n; i++) {
    const e = space.edges[i];
    if (e && wallHeight(e) > 0) continue;
    const a = space.boundary[i];
    const b = space.boundary[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len > bestLen) {
      bestLen = len;
      best = i;
    }
  }
  return best;
}

/**
 * How much of the floor sits under the slab. Sampled rather than clipped: an
 * exact polygon intersection is a lot of code for a number shown to the nearest
 * per cent.
 */
function slabCoverage(space: Space): number {
  const slab = space.overhead;
  if (!slab || space.boundary.length < 3) return 0;
  const b = bounds(space.boundary);
  const step = Math.max((b.maxX - b.minX) / 60, 0.02);
  let inside = 0;
  let under = 0;
  for (let x = b.minX; x <= b.maxX; x += step) {
    for (let y = b.minY; y <= b.maxY; y += step) {
      if (!pip(x, y, space.boundary)) continue;
      inside++;
      if (pip(x, y, slab.footprint)) under++;
    }
  }
  return inside ? under / inside : 0;
}

/** A side-on sketch of the floor and the slab above it. */
function SlabSection({ clearance, coverage }: { clearance: number; coverage: number }) {
  const band = clearance < 2.2 ? 'low' : clearance < 3 ? 'mid' : 'high';
  return (
    <div className="slab">
      <span className="section" aria-hidden>
        <i className={`roof ${band}`} />
        <i className={`gap ${band}`} />
        <i className="ground" />
      </span>
      <span>
        {clearance.toFixed(1)} m up, over {Math.round(coverage * 100)}% of the floor
        <br />
        {band === 'low' ? 'A low soffit — deep shade underneath.' : null}
        {band === 'mid' ? 'A typical balcony soffit.' : null}
        {band === 'high' ? 'High enough that midday sun still reaches in.' : null}
      </span>
    </div>
  );
}

function BasePanel(props: SidebarProps & { act: (a: Action) => void }) {
  const { doc, act, calibrationLine, setCalibrationLine, setNotice, setTool } = props;
  const { space } = doc;
  const fileRef = useRef<HTMLInputElement>(null);
  const [realLength, setRealLength] = useState(10);
  const [a, setA] = useState<LatLng>({ lat: 0, lng: 0 });
  const [b, setB] = useState<LatLng>({ lat: 0, lng: 0 });
  const [busy, setBusy] = useState(false);

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
      setNotice(`Loaded at a guessed ${span} m across — now drag a line over something you know.`);
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
      const originPx = worldToImagePx(calibrationLine[0], cal);
      const sim = solveSimilarity(originPx, worldToImagePx(calibrationLine[1], cal), a, b);
      act({
        kind: 'SET_BASE',
        base: { ...space.base, calibration: georefToCalibration(sim, originPx), georef: { a, b } },
      });
      act({
        kind: 'SET_GEO',
        patch: { lat: a.lat, lng: a.lng, bearing: bearingFromSimilarity(sim) },
      });
      setCalibrationLine(null);
      setNotice('Georeferenced. Scale, north and latitude all came from those two points.');
      setTool('draw');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Those two points did not work out.');
    }
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file?.type.startsWith('image/')) void load(file);
      }}
    >
      {space.base ? (
        <>
          <dl className="facts">
            <dt>Pixels</dt>
            <dd>
              {space.base.widthPx}×{space.base.heightPx}
            </dd>
            <dt>Scale</dt>
            <dd>{(space.base.calibration.metresPerPixel * 100).toFixed(1)} cm/px</dd>
            <dt>North</dt>
            <dd>{space.base.georef ? 'from two pinned points' : 'set by hand'}</dd>
          </dl>
          <div className="row">
            <button aria-pressed={props.tool === 'calibrate'} onClick={() => setTool('calibrate')}>
              Calibrate
            </button>
            <button className="danger" onClick={() => act({ kind: 'SET_BASE', base: undefined })}>
              Remove
            </button>
          </div>

          {calibrationLine ? (
            <div className="newthing">
              <span className="tag accent">Line drawn — what is it?</span>
              <div className="row">
                <NumberField
                  label="Long"
                  value={realLength}
                  onChange={setRealLength}
                  step={0.1}
                  min={0.1}
                />
                <button className="primary" onClick={applyScale}>
                  Set scale
                </button>
              </div>
              <p className="hint">
                Or pin both ends to real coordinates and get north and latitude too.
              </p>
              <div className="pair">
                <NumberField
                  label="A lat"
                  value={a.lat}
                  onChange={(lat) => setA({ ...a, lat })}
                  step={0.0001}
                />
                <NumberField
                  label="A lng"
                  value={a.lng}
                  onChange={(lng) => setA({ ...a, lng })}
                  step={0.0001}
                />
              </div>
              <div className="pair">
                <NumberField
                  label="B lat"
                  value={b.lat}
                  onChange={(lat) => setB({ ...b, lat })}
                  step={0.0001}
                />
                <NumberField
                  label="B lng"
                  value={b.lng}
                  onChange={(lng) => setB({ ...b, lng })}
                  step={0.0001}
                />
              </div>
              <div className="row">
                <button onClick={applyGeoref}>Pin both ends</button>
                <button className="ghost" onClick={() => setCalibrationLine(null)}>
                  Clear
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className="hint">
            Drop a top-down photo, a satellite screenshot or a site plan here and trace over it. A
            photo taken at an angle won't measure straight.
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
    </div>
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
