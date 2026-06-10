"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppSelector } from "@/redux/store";
import { isAgregarAdmin, isRegulator } from "@/lib/roles";

/**
 * Client-side gate for the regulator dashboard. Allows REGULATOR_VIEWER and
 * platform admins (who can see all filings). Backend still 403s the /filings
 * endpoints for everyone else — this is UX, not security.
 *
 * Rehydration-aware: redux-persist restores `roles` async, so we wait for
 * rehydration before deciding to redirect (mirrors RoleGuard).
 */
export default function RegulatorGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, roles } = useAppSelector((s) => s.auth);
  const isRehydrated = useAppSelector(
    (s) => (s.auth as unknown as { _persist?: { rehydrated: boolean } })._persist?.rehydrated ?? false,
  );
  const router = useRouter();

  const hasAccess = isRegulator(roles) || isAgregarAdmin(roles);

  useEffect(() => {
    if (!isRehydrated) return;
    if (isAuthenticated && !hasAccess) {
      router.replace("/dashboard");
    }
  }, [isRehydrated, isAuthenticated, hasAccess, router]);

  if (!isRehydrated || !isAuthenticated || !hasAccess) {
    return null;
  }

  return <>{children}</>;
}
