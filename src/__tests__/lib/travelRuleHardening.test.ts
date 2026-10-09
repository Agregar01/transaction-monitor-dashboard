import { describe, it, expect } from "vitest";
import {
  approvalActionLabel,
  canClearSanctionsHit,
  clearToBroadcastLabel,
  clearToBroadcastTone,
  cureHint,
  defaultMiPeriod,
  humaniseReason,
  identityChangeResetsDd,
  miPeriodParams,
  normaliseIdentityValue,
  pendingApprovalLabel,
  primaryReason,
  resolutionBlockedByPending,
  SANCTIONS_ESCALATIONS,
  summariseScreening,
  topReasons,
  travelRuleApprovalContext,
  walletVerifiedError,
} from "@/lib/travelRule";
import {
  COUNTERPARTY_MUTATION_INVALIDATES,
  WALLET_MUTATION_INVALIDATES,
} from "@/redux/slices/api/travelRuleApi";
import { isAllowedPath } from "@/lib/proxy-policy";

describe("humaniseReason for the hardening reason codes", () => {
  const codes = [
    "CP_SANCTIONED",
    "CP_SANCTIONS_REVIEW",
    "WALLET_MISMATCH",
    "RETRO_SCREENING_HIT",
    "UNHOSTED_THIRD_PARTY",
    "WOULD_BREACH_DISPOSITION",
  ];
  it.each(codes)("gives %s a written explanation, not the sentence-cased code", (code) => {
    const text = humaniseReason(code);
    const fallback = code.toLowerCase().replace(/_/g, " ");
    expect(text.toLowerCase()).not.toBe(fallback);
    expect(text.length).toBeGreaterThan(20);
    expect(text).not.toContain(String.fromCharCode(0x2014));
  });
  it("marks a sanctioned counterparty as not releasable", () => {
    expect(humaniseReason("CP_SANCTIONED")).toMatch(/not releasable/i);
  });
  it("explains a retro hit as a listing added after the transfer", () => {
    expect(humaniseReason("RETRO_SCREENING_HIT")).toMatch(/after the transfer/i);
  });
  it("does not lead a row with informational codes", () => {
    expect(primaryReason(["UNHOSTED_THIRD_PARTY", "WALLET_MISMATCH"])).toBe("WALLET_MISMATCH");
    expect(primaryReason(["WOULD_BREACH_DISPOSITION", "CP_SANCTIONED"])).toBe("CP_SANCTIONED");
    expect(primaryReason(["UNHOSTED_THIRD_PARTY"])).toBe("UNHOSTED_THIRD_PARTY");
  });
});

describe("cureHint for the hardening reason codes", () => {
  it("says an outbound wallet mismatch is cured only by a corrected IVMS101 payload", () => {
    const hint = cureHint({ direction: "OUTBOUND", reason_codes: ["WALLET_MISMATCH"] });
    expect(hint).toMatch(/corrected IVMS101 payload/i);
    expect(hint).toMatch(/on-chain wallets/i);
  });
  it("gives no outbound cure text for an inbound wallet mismatch", () => {
    expect(cureHint({ direction: "INBOUND", reason_codes: ["WALLET_MISMATCH"] })).toBeNull();
  });
  it("says a sanctioned counterparty is not releasable and is cleared by a second-user review", () => {
    for (const direction of ["OUTBOUND", "INBOUND"]) {
      const hint = cureHint({ direction, reason_codes: ["CP_SANCTIONED"] });
      expect(hint).toMatch(/not releasable/i);
      expect(hint).toMatch(/clear sanctions hit/i);
      expect(hint).toMatch(/second user/i);
    }
  });
  it("explains a retro screening hit", () => {
    expect(cureHint({ direction: "INBOUND", reason_codes: ["RETRO_SCREENING_HIT"] })).toMatch(/added to the sanctioned wallet list after the transfer/i);
  });
  it("puts the sanctions stop ahead of missing data", () => {
    expect(cureHint({ direction: "OUTBOUND", reason_codes: ["MISSING_REQUIRED_FIELDS", "CP_SANCTIONED"] })).toMatch(/sanctions/i);
  });
  it("keeps the data hints outbound only", () => {
    expect(cureHint({ direction: "INBOUND", reason_codes: ["MISSING_REQUIRED_FIELDS"] })).toBeNull();
  });
});

