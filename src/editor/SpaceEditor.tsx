import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Space, Vec2 } from '../space/types';
import { area, distanceToPoint } from '../engine';
import { Viewport } from '../view/viewport';
import { hitTest, pickEdge } from '../view/hittest';
import { fitCanvas } from '../view/resize';
import { useElementSize } from '../app/hooks';
import { useSpaces } from '../app/store';
import { useEditor } from './useEditor';
import { type EditorDoc, projectToEdge } from './editorReducer';
import { type Snap, snap } from './snap';
import { type EditorScene, drawEditor } from './editorDraw';
import { NEEDS_SHAPE, type Tool, TOOL_HINT, atLeast, makeBox, makeOverhead, makeTree } from './tools';
import { EditorSidebar } from './EditorSidebar';

/** Movement under this, on a corner, counts as a tap rather than a drag. */
const TAP_PX = 4;

const PICK_PX = 12;

type Drag =
  | { kind: 'vertex'; index: number; from: EditorDoc; startPx: Vec2; moved: boolean }
  | { kind: 'door'; edge: number; from: EditorDoc }
  | { kind: 'rect'; start: Vec2; current: Vec2 }
  | { kind: 'calibrate'; start: Vec2; current: Vec2 }
  | { kind: 'pan'; startPx: Vec2 };

