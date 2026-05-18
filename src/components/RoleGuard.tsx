"use client";

import { useRouter } from "next/navigation";
import { useAppSelector } from "@/redux/store";
import { useEffect } from "react";

interface RoleGuardProps {
  children: React.ReactNode;
  /** Roles that are allowed to access the page. Empty array = all roles allowed. */
  allowedRoles: string[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { isAdmin, isAuthenticated, userRole } = useAppSelector((s) => s.auth);
  // Wait for redux-persist to finish rehydrating before making access decisions
  const isRehydrated = useAppSelector((s) => (s.auth as unknown as { _persist?: { rehydrated: boolean } })._persist?.rehydrated ?? false);
  const router = useRouter();

  // Platform admins always have access to client pages (they bypass RBAC)
  // Client owners (non-team-member) default to OWNER
  const effectiveRole = isAdmin ? null : (userRole || "OWNER");

  const hasAccess =
    !isAuthenticated ||
    isAdmin ||
    allowedRoles.length === 0 ||
    (effectiveRole && allowedRoles.includes(effectiveRole));

  useEffect(() => {
    if (!isRehydrated) return;
    if (isAuthenticated && !isAdmin && !hasAccess) {
      router.replace("/dashboard");
    }
  }, [isRehydrated, isAuthenticated, isAdmin, hasAccess, router]);

  // Don't render or redirect until rehydration is complete
  if (!isRehydrated || !isAuthenticated || (!isAdmin && !hasAccess)) {
    return null;
  }

  return <>{children}</>;
}
