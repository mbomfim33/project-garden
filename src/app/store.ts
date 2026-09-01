import { create } from 'zustand';
import type { Space, SpaceType } from '../space/types';
import { SpaceStore, newSpace } from '../space/store';
import { seedSpaces } from '../space/seeds';

const SEEDED_KEY = 'project-garden.seeded.v1';

/**
 * Puts the three worked examples in on a first visit so the app has something
 * to show. Only once — clearing them out is allowed to stick.
 */
function seedOnce(): void {
  try {
    if (localStorage.getItem(SEEDED_KEY)) return;
    localStorage.setItem(SEEDED_KEY, '1');
    if (SpaceStore.list().length) return;
    for (const s of seedSpaces()) SpaceStore.save(s);
  } catch {
    // Private mode with storage disabled: run without saved spaces.
  }
}

function hydrate(): Record<string, Space> {
  seedOnce();
  return Object.fromEntries(SpaceStore.list().map((s) => [s.id, s]));
}

type State = {
  spaces: Record<string, Space>;
  error: string | null;
  save: (space: Space) => Space;
  create: (type: SpaceType, lat?: number) => Space;
  remove: (id: string) => void;
  duplicate: (id: string) => Space | null;
  importFile: (file: File) => Promise<Space | null>;
  clearError: () => void;
};

export const useSpaces = create<State>((set) => ({
  spaces: hydrate(),
  error: null,

  save(space) {
    try {
      const saved = SpaceStore.save(space);
      // A fresh object each time, so anything memoised on the space recomputes.
      set((s) => ({ spaces: { ...s.spaces, [saved.id]: saved }, error: null }));
      return saved;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Could not save that space.' });
      return space;
    }
  },

  create(type, lat) {
    const space = newSpace(type, lat);
    SpaceStore.save(space);
    set((s) => ({ spaces: { ...s.spaces, [space.id]: space } }));
    return space;
  },

  remove(id) {
    SpaceStore.remove(id);
    set((s) => {
      const next = { ...s.spaces };
      delete next[id];
      return { spaces: next };
    });
  },

  duplicate(id) {
    const copy = SpaceStore.duplicate(id);
    if (copy) set((s) => ({ spaces: { ...s.spaces, [copy.id]: copy } }));
    return copy;
  },

  async importFile(file) {
    try {
      const space = await SpaceStore.import(file);
      set((s) => ({ spaces: { ...s.spaces, [space.id]: space }, error: null }));
      return space;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'That file is not a saved space.' });
      return null;
    }
  },

  clearError: () => set({ error: null }),
}));
