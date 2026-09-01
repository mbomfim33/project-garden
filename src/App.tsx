import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { resolveCellSize } from './engine';
import { useSpaces } from './app/store';
import { useGridWorker } from './app/useGridWorker';
import { SpaceGallery } from './app/SpaceGallery';
import { SpaceStudio } from './studio/SpaceStudio';
import { SpaceEditor } from './editor/SpaceEditor';

function Topbar() {
  return (
    <header className="topbar">
      <Link className="brand" to="/">
        Project <b>Garden</b>
      </Link>
      <span className="spacer" />
      <nav>
        <Link to="/">
          <button className="ghost">Spaces</button>
        </Link>
      </nav>
    </header>
  );
}

function StudioScreen() {
  const { id } = useParams();
  const space = useSpaces((s) => (id ? s.spaces[id] : undefined));
  const cellSize = space ? resolveCellSize(space) : undefined;
  const { grid, pending, error } = useGridWorker(space ?? null, cellSize);

  if (!space) return <Navigate to="/" replace />;
  if (space.boundary.length < 3) return <Navigate to={`/editor/${space.id}`} replace />;

  if (error) {
    return (
      <p className="pending" role="alert">
        {error}
      </p>
    );
  }
  if (!grid) {
    return (
      <p className="pending" aria-busy={pending}>
        Calculating…
      </p>
    );
  }
  return <SpaceStudio space={space} grid={grid} />;
}

function EditorScreen() {
  const { id } = useParams();
  const space = useSpaces((s) => (id ? s.spaces[id] : undefined));
  if (!space) return <Navigate to="/" replace />;
  return <SpaceEditor space={space} />;
}

export function App() {
  return (
    <div className="shell">
      <Topbar />
      <main className="main">
        <Routes>
          <Route path="/" element={<SpaceGallery />} />
          <Route path="/editor/:id" element={<EditorScreen />} />
          <Route path="/studio/:id" element={<StudioScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
