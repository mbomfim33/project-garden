import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GardenProfile } from '../api/types';
import { buildAlerts, computeEcoSummary } from '../lib/eco';

interface ProfileState {
  profile: GardenProfile | null;
  setProfile: (profile: GardenProfile) => void;
  clear: () => void;
}

/**
 * Garden profile store (client state). Zustand + `persist` middleware
 * handles localStorage hydration automatically — no provider needed.
 * Replaces the React-Context version.
 *
 * On React Native, swap the persist storage for AsyncStorage/MMKV:
 *   persist(fn, { name, storage: createJSONStorage(() => AsyncStorage) })
 */
export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),
      clear: () => set({ profile: null }),
    }),
    { name: 'plantai.profile' },
  ),
);

/** Derived: economic summary, memoised on the profile. */
export function useEcoSummary() {
  const profile = useProfileStore((s) => s.profile);
  return useMemo(() => (profile ? computeEcoSummary(profile.area) : null), [profile]);
}

/** Derived: home-dashboard alerts. */
export function useAlerts() {
  const profile = useProfileStore((s) => s.profile);
  return useMemo(() => (profile ? buildAlerts(profile) : []), [profile]);
}
