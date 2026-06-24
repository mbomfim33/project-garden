import { mockCatalogApi, type CatalogApi } from './catalog';
import { mockGardenAiApi, type GardenAiApi } from './gardenAi';

/**
 * The single place the app picks which data-layer implementation to use —
 * the React equivalent of the Angular `app.config.ts` provider swap.
 *
 * To go live, change these to `httpGardenAiApi` / `httpCatalogApi`
 * (exported from the same modules). Nothing else in the app changes.
 */
export const gardenAi: GardenAiApi = mockGardenAiApi;
export const catalogApi: CatalogApi = mockCatalogApi;
