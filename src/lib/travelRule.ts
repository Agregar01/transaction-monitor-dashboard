/**
 * Pure helpers for the virtual asset Travel Rule screens: labels, tones,
 * human-readable missing fields / reason codes, and IVMS101 party flattening
 * for display. No React, no network: unit-tested in
 * src/__tests__/lib/travelRule.test.ts.
 */

export type Tone = "good" | "warn" | "bad" | "neutral";

function sentenceCase(code: string): string {
  const words = code.toLowerCase().replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return "Unknown";
  return sentenceCase(status);
}

export function dispositionTone(disposition: string | null | undefined): Tone {
  switch (disposition) {
    case "PROCEED":
      return "good";
    case "HOLD":
    case "SUSPEND":
    case "PENDING_INFO":
      return "warn";
    case "BLOCK":
    case "RETURN":
      return "bad";
    default:
      return "neutral";
  }
}

export const TONE_CLASSES: Record<Tone, string> = {
  good: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200",
  warn: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  bad: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200",
};

const MISSING_FIELDS: Record<string, string> = {
  payload: "No IVMS101 Travel Rule payload was supplied",
  "originator.name": "Originator name",
  "originator.account": "Originator wallet or account",
  "beneficiary.name": "Beneficiary name",
  "beneficiary.account": "Beneficiary wallet or account",
  "originator.identifier":
    "Originator identifier (one of: address, national ID, customer ID, or date and place of birth)",
  "originator.id_number": "Originator ID number (FIC Directive 9)",
  "originator.dob": "Originator date of birth (required for non-residents)",
  "originator.address_or_country_of_birth": "Originator residential address, or country of birth",
  "originator.registration_number": "Originator company registration number",
  "originator.registered_address": "Originator registered address",
};

export function humaniseMissingField(field: string): string {
  if (MISSING_FIELDS[field]) return MISSING_FIELDS[field];
  const [party, ...rest] = field.split(".");
  const tail = rest.join(".").replace(/_/g, " ");
  return tail ? `${sentenceCase(party)}: ${tail}` : sentenceCase(party);
}

const REASONS: Record<string, string> = {
  MISSING_REQUIRED_FIELDS: "Required Travel Rule information is missing",
  IVMS_INVALID: "The IVMS101 payload breaks one or more IVMS101 constraints",
  AWAITING_DATA: "Waiting for the originating VASP to send Travel Rule data",
  SCREENING_HIT: "Counterparty name or a wallet matched a sanctions list",
  SCREENING_REVIEW: "Possible sanctions match on the counterparty name, needs review",
  SCREENING_NOT_RUN: "Sanctions screening could not run (lists not loaded)",
  CP_REJECTED: "Counterparty VASP was rejected in due diligence",
  CP_PROHIBITED: "Counterparty VASP is rated prohibited",
  CP_UNREGISTERED: "Counterparty VASP is not in the register (a stub was created)",
  CP_DD_NOT_APPROVED: "Counterparty VASP has no current approved due diligence",
  UNHOSTED_PROOF_MISSING: "Unhosted wallet without verified customer ownership",
  UNHOSTED_BLOCKED: "Transfers with unhosted wallets are blocked in this jurisdiction",
  NAME_MISALIGNMENT: "Customer name in the payload does not match the KYC name",
  EXECUTED_WITH_GAPS: "Executed with missing information (follow-up required)",
  POST_FACTO: "Travel Rule data was sent after the on-chain transfer",
  LATE_DATA: "Travel Rule data arrived after the grace window",
  BROADCAST_AGAINST_DISPOSITION: "The transfer was broadcast although it should not proceed",
  STALE_NO_BROADCAST: "Approved outbound transfer with no broadcast reported",
  INFO_DEADLINE_MISSED: "Requested information was not provided before the deadline",
  TR_RECORD_MISSING: "Virtual asset transaction has no Travel Rule record",
  PROTOCOL_REJECTED: "The counterparty VASP rejected or declined the Travel Rule message",
  CP_SANCTIONED: "Counterparty VASP matched a sanctions list (not releasable)",
  CP_SANCTIONS_REVIEW: "Possible sanctions match on the counterparty VASP, needs due diligence review",
  WALLET_MISMATCH: "IVMS101 account numbers do not match the wallets that move on chain",
  RETRO_SCREENING_HIT: "A wallet on this transfer was added to the sanctioned wallet list after the transfer",
  UNHOSTED_THIRD_PARTY: "Unhosted wallet owned by a third party (recorded and screened, no ownership proof needed)",
  WOULD_BREACH_DISPOSITION: "Shadow mode: broadcast against a disposition that enforce mode would have stopped",
};