describe("normaliseIdentityValue", () => {
  it("trims, upper-cases LEI and country, and maps empty to null", () => {
    expect(normaliseIdentityValue("lei", " 5493001kjtiigc8y1r12 ")).toBe("5493001KJTIIGC8Y1R12");
    expect(normaliseIdentityValue("country", "gh")).toBe("GH");
    expect(normaliseIdentityValue("legal_name", "  Acme VASP ")).toBe("Acme VASP");
    expect(normaliseIdentityValue("legal_name", "   ")).toBeNull();
    expect(normaliseIdentityValue("lei", null)).toBeNull();
  });
  it("keeps the case of other identity fields", () => {
    expect(normaliseIdentityValue("registration_number", "abc-1")).toBe("abc-1");
  });
});

describe("identityChangeResetsDd compares values, not keys", () => {
  const initial = {
    legal_name: "Acme VASP",
    lei: "5493001KJTIIGC8Y1R12",
    registration_number: "REG-1",
    registration_authority: null,
    country: "GH",
  };
  it("does not fire when the LEI is retyped in lower case (backend upper-cases it)", () => {
    expect(identityChangeResetsDd("APPROVED", initial, { lei: "5493001kjtiigc8y1r12" })).toBe(false);
  });
  it("does not fire for whitespace-only or case-only country edits", () => {
    expect(identityChangeResetsDd("APPROVED", initial, { country: " gh ", legal_name: "Acme VASP " })).toBe(false);
  });
  it("treats empty and null as the same value", () => {
    expect(identityChangeResetsDd("APPROVED", initial, { registration_authority: "" })).toBe(false);
  });
  it("fires when a value really changes", () => {
    expect(identityChangeResetsDd("RESTRICTED", initial, { registration_number: "REG-2" })).toBe(true);
    expect(identityChangeResetsDd("APPROVED", initial, { registration_authority: "RA000001" })).toBe(true);
    expect(identityChangeResetsDd("APPROVED", initial, { lei: null })).toBe(true);
  });
});

describe("clearToBroadcastLabel", () => {
  it("labels yes, no and not yet processed", () => {
    expect(clearToBroadcastLabel(true)).toBe("Yes");
    expect(clearToBroadcastLabel(false)).toBe("No");
    expect(clearToBroadcastLabel(null)).toBe("Not yet processed");
    expect(clearToBroadcastLabel(undefined)).toBe("Not yet processed");
  });
  it("tones the label", () => {
    expect(clearToBroadcastTone(true)).toBe("good");
    expect(clearToBroadcastTone(false)).toBe("bad");
    expect(clearToBroadcastTone(null)).toBe("neutral");
  });
});

describe("pending approvals", () => {
  it("labels the pending action", () => {
    expect(pendingApprovalLabel("TR_OVERRIDE_RELEASE")).toBe("Approval pending (release hold)");
    expect(approvalActionLabel("TR_SCREENING_CLEAR")).toMatch(/false positive/);
  });
  it("blocks only the four-eyes resolutions while a request is pending", () => {
    const pending = { id: "a", action_type: "TR_OVERRIDE_RELEASE", requested_by: null, created_at: "2026-10-09T00:00:00Z" };
    expect(resolutionBlockedByPending("OVERRIDE_RELEASE", pending)).toBe(true);
    expect(resolutionBlockedByPending("CLEAR_SCREENING_FALSE_POSITIVE", pending)).toBe(true);
    expect(resolutionBlockedByPending("CANCEL", pending)).toBe(false);
    expect(resolutionBlockedByPending("OVERRIDE_RELEASE", null)).toBe(false);
  });
});

