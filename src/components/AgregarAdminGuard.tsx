"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppSelector } from "@/redux/store";
import { isAgregarAdmin } from "@/lib/roles";

/**
 * Client-side gate for platform-only pages (institution management). Allows
 * AGREGAR_ADMIN / SYSTEM_ADMIN only. Backend enforces the real 403.
 * Rehydration-aware, mirrors RoleGuard / RegulatorGuard.
 */
export default function AgregarAdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, roles } = useAppSelector((s) => s.auth);
  const isRehydrated = useAppSelector(
    (s) => (s.auth as unknown as { _persist?: { rehydrated: boolean } })._persist?.rehydrated ?? false,
  );
  const router = useRouter();

  const hasAccess = isAgregarAdmin(roles);

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
