import { useMutation, useQuery } from '@tanstack/react-query';
import { catalogApi, gardenAi } from '../api/client';
import type { ChatMessage, GardenProfile } from '../api/types';

/**
 * TanStack Query hooks for the data layer.
 *
 * The four AI capabilities are user-triggered actions → `useMutation`
 * (imperative `mutate()`, with `isPending` / `data` / `error` / `reset`
 * handed back for free — no manual loading/error signals like in Angular).
 *
 * The catalog lists load on view → `useQuery` (cached by key, dedup'd,
 * refetch policy centralised in the QueryClient).
 */

export function useGenerateProject() {
  return useMutation({
    mutationFn: (profile: GardenProfile) => gardenAi.generateProject(profile),
  });
}

export function useGenerateSchedule() {
  return useMutation({
    mutationFn: (profile: GardenProfile) => gardenAi.generateSchedule(profile),
  });
}

export function useDiagnosePlant() {
  return useMutation({
    mutationFn: (vars: { image: string; profile: GardenProfile }) =>
      gardenAi.diagnosePlant(vars.image, vars.profile),
  });
}

export function useSendChat() {
  return useMutation({
    mutationFn: (vars: { history: ChatMessage[]; profile: GardenProfile }) =>
      gardenAi.sendChatMessage(vars.history, vars.profile),
  });
}

export function usePlans() {
  return useQuery({ queryKey: ['plans'], queryFn: () => catalogApi.getPlans() });
}

export function useProducts() {
  return useQuery({ queryKey: ['products'], queryFn: () => catalogApi.getProducts() });
}

export function useCommunity() {
  return useQuery({ queryKey: ['community'], queryFn: () => catalogApi.getCommunityRanking() });
}
