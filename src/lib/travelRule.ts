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
};

export function humaniseReason(code: string): string {
  return REASONS[code] ?? sentenceCase(code);
}

/** Informational codes that rarely explain a stop on their own. */
const INFORMATIONAL_REASONS = new Set(["CP_UNREGISTERED", "IVMS_INVALID"]);

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

const IDENTITY_FIELDS = ["legal_name", "lei", "registration_number", "registration_authority", "country"];

/** True when saving these changes will reset a reviewed counterparty's due diligence (backend rule). */
export function identityChangeResetsDd(ddStatus: string, changes: Record<string, unknown>): boolean {
  if (!["APPROVED", "RESTRICTED", "IN_REVIEW"].includes(ddStatus)) return false;
  return Object.keys(changes).some((k) => IDENTITY_FIELDS.includes(k));
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

/** Why an outbound record cannot be released, and how it is cured (null if nothing to cure). */
export function cureHint(r: { direction: string; reason_codes: string[] }): string | null {
  if (r.reason_codes.includes("MISSING_REQUIRED_FIELDS")) {
    return "Missing Travel Rule data cannot be released. Cure it by having the client supply the missing data (a new IVMS101 payload on the record's events endpoint); the record is re-evaluated automatically.";
  }
  if (r.reason_codes.includes("SCREENING_NOT_RUN")) {
    return "Screening could not run because the sanctions lists were not loaded. Once the lists are loaded, the client re-posts the payload and the record is re-screened.";
  }
  if (r.reason_codes.includes("PROTOCOL_REJECTED")) {
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