describe("walletVerifiedError", () => {
  it("accepts non-verified statuses with any method", () => {
    expect(walletVerifiedError({ ownership_status: "DECLARED", ownership_method: "DECLARATION" })).toBeNull();
    expect(walletVerifiedError({ ownership_status: "REVOKED", ownership_method: "DECLARATION", evidence_notes: "" })).toBeNull();
  });
  it("refuses VERIFIED by declaration", () => {
    expect(
      walletVerifiedError({ ownership_status: "VERIFIED", ownership_method: "DECLARATION", evidence_notes: "signed" }),
    ).toMatch(/signed message or micro transfer/i);
  });
  it("refuses VERIFIED without evidence notes", () => {
    expect(walletVerifiedError({ ownership_status: "VERIFIED", ownership_method: "SIGNED_MESSAGE", evidence_notes: "  " })).toMatch(/evidence/i);
    expect(walletVerifiedError({ ownership_status: "VERIFIED", ownership_method: "MICRO_TRANSFER" })).toMatch(/evidence/i);
  });
  it("accepts VERIFIED with a strong method and notes", () => {
    expect(
      walletVerifiedError({ ownership_status: "VERIFIED", ownership_method: "MICRO_TRANSFER", evidence_notes: "0.0001 ETH returned 2026-10-01" }),
    ).toBeNull();
  });
});

describe("sanctions escalation", () => {
  it("offers only HIT and REVIEW, never CLEAR", () => {
    expect([...SANCTIONS_ESCALATIONS]).toEqual(["HIT", "REVIEW"]);
  });
  it("offers clear sanctions hit only for HIT or REVIEW", () => {
    expect(canClearSanctionsHit("HIT")).toBe(true);
    expect(canClearSanctionsHit("REVIEW")).toBe(true);
    expect(canClearSanctionsHit("CLEAR")).toBe(false);
    expect(canClearSanctionsHit(null)).toBe(false);
  });
});

describe("summariseScreening", () => {
  it("flattens wallet hits, the name summary and the false positive flag", () => {
    const s = summariseScreening({
      wallets: { originator: false, beneficiary: true },
      name: { top_score: 91.5, list: "OFAC SDN", pep_match: false, recommendation: "HIT", names_screened: 3 },
      cleared_false_positive: true,
      counterparty_vasp_sanctions: "REVIEW",
    });
    expect(s?.wallets).toEqual([
      { role: "originator", hit: false },
      { role: "beneficiary", hit: true },
    ]);
    expect(s?.name).toEqual({ topScore: 91.5, list: "OFAC SDN", pepMatch: false, recommendation: "HIT", namesScreened: 3 });
    expect(s?.clearedFalsePositive).toBe(true);
    expect(s?.counterpartyVaspSanctions).toBe("REVIEW");
  });
  it("handles missing parts and non-objects", () => {
    expect(summariseScreening(null)).toBeNull();
    expect(summariseScreening({ wallets: { originator: false }, name: null })).toEqual({
      wallets: [{ role: "originator", hit: false }],
      name: null,
      clearedFalsePositive: false,
      counterpartyVaspSanctions: null,
    });
  });
  it("never surfaces fields other than scores, lists and flags", () => {
    const s = summariseScreening({ name: { top_score: 50, matched_name: "Someone" } });
    expect(JSON.stringify(s)).not.toContain("Someone");
  });
});

describe("topReasons", () => {
  it("returns the highest counts first, capped at n", () => {
    const freq: Record<string, number> = {};
    for (let i = 0; i < 12; i++) freq[`R${String(i).padStart(2, "0")}`] = i;
    const top = topReasons(freq, 10);
    expect(top).toHaveLength(10);
    expect(top[0]).toEqual(["R11", 11]);
    expect(top[9]).toEqual(["R02", 2]);
  });
  it("handles undefined", () => {
    expect(topReasons(undefined)).toEqual([]);
  });
});