export function SpaceEditor({ space }: { space: Space }) {
  const navigate = useNavigate();
  const persist = useSpaces((s) => s.save);
  const storeError = useSpaces((s) => s.error);

  const editor = useEditor({ space, closed: space.boundary.length >= 3 });
  const { doc, apply, commit, commitFrom, undo, redo, canUndo, canRedo } = editor;

  const [tool, setTool] = useState<Tool>(space.boundary.length >= 3 ? 'select' : 'draw');
  const [selectedVertex, setSelectedVertex] = useState(-1);
  const [selectedEdge, setSelectedEdge] = useState(-1);
  const [hoveredEdge, setHoveredEdge] = useState(-1);
  const [selectedObstacle, setSelectedObstacle] = useState(-1);
  const [boxHeight, setBoxHeight] = useState(2.5);
  const [treeRadius, setTreeRadius] = useState(1.5);
  const [treeHeight, setTreeHeight] = useState(4.5);
  const [clearance, setClearance] = useState(2.6);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [imageTick, setImageTick] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { ref: sizeRef, width, height } = useElementSize<HTMLCanvasElement>();
  // A viewport is a mutable object we pan and zoom in place; it's created once
  // and refitted when the canvas resizes, never replaced.
  const [vp] = useState(() => new Viewport(space, 900, 600));
  const dragRef = useRef<Drag | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Vec2 | null>(null);
  const [snapCue, setSnapCue] = useState<Snap | null>(null);
  const [pendingRect, setPendingRect] = useState<[Vec2, Vec2] | null>(null);
  const [calibrationLine, setCalibrationLine] = useState<[Vec2, Vec2] | null>(null);

  const scene: EditorScene | null = useMemo(() => {
    if (!width || !height) return null;
    return {
      space: doc.space,
      closed: doc.closed,
      tool,
      vp,
      width,
      height,
      draft: doc.space.boundary,
      hoverPoint,
      snapCue,
      selectedVertex,
      selectedEdge,
      selectedObstacle,
      hoveredEdge,
      calibrationLine,
      pendingRect,
    };
  }, [
    doc,
    tool,
    vp,
    width,
    height,
    hoverPoint,
    snapCue,
    selectedVertex,
    selectedEdge,
    selectedObstacle,
    hoveredEdge,
    calibrationLine,
    pendingRect,
  ]);

  // The editor is event driven: it repaints when something changed, not on a loop.
  const sceneRef = useRef(scene);
  const queued = useRef(false);

  const requestDraw = useCallback(() => {
    if (queued.current) return;
    queued.current = true;
    requestAnimationFrame(() => {
      queued.current = false;
      const s = sceneRef.current;
      const canvas = canvasRef.current;
      if (!s || !canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      fitCanvas(canvas, ctx, s.width, s.height);
      drawEditor(ctx, s, () => setImageTick((n) => n + 1));
    });
  }, []);

  useEffect(() => {
    sceneRef.current = scene;
    requestDraw();
  }, [scene, imageTick, requestDraw]);

  useEffect(() => {
    if (width && height) vp.refit(doc.space, width, height);
    requestDraw();
    // Size only: reframing on every edit would fight whoever is drawing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vp, width, height, requestDraw]);

  const toWorldPoint = (e: React.PointerEvent | React.MouseEvent | React.WheelEvent): Vec2 => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return vp.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
  };

  const toCanvasPx = (e: React.PointerEvent | React.WheelEvent): Vec2 => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const boundary = doc.space.boundary;

  const doorWorld = (edge: number): Vec2 | null => {
    const e = doc.space.edges[edge];
    if (!e || e.door == null) return null;
    const a = boundary[edge];
    const b = boundary[(edge + 1) % boundary.length];
    return { x: a.x + e.door * (b.x - a.x), y: a.y + e.door * (b.y - a.y) };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const world = toWorldPoint(e);
    const px = toCanvasPx(e);
    setNotice(null);

    if (e.button === 1 || e.shiftKey) {
      canvasRef.current!.setPointerCapture(e.pointerId);
      dragRef.current = { kind: 'pan', startPx: px };
      return;
    }
    if (e.button !== 0) return;

    const tolM = vp.pxToMetres(PICK_PX);

    if (tool === 'draw') {
      if (boundary.length >= 3 && distanceToPoint(world, boundary[0]) <= tolM) {
        commit({ kind: 'CLOSE' });
        setTool('select');
        setDirty(true);
        return;
      }
      const prev = boundary[boundary.length - 1];
      const prevPrev = boundary[boundary.length - 2];
      const s = snap(world, boundary, vp, { prev, prevPrev });
      commit({ kind: 'ADD_VERTEX', p: s.p });
      setDirty(true);
      return;
    }

    if (tool === 'insert') {
      const edge = pickEdge(world, boundary, tolM);
      if (edge < 0) return;
      const a = boundary[edge];
      const b = boundary[(edge + 1) % boundary.length];
      commit({ kind: 'INSERT_VERTEX', edge, p: projectToEdge(world, a, b) });
      setTool('select');
      setDirty(true);
      return;
    }

    if (tool === 'wall') {
      const edge = pickEdge(world, boundary, tolM);
      if (edge < 0) return;
      setSelectedEdge(edge);
      commit({ kind: 'CYCLE_WALL', i: edge });
      setDirty(true);
      return;
    }

    if (tool === 'door') {
      // Grab an existing marker if the pointer is on one, else drop a new door.
      for (let i = 0; i < doc.space.edges.length; i++) {
        const d = doorWorld(i);
        if (d && distanceToPoint(world, d) <= tolM) {
          canvasRef.current!.setPointerCapture(e.pointerId);
          dragRef.current = { kind: 'door', edge: i, from: doc };
          setSelectedEdge(i);
          return;
        }
      }
      const edge = pickEdge(world, boundary, tolM);
      if (edge < 0) return;
      const a = boundary[edge];
      const b = boundary[(edge + 1) % boundary.length];
      const along = projectToEdge(world, a, b);
      const t = distanceToPoint(along, a) / (distanceToPoint(b, a) || 1);
      setSelectedEdge(edge);
      commit({ kind: 'SET_DOOR', i: edge, t });
      setDirty(true);
      return;
    }

    if (tool === 'box' || tool === 'overhead') {
      canvasRef.current!.setPointerCapture(e.pointerId);
      dragRef.current = { kind: 'rect', start: world, current: world };
      setPendingRect([world, world]);
      return;
    }

    if (tool === 'tree') {
      commit({ kind: 'ADD_OBSTACLE', obstacle: makeTree(world, treeRadius, treeHeight) });
      setSelectedObstacle(doc.space.obstacles.length);
      setDirty(true);
      return;
    }

    if (tool === 'calibrate') {
      canvasRef.current!.setPointerCapture(e.pointerId);
      dragRef.current = { kind: 'calibrate', start: world, current: world };
      setCalibrationLine([world, world]);
      return;
    }

    // select
    const hit = hitTest(world, doc.space, vp, PICK_PX, doc.closed);
    if (hit?.kind === 'vertex') {
      canvasRef.current!.setPointerCapture(e.pointerId);
      dragRef.current = { kind: 'vertex', index: hit.index, from: doc, startPx: px, moved: false };
      setSelectedVertex(hit.index);
      setSelectedEdge(-1);
      return;
    }
    if (hit?.kind === 'edge') {
      setSelectedEdge(hit.index);
      setSelectedVertex(-1);
      return;
    }
    setSelectedVertex(-1);
    setSelectedEdge(-1);
    setSelectedObstacle(pickObstacle(doc.space, world));
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const world = toWorldPoint(e);
    const drag = dragRef.current;

    if (!drag) {
      if (tool === 'draw') {
        const prev = boundary[boundary.length - 1];
        const prevPrev = boundary[boundary.length - 2];
        const s = snap(world, boundary, vp, { prev, prevPrev });
        setHoverPoint(s.p);
        setSnapCue(s);
      } else if (hoverPoint || snapCue) {
        setHoverPoint(null);
        setSnapCue(null);
      }
      return;
    }

    if (drag.kind === 'pan') {
      const px = toCanvasPx(e);
      vp.panBy(px.x - drag.startPx.x, px.y - drag.startPx.y);
      drag.startPx = px;
      requestDraw();
      return;
    }

    if (drag.kind === 'vertex') {
      const px = toCanvasPx(e);
      if (Math.hypot(px.x - drag.startPx.x, px.y - drag.startPx.y) > TAP_PX) drag.moved = true;
      const s = snap(world, boundary, vp, { skip: drag.index });
      setSnapCue(s);
      apply({ kind: 'MOVE_VERTEX', i: drag.index, p: s.p });
      return;
    }

    if (drag.kind === 'door') {
      const a = boundary[drag.edge];
      const b = boundary[(drag.edge + 1) % boundary.length];
      const along = projectToEdge(world, a, b);
      const t = distanceToPoint(along, a) / (distanceToPoint(b, a) || 1);
      apply({ kind: 'SET_DOOR', i: drag.edge, t });
      return;
    }

    if (drag.kind === 'rect') {
      drag.current = world;
      setPendingRect([drag.start, world]);
      return;
    }

    if (drag.kind === 'calibrate') {
      drag.current = world;
      setCalibrationLine([drag.start, world]);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setSnapCue(null);
    if (canvasRef.current?.hasPointerCapture(e.pointerId)) {
      canvasRef.current.releasePointerCapture(e.pointerId);
    }
    if (!drag) return;

    if (drag.kind === 'vertex') {
      // One history step for the whole gesture, whichever way it ended.
      if (drag.moved) {
        commitFrom(drag.from, { kind: 'MOVE_VERTEX', i: drag.index, p: doc.space.boundary[drag.index] });
      } else if (doc.closed && boundary.length > 3) {
        commit({ kind: 'DELETE_VERTEX', i: drag.index });
        setSelectedVertex(-1);
      }
      setDirty(true);
      return;
    }

    if (drag.kind === 'door') {
      commitFrom(drag.from, { kind: 'SET_DOOR', i: drag.edge, t: doc.space.edges[drag.edge].door ?? 0.5 });
      setDirty(true);
      return;
    }

    if (drag.kind === 'rect') {
      setPendingRect(null);
      const moved = Math.hypot(drag.current.x - drag.start.x, drag.current.y - drag.start.y);
      if (moved < 0.05) {
        setNotice('Drag out a rectangle — a single click has nothing to cover.');
        return;
      }
      // Dragging along an edge is a natural gesture and leaves a rectangle with
      // no depth. Give it some rather than throwing the gesture away.
      const [p0, p1] = atLeast(drag.start, drag.current);
      if (tool === 'overhead') {
        commit({ kind: 'SET_OVERHEAD', overhead: makeOverhead(p0, p1, clearance) });
        setTool('select');
        setNotice(`Slab added, ${clearance.toFixed(1)} m above the floor.`);
      } else {
        commit({ kind: 'ADD_OBSTACLE', obstacle: makeBox(p0, p1, boxHeight) });
        setSelectedObstacle(doc.space.obstacles.length);
      }
      setDirty(true);
      return;
    }

    if (drag.kind === 'calibrate') {
      const metres = Math.hypot(drag.current.x - drag.start.x, drag.current.y - drag.start.y);
      if (metres < 0.05) {
        setCalibrationLine(null);
        return;
      }
      setNotice(
        `That line is currently ${metres.toFixed(2)} m. Type its real length on the right to rescale.`,
      );
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    vp.zoomAt(toCanvasPx(e), e.deltaY < 0 ? 1.12 : 1 / 1.12);
    requestDraw();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        setDirty(true);
        return;
      }
      if (e.key === 'Enter' && !doc.closed && boundary.length >= 3) {
        commit({ kind: 'CLOSE' });
        setTool('select');
        setDirty(true);
        return;
      }
      if (e.key === 'Escape') setTool('select');
      const shortcuts: Record<string, Tool> = {
        v: 'select',
        d: 'draw',
        a: 'insert',
        w: 'wall',
        r: 'door',
        b: 'box',
        t: 'tree',
        o: 'overhead',
      };
      const next = shortcuts[e.key.toLowerCase()];
      if (next && (!NEEDS_SHAPE.includes(next) || doc.closed)) setTool(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, commit, doc.closed, boundary.length]);

  const save = () => {
    persist(doc.space);
    setDirty(false);
  };

  const saveAndOpen = () => {
    persist(doc.space);
    setDirty(false);
    navigate(`/studio/${doc.space.id}`);
  };

  const shapeReady = doc.closed && boundary.length >= 3;

  return (
    <div className="workspace">
      <EditorSidebar
        doc={doc}
        tool={tool}
        setTool={setTool}
        commit={commit}
        selectedEdge={selectedEdge}
        setSelectedEdge={setSelectedEdge}
        setHoveredEdge={setHoveredEdge}
        selectedObstacle={selectedObstacle}
        setSelectedObstacle={setSelectedObstacle}
        boxHeight={boxHeight}
        setBoxHeight={setBoxHeight}
        treeRadius={treeRadius}
        setTreeRadius={setTreeRadius}
        treeHeight={treeHeight}
        setTreeHeight={setTreeHeight}
        clearance={clearance}
        setClearance={setClearance}
        calibrationLine={calibrationLine}
        setCalibrationLine={setCalibrationLine}
        notice={notice ?? storeError}
        setNotice={setNotice}
        markDirty={() => setDirty(true)}
        undo={() => {
          undo();
          setDirty(true);
        }}
        redo={() => {
          redo();
          setDirty(true);
        }}
        canUndo={canUndo}
        canRedo={canRedo}
        fitView={() => {
          if (!width || !height) return;
          vp.reset();
          vp.refit(doc.space, width, height);
          requestDraw();
        }}
      />

      <div className="stage">
        <canvas
          className="plan"
          ref={(el) => {
            canvasRef.current = el;
            sizeRef.current = el;
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => {
            setHoverPoint(null);
            setSnapCue(null);
          }}
          onWheel={onWheel}
          onContextMenu={(e) => e.preventDefault()}
          aria-label={`Plan of ${doc.space.name}`}
        />
        <div className={notice ? 'overlay loud' : 'overlay'}>
          {notice ?? `${TOOL_HINT[tool]} · shift-drag to pan, scroll to zoom`}
        </div>
      </div>

      <div className="readout editor-footer">
        <span>
          <span className="k">area</span>{' '}
          <b>{shapeReady ? `${area(boundary).toFixed(1)} m²` : 'not closed yet'}</b>
        </span>
        <span>
          <span className="k">corners</span> <b>{boundary.length}</b>
        </span>
        <span>
          <span className="k">obstacles</span> <b>{doc.space.obstacles.length}</b>
        </span>
        <span>
          <span className="k">overhead</span> <b>{doc.space.overhead ? 'yes' : 'none'}</b>
        </span>
        <span className="spacer" />
        <span>
          <button onClick={save} disabled={!dirty}>
            {dirty ? 'Save' : 'Saved'}
          </button>{' '}
          <button className="primary" onClick={saveAndOpen} disabled={!shapeReady}>
            Save and see the sun
          </button>
        </span>
      </div>
    </div>
  );
}

function pickObstacle(space: Space, world: Vec2): number {
  for (let i = space.obstacles.length - 1; i >= 0; i--) {
    const o = space.obstacles[i];
    if (o.footprint.length < 3) continue;
    const xs = o.footprint.map((p) => p.x);
    const ys = o.footprint.map((p) => p.y);
    if (
      world.x >= Math.min(...xs) &&
      world.x <= Math.max(...xs) &&
      world.y >= Math.min(...ys) &&
      world.y <= Math.max(...ys)
    ) {
      return i;
    }
  }
  return -1;
}
