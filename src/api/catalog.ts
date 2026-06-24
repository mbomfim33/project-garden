import type { CommunityEntry, Plan, Product } from './types';
import { MOCK_COMMUNITY, MOCK_PLANS, MOCK_PRODUCTS } from './mock/catalog';

/** Contract for the static commerce/community data (the "Mais" tab). */
export interface CatalogApi {
  getPlans(): Promise<Plan[]>;
  getProducts(): Promise<Product[]>;
  getCommunityRanking(): Promise<CommunityEntry[]>;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockCatalogApi: CatalogApi = {
  async getPlans() {
    await delay(150);
    return MOCK_PLANS;
  },
  async getProducts() {
    await delay(150);
    return MOCK_PRODUCTS;
  },
  async getCommunityRanking() {
    await delay(150);
    return MOCK_COMMUNITY;
  },
};

const API_BASE = '/api';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

/** Real HTTP-backed implementation, ready for the backend. */
export const httpCatalogApi: CatalogApi = {
  getPlans: () => getJson<Plan[]>('/plans'),
  getProducts: () => getJson<Product[]>('/products'),
  getCommunityRanking: () => getJson<CommunityEntry[]>('/community'),
};
