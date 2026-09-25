import { describe, it, expect } from "vitest";
import {
  clampOffset,
  cureHint,
  dataTimestampLabel,
  identityChangeResetsDd,
  unconfirmedProfileNotice,
} from "@/lib/travelRule";
import { PERSONA_SECTIONS } from "@/components/Sidebar";
import { APPROVAL_DECISION_INVALIDATES } from "@/redux/slices/api/approvalsApi";

describe("platform persona reaches Travel Rule", () => {
  it("lists /dashboard/travel-rule in the platform sections", () => {
    const hrefs = PERSONA_SECTIONS.platform.flatMap((s) => s.items.map((i) => i.href));
    expect(hrefs).toContain("/dashboard/travel-rule");
  });
});

describe("approval decisions refresh Travel Rule data", () => {
  it("invalidates Travel Rule records, counterparties and MI", () => {
    const types = APPROVAL_DECISION_INVALIDATES.map((t) => (typeof t === "string" ? t : t.type));
    expect(types).toContain("TravelRule");
  });
});

describe("unconfirmedProfileNotice", () => {
  it("states the real threshold and currency", () => {
    const text = unconfirmedProfileNotice({ profile_jurisdiction: "GHA", threshold_amount: "15000", currency: "GHS" });
    expect(text).toContain("GHS 15,000");
    expect(text).not.toContain("USD 1,000");
  });
  it("explains the fail-closed fallback when there is no threshold", () => {
    const text = unconfirmedProfileNotice({ profile_jurisdiction: "XXX", threshold_amount: null, currency: null });
    expect(text.toLowerCase()).toContain("every transfer");
  });
  it("handles a zero threshold as every transfer", () => {
    expect(unconfirmedProfileNotice({ profile_jurisdiction: "XXX", threshold_amount: "0", currency: "XXX" }).toLowerCase())
      .toContain("every transfer");
  });
});

describe("cureHint", () => {
  it("tells the analyst missing data is cured by supplying it", () => {
    expect(cureHint({ direction: "OUTBOUND", reason_codes: ["MISSING_REQUIRED_FIELDS"] })).toMatch(/supply/i);
  });
  it("explains screening that could not run", () => {
    expect(cureHint({ direction: "OUTBOUND", reason_codes: ["SCREENING_NOT_RUN"] })).toMatch(/lists/i);
  });
  it("returns null when nothing needs curing", () => {
    expect(cureHint({ direction: "OUTBOUND", reason_codes: ["CP_DD_NOT_APPROVED"] })).toBeNull();
  });
});

describe("clampOffset", () => {
  it("moves back to the last page when rows disappear", () => {
    expect(clampOffset(50, 20, 25)).toBe(0);
    expect(clampOffset(75, 60, 25)).toBe(50);
  });
  it("keeps a valid offset and handles empty totals", () => {
    expect(clampOffset(25, 60, 25)).toBe(25);
    expect(clampOffset(25, 0, 25)).toBe(0);
  });
});

describe("dataTimestampLabel", () => {
  it("labels by direction", () => {
    expect(dataTimestampLabel("OUTBOUND")).toBe("Data sent");
    expect(dataTimestampLabel("INBOUND")).toBe("Data received");
  });
});

describe("identityChangeResetsDd", () => {
  it("is true when an identity field changes on a reviewed counterparty", () => {
    expect(identityChangeResetsDd("APPROVED", { lei: "X" })).toBe(true);
    expect(identityChangeResetsDd("IN_REVIEW", { country: "ZA" })).toBe(true);
  });
  it("is false for descriptive edits or unreviewed counterparties", () => {
    expect(identityChangeResetsDd("APPROVED", { notes: "x" })).toBe(false);
    expect(identityChangeResetsDd("NOT_STARTED", { lei: "X" })).toBe(false);
  });
});
