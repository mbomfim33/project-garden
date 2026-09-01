import type { Space, SpaceType } from './types';
import { SCHEMA_VERSION, migrate } from './migrate';

export const KEY = 'project-garden.spaces.v1';

export class QuotaError extends Error {
  constructor() {
    super('No more space in the browser. Remove the background image, or delete a space.');
    this.name = 'QuotaError';
  }
}

function isQuotaError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  return e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED';
}

function read(): Record<string, Space> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

function write(all: Record<string, Space>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch (e) {
    if (isQuotaError(e)) throw new QuotaError();
    throw e;
  }
}

export const SpaceStore = {
  /** Everything on disk, each one brought forward to the current schema. */
  list(): Space[] {
    return Object.values(read()).map(migrate);
  },

  load(id: string): Space | null {
    const s = read()[id];
    return s ? migrate(s) : null;
  },

  save(space: Space): Space {
    const stamped = { ...space, schemaVersion: SCHEMA_VERSION };
    const all = read();
    all[stamped.id] = stamped;
    write(all);
    return stamped;
  },

  remove(id: string): void {
    const all = read();
    delete all[id];
    write(all);
  },

  duplicate(id: string): Space | null {
    const source = this.load(id);
    if (!source) return null;
    const copy = structuredClone(source);
    copy.id = newId();
    copy.name = `${copy.name} copy`;
    return this.save(copy);
  },

  export(id: string): Blob | null {
    const space = this.load(id);
    if (!space) return null;
    return new Blob([JSON.stringify(space, null, 2)], { type: 'application/json' });
  },

  /** Reads a picked file, migrates it and gives it a fresh id so nothing gets clobbered. */
  async import(file: File): Promise<Space> {
    const space = migrate(JSON.parse(await file.text()));
    space.id = newId();
    return this.save(space);
  },
};

export function newId(): string {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  // Insecure origins don't get randomUUID.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map((n) => n.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const DEFAULT_NAME: Record<SpaceType, string> = {
  balcony: 'Untitled balcony',
  garden: 'Untitled garden',
  land: 'Untitled plot',
};

export function newSpace(type: SpaceType, lat = -23.5): Space {
  return {
    id: newId(),
    name: DEFAULT_NAME[type],
    type,
    boundary: [],
    edges: [],
    obstacles: [],
    geo: { lat, bearing: 0 },
    schemaVersion: SCHEMA_VERSION,
  };
}

export function downloadSpace(id: string, name: string): void {
  const blob = SpaceStore.export(id);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[^\w.-]+/g, '_') || 'space'}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Safari cancels an in-flight download if you revoke in the same tick.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
