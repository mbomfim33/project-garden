import type {
  ChatMessage,
  GardenProfile,
  GardenProject,
  PlantDiagnosis,
  TimelineItem,
} from './types';
import { answerMockChat } from './mock/chat';
import { pickMockDiagnosis } from './mock/diagnosis';
import { buildMockProject } from './mock/project';
import { buildMockSchedule } from './mock/schedule';

/**
 * Contract for every "AI" capability. The React app consumes this through
 * TanStack Query (mutations), so methods return Promises. Swap the active
 * implementation in `client.ts` from `mockGardenAiApi` to `httpGardenAiApi`
 * when the real backend exists — no component changes needed.
 */
export interface GardenAiApi {
  generateProject(profile: GardenProfile): Promise<GardenProject>;
  generateSchedule(profile: GardenProfile): Promise<TimelineItem[]>;
  diagnosePlant(imageBase64: string, profile: GardenProfile): Promise<PlantDiagnosis>;
  sendChatMessage(history: ChatMessage[], profile: GardenProfile): Promise<string>;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const latency = (min: number, max: number) => Math.round(min + Math.random() * (max - min));

/** In-memory mock — wired up today (see client.ts). */
export const mockGardenAiApi: GardenAiApi = {
  async generateProject(profile) {
    await delay(latency(900, 1600));
    return buildMockProject(profile);
  },
  async generateSchedule(profile) {
    await delay(latency(800, 1400));
    return buildMockSchedule(profile);
  },
  async diagnosePlant(imageBase64) {
    await delay(latency(1000, 1800));
    return pickMockDiagnosis(imageBase64);
  },
  async sendChatMessage(history, profile) {
    await delay(latency(700, 1300));
    return answerMockChat(history, profile);
  },
};

const API_BASE = '/api';

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

/**
 * Real HTTP-backed implementation, ready for the backend. NOT wired up
 * yet — point `client.ts` at this to go live. The backend owns the
 * Anthropic call + parsing and returns the structured shapes above.
 */
export const httpGardenAiApi: GardenAiApi = {
  generateProject: (profile) => postJson<GardenProject>('/project', { profile }),
  generateSchedule: (profile) => postJson<TimelineItem[]>('/schedule', { profile }),
  diagnosePlant: (image, profile) => postJson<PlantDiagnosis>('/diagnose', { image, profile }),
  sendChatMessage: (history, profile) =>
    postJson<{ reply: string }>('/chat', { history, profile }).then((r) => r.reply),
};
