import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useProfileStore } from '../state/profileStore';

/**
 * Route guard: redirect to /onboarding when no profile exists yet.
 * React counterpart to Angular's `profileGuard`.
 */
export function RequireProfile({ children }: { children: ReactNode }) {
  const profile = useProfileStore((s) => s.profile);
  if (!profile) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}
