/**
 * Persona model — the per-role dashboard experience.
 *
 * A user holds RBAC *roles*; a persona is the *experience* they see (landing
 * view + nav profile). Roles map to one or more entitled personas, and a
 * multi-role user can switch between the personas they're entitled to
 * (see PersonaSwitcher + authSlice.activePersona).
 *
 * This is UI shaping only — the backend RLS still enforces what data each user
 * can actually read, regardless of which persona is active.
 *
 * Design notes:
 *  - Investigator is folded into the scoped `analyst` persona (case-first work,
 *    scoped to own caseload) — not a separate nav, per product decision.
 *  - SENIOR_ANALYST entitles BOTH `supervisor` (team board) and `analyst`
 *    (my-queue), so a supervisor can switch between oversight and hands-on work.
 *  - AGREGAR_ADMIN is `platform` only: tenant oversight, NO single-tenant
 *    casework.
 */

export type Persona =
  | "platform" // Agregar super admin — cross-tenant oversight
  | "regulator" // EOCO / FIC — read-only filed reports
  | "client_admin" // institution owner — everything for one institution
  | "compliance" // compliance officer — filing + four-eyes checker
  | "supervisor" // senior analyst — team board, assignment, SLA
  | "ml" // model ops
  | "dpo" // data protection — DSAR / erasure
  | "auditor" // read-only across audit/rules/analytics
  | "analyst" // risk analyst / investigator — scoped my-queue
  | "default"; // operations / read-only / fallback

/** Highest-authority first. Drives the default active persona. */
export const PERSONA_PRECEDENCE: Persona[] = [
  "platform",
  "regulator",
  "client_admin",
  "compliance",
  "supervisor",
  "ml",
  "dpo",
  "auditor",
  "analyst",
  "default",
];

// The super admin can "view as" any persona — useful for oversight and QA of
// what each role sees. Their default is still `platform` (precedence), but the
// switcher lets them drop into a client-admin / compliance / analyst view, etc.
const SUPER_ADMIN_PERSONAS: Persona[] = [
  "platform",
  "client_admin",
  "compliance",
  "supervisor",
  "ml",
  "dpo",
  "auditor",
  "analyst",
];

/** Which personas each RBAC role entitles a user to. */
const ROLE_PERSONAS: Record<string, Persona[]> = {
  AGREGAR_ADMIN: SUPER_ADMIN_PERSONAS,
  SYSTEM_ADMIN: SUPER_ADMIN_PERSONAS,
  REGULATOR_VIEWER: ["regulator"],
  CLIENT_ADMIN: ["client_admin"],
  COMPLIANCE_OFFICER: ["compliance"],
  SENIOR_ANALYST: ["supervisor", "analyst"],
  ANALYST: ["analyst"],
  ML_ENGINEER: ["ml"],
  DPO: ["dpo"],
  AUDITOR: ["auditor"],
  OPERATIONS: ["default"],
  READONLY: ["default"],
};

export interface PersonaMeta {
  /** Short label for the switcher + sidebar tier line. */
  label: string;
  /** Landing-page H1. */
  title: string;
  /** Landing-page subtitle. */
  blurb: string;
}

export const PERSONA_META: Record<Persona, PersonaMeta> = {
  platform: {
    label: "Platform Admin",
    title: "Platform Control Tower",
    blurb: "Tenant oversight across all institutions",
  },
  regulator: {
    label: "Regulator",
    title: "Regulator Dashboard",
    blurb: "Filed STR/CTR oversight, jurisdiction-scoped",
  },
  client_admin: {
    label: "Institution Admin",
    title: "Institution Overview",
    blurb: "Operations, team & integration for your institution",
  },
  compliance: {
    label: "Compliance",
    title: "Compliance Desk",
    blurb: "Approvals, STR/CTR filing & sanctions",
  },
  supervisor: {
    label: "Supervisor",
    title: "Team Board",
    blurb: "Caseload, assignment & SLA across your team",
  },
  ml: {
    label: "Model Ops",
    title: "Model Operations",
    blurb: "Risk-scoring model health & drift",
  },
  dpo: {
    label: "Data Protection",
    title: "Data Protection",
    blurb: "DSAR requests & PII erasure",
  },
  auditor: {
    label: "Auditor",
    title: "Audit Overview",
    blurb: "Read-only audit trail, rules & analytics",
  },
  analyst: {
    label: "Analyst",
    title: "My Triage Queue",
    blurb: "Your assigned alerts and cases",
  },
  default: {
    label: "Console",
    title: "Overview",
    blurb: "Transaction monitoring console",
  },
};

/** All personas a user may switch between, ordered by precedence. */
export function personasForRoles(roles: string[] | undefined | null): Persona[] {
  const set = new Set<Persona>();
  for (const role of roles ?? []) {
    for (const p of ROLE_PERSONAS[role] ?? []) set.add(p);
  }
  if (set.size === 0) set.add("default");
  return PERSONA_PRECEDENCE.filter((p) => set.has(p));
}

/** The default active persona for a user (highest-precedence entitlement). */
export function resolvePersona(roles: string[] | undefined | null): Persona {
  return personasForRoles(roles)[0] ?? "default";
}

/**
 * The active persona to render: the user's chosen one if it's still valid for
 * their roles, otherwise the resolved default. Guards against a stale persisted
 * persona after a role change.
 */
export function effectivePersona(
  roles: string[] | undefined | null,
  active: string | null | undefined,
): Persona {
  const entitled = personasForRoles(roles);
  if (active && entitled.includes(active as Persona)) return active as Persona;
  return entitled[0] ?? "default";
}
