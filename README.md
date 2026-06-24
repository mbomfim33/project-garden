# PlantAI 🌿 — React + TanStack Query build

The same app as `../plantai-app` (Angular 22), rebuilt with **React 19 + Vite +
TanStack Query + React Router** to compare the two stacks. Identical UI (same
global stylesheet) and the same mocked data layer.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
```

## Architecture

```
src/
  api/
    types.ts           shared model types
    gardenAi.ts        GardenAiApi interface + mock + http impls (Promises)
    catalog.ts         CatalogApi interface + mock + http impls
    client.ts          ← the swap point (mock ↔ real), like Angular's app.config
    mock/              profile-driven mock generators + static catalog data
  hooks/
    queries.ts         TanStack Query hooks: useMutation (AI actions) + useQuery (catalog)
  state/
    profileStore.ts    Zustand store + persist/localStorage (≈ Angular ProfileStore)
    cartStore.ts       Zustand cart store (≈ Angular CartStore)
  lib/                 eco math, readImage (FileReader), BRL formatting
  components/          AppShell (header+nav+Outlet), RequireProfile (guard)
  features/            Onboarding · Home · Project · Schedule · Diagnosis · Chat · More
  App.tsx              <Routes>
  main.tsx             QueryClientProvider > BrowserRouter   (Zustand needs no provider)
```

## Data layer

- **AI actions** (project, schedule, diagnosis, chat) are user-triggered →
  `useMutation`. TanStack hands back `isPending` / `data` / `error` / `reset`,
  so there are no hand-rolled loading/error flags.
- **Catalog** (plans, products, community) loads on view → `useQuery`, cached by
  key with the refetch policy set once on the `QueryClient`.
- The mock vs real swap is one file: `src/api/client.ts` (point it at
  `httpGardenAiApi` / `httpCatalogApi`). Same idea as the Angular provider swap.
- Client state (profile, cart) lives in **Zustand** stores — module-level, no
  provider, `persist` middleware for localStorage. Components subscribe with
  selectors (`useProfileStore(s => s.profile)`).

No tests in this build (by request) — it exists to contrast the stacks. See
`~/Documents/Personal/Plant-AI/ANGULAR_VS_REACT.md`.
