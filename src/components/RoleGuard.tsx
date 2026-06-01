"use client";

import { useRouter } from "next/navigation";
import { useAppSelector } from "@/redux/store";
import { useEffect } from "react";

interface RoleGuardProps {
  children: React.ReactNode;
  /** Roles allowed to view the page. Empty array = all authenticated users. */
  allowedRoles: string[];
}

/**
 * Convenience client-side guard for routes that aren't yet protected by the
 * sidebar filter (e.g. deep links). Backend still enforces 403 — this is UX,
 * not security.
 */
export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { isAuthenticated, roles } = useAppSelector((s) => s.auth);
  const isRehydrated = useAppSelector(
    (s) => (s.auth as unknown as { _persist?: { rehydrated: boolean } })._persist?.rehydrated ?? false,
  );
  const router = useRouter();

  const hasAccess =
    !isAuthenticated ||
    allowedRoles.length === 0 ||
    roles.some((r) => allowedRoles.includes(r));

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