export function humaniseReason(code: string): string {
  return REASONS[code] ?? sentenceCase(code);
}

/** Informational codes that rarely explain a stop on their own. */
const INFORMATIONAL_REASONS = new Set([
  "CP_UNREGISTERED",
  "IVMS_INVALID",
  "UNHOSTED_THIRD_PARTY",
  "WOULD_BREACH_DISPOSITION",
]);

/** The reason worth showing first in a list row. */
export function primaryReason(reasons: string[]): string | null {
  if (!reasons.length) return null;
  return reasons.find((r) => !INFORMATIONAL_REASONS.has(r)) ?? reasons[0];
}

export type AgeBucket = "under_1d" | "1d_to_7d" | "over_7d";

export function ageBucket(createdAt: string, now: Date = new Date()): AgeBucket {
  const ms = now.getTime() - new Date(createdAt).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (ms < day) return "under_1d";
  if (ms < 7 * day) return "1d_to_7d";
  return "over_7d";
}

export function ageLabel(createdAt: string, now: Date = new Date()): string {
  const mins = Math.max(0, Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const RESOLUTION_LABELS: Record<string, string> = {
  EXECUTE: "Execute",
  SUSPEND: "Suspend",
  REJECT_RETURN: "Reject / return",
  REQUEST_INFO: "Request information",
  CANCEL: "Cancel transfer",
  OVERRIDE_RELEASE: "Release hold (four-eyes)",
  CLEAR_SCREENING_FALSE_POSITIVE: "Clear screening false positive (four-eyes)",
};

export function allowedResolutionLabel(resolution: string): string {
  return RESOLUTION_LABELS[resolution] ?? sentenceCase(resolution);
}

export function isFourEyesResolution(resolution: string): boolean {
  return resolution === "OVERRIDE_RELEASE" || resolution === "CLEAR_SCREENING_FALSE_POSITIVE";
}

export function formatPct(value: number | null | undefined): string {
  return value == null ? "n/a" : `${value.toFixed(1)}%`;
}

export function isTravelRuleRule(ruleId: string): boolean {
  return ruleId.startsWith("R-VA") || ruleId.startsWith("R-TR");
}

// ── IVMS101 flattening (display only) ────────────────────────────────────────

export type IvmsSide = "originator" | "beneficiary" | "originatingVASP" | "beneficiaryVASP";

export interface FlatParty {
  kind: "natural" | "legal";
  name: string | null;
  accounts: string[];
  address: string | null;
  identifiers: string[];
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  customerId: string | null;
  countryOfResidence: string | null;
}

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Case-insensitive key lookup, first matching name wins. */
function get(o: unknown, ...names: string[]): unknown {
  if (!isObj(o)) return undefined;
  const lowered: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) lowered[k.toLowerCase()] = v;
  for (const n of names) {
    const v = lowered[n.toLowerCase()];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

function asList(v: unknown): unknown[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function text(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s || null;
}

function formatAddress(addr: unknown): string | null {
  if (!isObj(addr)) return null;
  const lines = asList(get(addr, "addressLine")).map(text).filter(Boolean) as string[];
  const street = [text(get(addr, "buildingNumber")), text(get(addr, "streetName"))].filter(Boolean).join(" ");
  const parts = [
    ...lines,
    street || null,
    text(get(addr, "townName")),
    text(get(addr, "countrySubDivision")),
    text(get(addr, "country")),
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function personFromWrapper(wrapper: unknown): FlatParty | null {
  const natural = get(wrapper, "naturalPerson");
  const legal = get(wrapper, "legalPerson");
  const person = isObj(natural) ? natural : isObj(legal) ? legal : null;
  if (!person) return null;
  const kind: FlatParty["kind"] = isObj(natural) ? "natural" : "legal";

  let name: string | null = null;
  for (const ni of asList(get(get(person, "name"), "nameIdentifier"))) {
    if (kind === "natural" && get(ni, "nameIdentifierType") === "LEGL") {
      name = [text(get(ni, "secondaryIdentifier")), text(get(ni, "primaryIdentifier"))].filter(Boolean).join(" ") || null;
      break;
    }
    if (kind === "legal" && get(ni, "legalPersonNameIdentifierType") === "LEGL") {
      name = text(get(ni, "legalPersonName"));
      break;
    }
  }

  const nid = get(person, "nationalIdentification");
  const identifiers: string[] = [];
  const idValue = text(get(nid, "nationalIdentifier"));
  if (idValue) {
    const type = text(get(nid, "nationalIdentifierType")) ?? "ID";
    const country = text(get(nid, "countryOfIssue"));
    identifiers.push(`${type}: ${idValue}${country ? ` (${country})` : ""}`);
  }

  const dpob = get(person, "dateAndPlaceOfBirth");
  return {
    kind,
    name,
    accounts: asList(get(person, "accountNumber")).map(text).filter(Boolean) as string[],
    address: asList(get(person, "geographicAddress")).map(formatAddress).find(Boolean) ?? null,
    identifiers,
    dateOfBirth: text(get(dpob, "dateOfBirth")),
    placeOfBirth: text(get(dpob, "placeOfBirth")),
    customerId: text(get(person, "customerIdentification", "customerNumber")),
    countryOfResidence: text(get(person, "countryOfResidence", "countryOfRegistration")),
  };
}

/** Flatten one IVMS101 party (first person) for display. Returns null if absent. */
export function flattenIvmsParty(payload: unknown, side: IvmsSide): FlatParty | null {
  if (!isObj(payload)) return null;
  const block = get(payload, side);
  if (!isObj(block)) return null;

  if (side === "originatingVASP" || side === "beneficiaryVASP") {
    const inner = get(block, side);
    return personFromWrapper(isObj(inner) ? inner : block);
  }

  const plural = side === "originator" ? "originatorPersons" : "beneficiaryPersons";
  const singular = side === "originator" ? "originatorPerson" : "beneficiaryPerson";
  const first = asList(get(block, plural, singular))[0];
  const party = personFromWrapper(first);
  if (!party) return null;
  const partyAccounts = asList(get(block, "accountNumber")).map(text).filter(Boolean) as string[];
  return { ...party, accounts: partyAccounts.length ? partyAccounts : party.accounts };
}

// ── Review-fix helpers ──────────────────────────────────────────────────────

export const IDENTITY_FIELDS = ["legal_name", "lei", "registration_number", "registration_authority", "country"] as const;

/** Identity value as the backend stores it: trimmed, LEI and country upper-cased, empty as null. */
export function normaliseIdentityValue(field: string, value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const v = String(value).trim();
  if (!v) return null;
  return field === "lei" || field === "country" ? v.toUpperCase() : v;
}

/**
 * True when saving these changes will reset a reviewed counterparty's due diligence (backend rule).
 * Compares normalised identity VALUES against the stored ones, so a key that is present but
 * unchanged (for example a LEI typed in lower case) does not count as an identity change.
 */
export function identityChangeResetsDd(
  ddStatus: string,
  initial: Record<string, unknown>,
  changes: Record<string, unknown>,
): boolean {
  if (!["APPROVED", "RESTRICTED", "IN_REVIEW"].includes(ddStatus)) return false;
  return IDENTITY_FIELDS.some(
    (k) => k in changes && normaliseIdentityValue(k, changes[k]) !== normaliseIdentityValue(k, initial[k]),
  );
}

/** Banner text for an UNCONFIRMED profile, stating the threshold the verdict really used. */
export function unconfirmedProfileNotice(p: {
  profile_jurisdiction: string;
  threshold_amount: string | number | null;
  currency: string | null;
}): string {
  const amount = p.threshold_amount === null || p.threshold_amount === undefined ? null : Number(p.threshold_amount);
  const basis =
    amount === null || Number.isNaN(amount) || amount <= 0
      ? "so the full data set is required on every transfer"
      : `so this verdict uses a placeholder threshold of ${p.currency ?? ""} ${amount.toLocaleString("en-US")}`.replace("  ", " ");
  return `The ${p.profile_jurisdiction} Travel Rule profile is UNCONFIRMED: the regulator has not published a threshold or data set yet, ${basis}.`;
}

/**
 * Why a record cannot be released, and how it is cured (null if nothing to cure).
 * Sanctions hints apply in both directions; the data and protocol hints are outbound only.
 */
export function cureHint(r: { direction: string; reason_codes: string[] }): string | null {
  const outbound = r.direction === "OUTBOUND";
  if (r.reason_codes.includes("CP_SANCTIONED")) {
    return "The counterparty VASP matched a sanctions list, so this transfer is not releasable. If the match is a false positive, it is cleared by a counterparty due diligence review with \"clear sanctions hit\" ticked, approved by a second user.";
  }
  if (r.reason_codes.includes("RETRO_SCREENING_HIT")) {
    return "A wallet on this transfer was added to the sanctioned wallet list after the transfer. Review the transfer and the linked alert; it cannot be released.";
  }
  if (r.reason_codes.includes("CP_SANCTIONS_REVIEW")) {
    return "Possible sanctions match on the counterparty VASP. It is not releasable by override; a counterparty due diligence review decides it (a false positive is cleared with \"clear sanctions hit\", approved by a second user).";
  }
  if (outbound && r.reason_codes.includes("WALLET_MISMATCH")) {
    return "The IVMS101 account numbers do not match the on-chain wallets. This is cured only by the client re-posting a corrected IVMS101 payload whose account numbers match the on-chain wallets.";
  }
  if (outbound && r.reason_codes.includes("MISSING_REQUIRED_FIELDS")) {
    return "Missing Travel Rule data cannot be released. Cure it by having the client supply the missing data (a new IVMS101 payload on the record's events endpoint); the record is re-evaluated automatically.";
  }
  if (outbound && r.reason_codes.includes("SCREENING_NOT_RUN")) {
    return "Screening could not run because the sanctions lists were not loaded. Once the lists are loaded, the record is re-screened automatically (every 15 minutes).";
  }
  if (outbound && r.reason_codes.includes("PROTOCOL_REJECTED")) {
    return "The counterparty rejected this transfer. It stays blocked; start a new transfer if needed.";
  }
  return null;
}

/** Keep a list offset inside the result set after rows disappear (e.g. exceptions closed). */
export function clampOffset(offset: number, total: number, limit: number): number {
  if (total <= 0) return 0;
  if (offset < total) return offset;
  return Math.max(0, Math.floor((total - 1) / limit) * limit);
}

export function dataTimestampLabel(direction: string): string {
  return direction === "INBOUND" ? "Data received" : "Data sent";
}

// ── Hardening (v1.1) helpers ────────────────────────────────────────────────

/** Label for the clear_to_broadcast flag (null means the pipeline has not processed it yet). */
export function clearToBroadcastLabel(value: boolean | null | undefined): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Not yet processed";
}

export function clearToBroadcastTone(value: boolean | null | undefined): Tone {
  if (value === true) return "good";
  if (value === false) return "bad";
  return "neutral";
}

const APPROVAL_ACTION_LABELS: Record<string, string> = {
  TR_OVERRIDE_RELEASE: "release hold",
  TR_SCREENING_CLEAR: "clear screening false positive",
  TR_PROFILE_VERSION: "new profile version",
  VASP_DD_APPROVAL: "counterparty due diligence review",
};

export function approvalActionLabel(action: string): string {
  return APPROVAL_ACTION_LABELS[action] ?? sentenceCase(action).toLowerCase();
}

/** Banner text when a four-eyes request for the record is already open. */
export function pendingApprovalLabel(action: string): string {
  return `Approval pending (${approvalActionLabel(action)})`;
}

/** Resolutions disabled while a four-eyes request is pending (the backend answers 409). */
export function resolutionBlockedByPending(resolution: string, pending: unknown): boolean {
  return !!pending && isFourEyesResolution(resolution);
}

export const VERIFIED_OWNERSHIP_METHODS = ["SIGNED_MESSAGE", "MICRO_TRANSFER"] as const;

/**
 * Client-side mirror of the backend wallet rule: VERIFIED needs a SIGNED_MESSAGE or
 * MICRO_TRANSFER method and evidence notes. Returns the error text, or null when valid.
 */
export function walletVerifiedError(w: {
  ownership_status: string;
  ownership_method: string;
  evidence_notes?: string | null;
}): string | null {
  if (w.ownership_status !== "VERIFIED") return null;
  if (!(VERIFIED_OWNERSHIP_METHODS as readonly string[]).includes(w.ownership_method)) {
    return "Verified ownership needs the signed message or micro transfer method.";
  }
  if (!w.evidence_notes || !w.evidence_notes.trim()) {
    return "Verified ownership needs evidence notes (what was signed or sent, and when).";
  }
  return null;
}

/** Sanctions statuses a counterparty PATCH may set (escalation only; clearing is a review). */
export const SANCTIONS_ESCALATIONS = ["HIT", "REVIEW"] as const;

export function canClearSanctionsHit(sanctionsStatus: string | null | undefined): boolean {
  return sanctionsStatus === "HIT" || sanctionsStatus === "REVIEW";
}

export interface ScreeningSummary {
  wallets: { role: string; hit: boolean }[];
  name: {
    topScore: number | null;
    list: string | null;
    pepMatch: boolean;
    recommendation: string | null;
    namesScreened: number | null;
  } | null;
  clearedFalsePositive: boolean;
  /** Sanctions status of the counterparty VASP itself (CLEAR / REVIEW / HIT / NOT_RUN), null when absent. */
  counterpartyVaspSanctions: string | null;
}

/** Flatten screening_details for display: scores, list names and flags only, never a name. */
export function summariseScreening(details: unknown): ScreeningSummary | null {
  if (!isObj(details)) return null;
  const wallets = isObj(details.wallets)
    ? Object.entries(details.wallets).map(([role, hit]) => ({ role, hit: hit === true }))
    : [];
  const n = details.name;
  let name: ScreeningSummary["name"] = null;
  if (isObj(n)) {
    const score = n.top_score == null ? null : Number(n.top_score);
    const screened = n.names_screened == null ? null : Number(n.names_screened);
    name = {
      namesScreened: screened === null || !Number.isInteger(screened) ? null : screened,
      topScore: score === null || Number.isNaN(score) ? null : score,
      list: typeof n.list === "string" && n.list ? n.list : null,
      pepMatch: n.pep_match === true,
      recommendation: typeof n.recommendation === "string" && n.recommendation ? n.recommendation : null,
    };
  }
  const cpv = details.counterparty_vasp_sanctions;
  return {
    wallets,
    name,
    clearedFalsePositive: details.cleared_false_positive === true,
    counterpartyVaspSanctions: typeof cpv === "string" && cpv ? cpv : null,
  };
}

/** Top N reason codes by count, highest first (ties by code for a stable order). */
export function topReasons(freq: Record<string, number> | null | undefined, n = 10): [string, number][] {
  return Object.entries(freq ?? {})
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Default MI period: the last 30 days, as YYYY-MM-DD dates (UTC), both inclusive. */
export function defaultMiPeriod(now: Date = new Date()): { from: string; to: string } {
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from: isoDate(from), to: isoDate(now) };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Query params for /travel-rule/mi from inclusive YYYY-MM-DD dates. The backend's `to`
 * is exclusive, so it is sent as midnight UTC of the day after the chosen end date.
 */
export function miPeriodParams(from: string, to: string): { from?: string; to?: string } {
  const out: { from?: string; to?: string } = {};
  if (DATE_RE.test(from)) out.from = `${from}T00:00:00Z`;
  if (DATE_RE.test(to)) {
    const next = new Date(`${to}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    out.to = `${isoDate(next)}T00:00:00Z`;
  }
  return out;
}

export interface ApprovalContext {
  summary: string;
  href: string | null;
  linkLabel: string | null;
}

/** Human summary and a link for Travel Rule approval requests (null for other actions). */
export function travelRuleApprovalContext(
  actionType: string,
  payload: Record<string, unknown> | null | undefined,
): ApprovalContext | null {
  const p = payload ?? {};
  const str = (k: string): string | null => (typeof p[k] === "string" && p[k] ? (p[k] as string) : null);
  switch (actionType) {
    case "TR_OVERRIDE_RELEASE":
    case "TR_SCREENING_CLEAR": {
      const recordId = str("record_id");
      const reason = str("reason");
      const what =
        actionType === "TR_OVERRIDE_RELEASE"
          ? "Release a held Travel Rule transfer"
          : "Clear a Travel Rule screening match as a false positive";
      return {
        summary: reason ? `${what}. Reason given: ${reason}` : `${what}.`,
        href: recordId ? `/dashboard/travel-rule/${encodeURIComponent(recordId)}` : null,
        linkLabel: recordId ? "Open the Travel Rule record" : null,
      };
    }
    case "TR_PROFILE_VERSION": {
      const code = str("jurisdiction_code") ?? "unknown";
      const changes = isObj(p.changes) ? Object.keys(p.changes) : [];
      const changed = changes.length ? `, changing ${changes.map((c) => c.replace(/_/g, " ")).join(", ")}` : "";
      return {
        summary: `New version of the ${code} Travel Rule profile${changed}.`,
        href: "/dashboard/travel-rule/profiles",
        linkLabel: "Open the jurisdiction profiles",
      };
    }
    case "VASP_DD_APPROVAL": {
      const vasp = str("vasp") ?? "a counterparty VASP";
      const outcome = str("proposed_outcome");
      const vaspId = str("vasp_id");
      const clears = p.clear_sanctions_hit === true ? ", clears sanctions hit" : "";
      return {
        summary: `Due diligence review of ${vasp}${outcome ? `, proposed outcome ${outcome.toLowerCase()}` : ""}${clears}.`,
        href: vaspId
          ? `/dashboard/travel-rule/counterparties/${encodeURIComponent(vaspId)}`
          : "/dashboard/travel-rule/counterparties",
        linkLabel: vaspId ? "Open the counterparty" : "Open the counterparty register",
      };
    }
    default:
      return null;
  }
}