describe("MI period", () => {
  it("defaults to the last 30 days", () => {
    expect(defaultMiPeriod(new Date("2026-10-09T12:00:00Z"))).toEqual({ from: "2026-09-09", to: "2026-10-09" });
  });
  it("sends an inclusive end date as midnight of the next day (backend to is exclusive)", () => {
    expect(miPeriodParams("2026-09-01", "2026-09-30")).toEqual({
      from: "2026-09-01T00:00:00Z",
      to: "2026-10-01T00:00:00Z",
    });
  });
  it("omits empty or malformed dates", () => {
    expect(miPeriodParams("", "nonsense")).toEqual({});
  });
});

describe("travelRuleApprovalContext", () => {
  it("links release and screening-clear requests to the record", () => {
    const ctx = travelRuleApprovalContext("TR_OVERRIDE_RELEASE", { record_id: "rec-1", institution_id: "i", reason: "Checked with the VASP" });
    expect(ctx?.href).toBe("/dashboard/travel-rule/rec-1");
    expect(ctx?.summary).toMatch(/Checked with the VASP/);
    expect(travelRuleApprovalContext("TR_SCREENING_CLEAR", { record_id: "rec-2" })?.href).toBe("/dashboard/travel-rule/rec-2");
  });
  it("links a DD approval to the counterparty register when there is no vasp id", () => {
    const ctx = travelRuleApprovalContext("VASP_DD_APPROVAL", { review_id: "rv", vasp: "Acme VASP", proposed_outcome: "APPROVED" });
    expect(ctx?.href).toBe("/dashboard/travel-rule/counterparties");
    expect(ctx?.summary).toMatch(/Acme VASP/);
    expect(ctx?.summary).toMatch(/approved/);
  });
  it("links a DD approval to the counterparty when the vasp id is present", () => {
    expect(travelRuleApprovalContext("VASP_DD_APPROVAL", { vasp_id: "v1" })?.href).toBe("/dashboard/travel-rule/counterparties/v1");
  });
  it("says when a DD approval clears a sanctions hit", () => {
    const ctx = travelRuleApprovalContext("VASP_DD_APPROVAL", { vasp_id: "v1", vasp: "Acme VASP", clear_sanctions_hit: true });
    expect(ctx?.summary).toMatch(/clears sanctions hit/);
    expect(travelRuleApprovalContext("VASP_DD_APPROVAL", { vasp_id: "v1", clear_sanctions_hit: false })?.summary).not.toMatch(/clears/);
  });
  it("summarises a profile version request", () => {
    const ctx = travelRuleApprovalContext("TR_PROFILE_VERSION", { jurisdiction_code: "GHA", changes: { threshold_amount: null } });
    expect(ctx?.summary).toMatch(/GHA/);
    expect(ctx?.summary).toMatch(/threshold amount/);
    expect(ctx?.href).toBe("/dashboard/travel-rule/profiles");
  });
  it("returns null for other approval types", () => {
    expect(travelRuleApprovalContext("STR_FILING", {})).toBeNull();
  });
});

describe("Travel Rule cache invalidation", () => {
  const ids = (tags: { type: string; id: string }[]) => tags.map((t) => t.id);
  it("refreshes records, record details and MI after counterparty edits", () => {
    expect(ids(COUNTERPARTY_MUTATION_INVALIDATES)).toEqual(expect.arrayContaining(["COUNTERPARTIES", "RECORDS", "RECORD_DETAIL", "MI"]));
  });
  it("refreshes wallets and held records after wallet changes", () => {
    expect(ids(WALLET_MUTATION_INVALIDATES)).toEqual(expect.arrayContaining(["WALLETS", "RECORDS", "RECORD_DETAIL"]));
  });
});

describe("proxy allowlist", () => {
  it("covers the customer wallet endpoints through the travel-rule prefix", () => {
    expect(isAllowedPath("/api/v1/travel-rule/wallets")).toBe(true);
    expect(isAllowedPath("/api/v1/travel-rule/wallets/abc")).toBe(true);
  });
});
