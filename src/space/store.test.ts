import { beforeEach, describe, expect, it } from 'vitest';
import { KEY, SpaceStore, newSpace } from './store';
import { SCHEMA_VERSION, migrate } from './migrate';
import type { Space } from './types';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage;
}

beforeEach(() => {
  globalThis.localStorage = memoryStorage();
});

function square(): Space {
  const s = newSpace('balcony');
  s.boundary = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 2.5 },
    { x: 0, y: 2.5 },
  ];
  s.edges = s.boundary.map(() => ({ wall: 'none' as const, height: 0 }));
  return s;
}

describe('SpaceStore', () => {
  it('round-trips a space through storage', () => {
    const space = square();
    space.name = 'Back balcony';
    space.edges[0] = { wall: 'full', height: 3, door: 0.4 };
    SpaceStore.save(space);

    const loaded = SpaceStore.load(space.id);
    // Reading fills in the fields a space may leave out.
    expect(loaded).toEqual({ ...space, overheads: [], schemaVersion: SCHEMA_VERSION });
  });

  it('keeps spaces separate and lists them all', () => {
    const a = square();
    const b = square();
    SpaceStore.save(a);
    SpaceStore.save(b);
    expect(SpaceStore.list().map((s) => s.id).sort()).toEqual([a.id, b.id].sort());
  });

  it('returns null for an unknown id and after removal', () => {
    const space = SpaceStore.save(square());
    SpaceStore.remove(space.id);
    expect(SpaceStore.load(space.id)).toBeNull();
    expect(SpaceStore.load('nope')).toBeNull();
  });

  it('survives a corrupt blob rather than throwing', () => {
    localStorage.setItem(KEY, '{not json');
    expect(SpaceStore.list()).toEqual([]);
  });

  it('duplicates deeply, under a fresh id', () => {
    const space = SpaceStore.save(square());
    const copy = SpaceStore.duplicate(space.id)!;

    expect(copy.id).not.toBe(space.id);
    expect(copy.name).toBe(`${space.name} copy`);

    copy.boundary[0].x = 99;
    SpaceStore.save(copy);
    expect(SpaceStore.load(space.id)!.boundary[0].x).toBe(0);
  });

  it('re-ids on import so it never clobbers an existing space', async () => {
    const space = SpaceStore.save(square());
    const file = new File([JSON.stringify(space)], 'space.json', { type: 'application/json' });

    const imported = await SpaceStore.import(file);
    expect(imported.id).not.toBe(space.id);
    expect(imported.boundary).toEqual(space.boundary);
    expect(SpaceStore.list()).toHaveLength(2);
  });
});

describe('migrate', () => {
  it('backfills a short edges array to match the boundary', () => {
    const s = migrate({ ...square(), edges: [{ wall: 'full', height: 3 }] });
    expect(s.edges).toHaveLength(4);
    expect(s.edges[0]).toEqual({ wall: 'full', height: 3 });
    expect(s.edges[3]).toEqual({ wall: 'none', height: 0 });
  });

  it('truncates a long edges array', () => {
    const base = square();
    const s = migrate({ ...base, edges: [...base.edges, { wall: 'full', height: 2 }] });
    expect(s.edges).toHaveLength(4);
  });

  it('moves a single old roof into the list of roof pieces', () => {
    const slab = { footprint: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }], height: 2.6 };
    const old = { ...square(), schemaVersion: 1, overhead: slab };
    delete (old as Record<string, unknown>).overheads;

    const s = migrate(old);
    expect(s.overheads).toEqual([slab]);
    expect('overhead' in s).toBe(false);
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('gives a space with no roof an empty list rather than nothing', () => {
    const s = migrate({ ...square(), schemaVersion: 1 });
    expect(s.overheads).toEqual([]);
  });

  it('refuses a file from a newer build rather than mangling it', () => {
    expect(() => migrate({ ...square(), schemaVersion: 999 })).toThrow(/newer/);
  });

  it('does not mutate the object it was handed', () => {
    const raw = { ...square(), edges: [] };
    migrate(raw);
    expect(raw.edges).toHaveLength(0);
  });
});
