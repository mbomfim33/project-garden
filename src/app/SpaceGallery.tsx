import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Space } from '../space/types';
import { area } from '../engine';
import { downloadSpace } from '../space/store';
import { useSpaces } from './store';
import { PlanThumb } from './PlanThumb';

const TYPE_LABEL: Record<Space['type'], string> = {
  balcony: 'Balcony',
  garden: 'Garden',
  land: 'Plot',
};

export function SpaceGallery() {
  // Select the map, not a derived array: a fresh array every call would make the
  // store's snapshot never compare equal and spin forever.
  const byId = useSpaces((s) => s.spaces);
  const spaces = useMemo(() => Object.values(byId), [byId]);
  const create = useSpaces((s) => s.create);
  const remove = useSpaces((s) => s.remove);
  const duplicate = useSpaces((s) => s.duplicate);
  const importFile = useSpaces((s) => s.importFile);
  const error = useSpaces((s) => s.error);
  const clearError = useSpaces((s) => s.clearError);
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => clearError, [clearError]);

  const start = (type: Space['type']) => {
    const space = create(type);
    navigate(`/editor/${space.id}`);
  };

  return (
    <div className="gallery">
      <h1>Spaces</h1>
      <p className="lede">
        Draw a space, then mark the walls, trees and roofs around it. The app works out how many
        hours of sun each part of it gets, on the longest day of the year and on the shortest.
      </p>

      {error ? (
        <p className="notice warn" role="alert">
          {error}
        </p>
      ) : null}

      <div className="newrow">
        <button className="primary" onClick={() => start('balcony')}>
          + Balcony
        </button>
        <button className="primary" onClick={() => start('garden')}>
          + Garden
        </button>
        <button className="primary" onClick={() => start('land')}>
          + Plot of land
        </button>
        <button className="ghost" onClick={() => fileRef.current?.click()}>
          Open a file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            const space = await importFile(file);
            if (space) navigate(`/studio/${space.id}`);
          }}
        />
      </div>

      {spaces.length === 0 ? (
        <p className="empty">No spaces yet. Add one above.</p>
      ) : (
        <ul className="cards">
          {spaces.map((space) => (
            <li className="card" key={space.id}>
              <PlanThumb space={space} onClick={() => navigate(`/studio/${space.id}`)} />
              <div className="cbody">
                <h2>{space.name}</h2>
                <div className="meta">
                  <span>{TYPE_LABEL[space.type]}</span>
                  <span>{space.boundary.length >= 3 ? `${area(space.boundary).toFixed(1)} m²` : 'not drawn'}</span>
                  <span>
                    {Math.abs(space.geo.lat).toFixed(1)}° {space.geo.lat >= 0 ? 'N' : 'S'}
                  </span>
                </div>
                <div className="actions">
                  <button className="primary" onClick={() => navigate(`/studio/${space.id}`)}>
                    Open
                  </button>
                  <button className="ghost" onClick={() => navigate(`/editor/${space.id}`)}>
                    Edit
                  </button>
                  <button className="ghost" onClick={() => duplicate(space.id)}>
                    Copy
                  </button>
                  <button className="ghost" onClick={() => downloadSpace(space.id, space.name)}>
                    Save to file
                  </button>
                  <button
                    className="ghost danger"
                    onClick={() => {
                      if (confirm(`Delete "${space.name}"? You cannot undo this.`)) remove(space.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
