/**
 * Role-tier helpers for the multi-tenant model.
 *
 * Three tiers (see CONTRACT.md §3):
 *   - Platform  → AGREGAR_ADMIN / SYSTEM_ADMIN: cross-tenant, owns institutions
 *   - Regulator → REGULATOR_VIEWER: read-only filed STR/CTR, jurisdiction-scoped
 *   - Institution → everyone else (CLIENT_ADMIN, COMPLIANCE_OFFICER, ANALYST, …)
 *
 * `/auth/me` returns only `roles` + `permissions` (no institution fields), so
 * tier is derived from role names here. Backend RLS does the real scoping —
 * these helpers are for UI routing/nav only.
 */

export const AGREGAR_ADMIN_ROLES = ["AGREGAR_ADMIN", "SYSTEM_ADMIN"] as const;
export const REGULATOR_ROLES = ["REGULATOR_VIEWER"] as const;

export function isAgregarAdmin(roles: string[] | undefined | null): boolean {
  if (!roles) return false;
  return roles.some((r) => (AGREGAR_ADMIN_ROLES as readonly string[]).includes(r));
}

export function isRegulator(roles: string[] | undefined | null): boolean {
  if (!roles) return false;
  return roles.some((r) => (REGULATOR_ROLES as readonly string[]).includes(r));
}

/** Institution-tier user (not platform, not regulator). */
export function isInstitutionUser(roles: string[] | undefined | null): boolean {
  return !isAgregarAdmin(roles) && !isRegulator(roles);
}
