import { describe, it, expect } from "vitest";
import {
  statusLabel,
  dispositionTone,
  humaniseMissingField,
  humaniseReason,
  ageBucket,
  allowedResolutionLabel,
  flattenIvmsParty,
  isFourEyesResolution,
  formatPct,
  isTravelRuleRule,
} from "@/lib/travelRule";

describe("statusLabel", () => {
  it("humanises canonical statuses", () => {
    expect(statusLabel("AWAITING_COUNTERPARTY")).toBe("Awaiting counterparty");
    expect(statusLabel("REPAIR_REQUESTED")).toBe("Repair requested");
    expect(statusLabel("COMPLETED")).toBe("Completed");
  });
  it("falls back for unknown values", () => {
    expect(statusLabel("SOMETHING_NEW")).toBe("Something new");
    expect(statusLabel(null)).toBe("Unknown");
  });
});

describe("dispositionTone", () => {
  it("maps dispositions to tones", () => {
    expect(dispositionTone("PROCEED")).toBe("good");
    expect(dispositionTone("HOLD")).toBe("warn");
    expect(dispositionTone("SUSPEND")).toBe("warn");
    expect(dispositionTone("PENDING_INFO")).toBe("warn");
    expect(dispositionTone("BLOCK")).toBe("bad");
    expect(dispositionTone("RETURN")).toBe("bad");
    expect(dispositionTone("X")).toBe("neutral");
  });
});

describe("humaniseMissingField", () => {
  it("explains known fields", () => {
    expect(humaniseMissingField("payload")).toMatch(/IVMS101/);
    expect(humaniseMissingField("originator.identifier")).toMatch(/address, national ID/);
    expect(humaniseMissingField("originator.dob")).toMatch(/date of birth/i);
  });
  it("falls back to a readable form", () => {
    expect(humaniseMissingField("beneficiary.something_else")).toBe("Beneficiary: something else");
  });
});

describe("humaniseReason", () => {
  it("explains reason codes", () => {
    expect(humaniseReason("MISSING_REQUIRED_FIELDS")).toMatch(/required/i);
    expect(humaniseReason("POST_FACTO")).toMatch(/after/i);
    expect(humaniseReason("CP_DD_NOT_APPROVED")).toMatch(/due diligence/i);
  });
  it("falls back for unknown codes", () => {
    expect(humaniseReason("NEW_CODE")).toBe("New code");
  });
});

describe("ageBucket", () => {
  const now = new Date("2026-09-25T12:00:00Z");
  it("buckets by age", () => {
    expect(ageBucket("2026-09-25T10:00:00Z", now)).toBe("under_1d");
    expect(ageBucket("2026-09-22T12:00:00Z", now)).toBe("1d_to_7d");
    expect(ageBucket("2026-09-01T12:00:00Z", now)).toBe("over_7d");
  });
});

describe("resolutions", () => {
  it("labels resolutions", () => {
    expect(allowedResolutionLabel("REJECT_RETURN")).toBe("Reject / return");
    expect(allowedResolutionLabel("OVERRIDE_RELEASE")).toMatch(/four-eyes/);
  });
  it("identifies four-eyes resolutions", () => {
    expect(isFourEyesResolution("OVERRIDE_RELEASE")).toBe(true);
    expect(isFourEyesResolution("CLEAR_SCREENING_FALSE_POSITIVE")).toBe(true);
    expect(isFourEyesResolution("EXECUTE")).toBe(false);
  });
});

describe("formatPct", () => {
  it("formats nullable percentages", () => {
    expect(formatPct(75)).toBe("75.0%");
    expect(formatPct(null)).toBe("n/a");
  });
});

describe("isTravelRuleRule", () => {
  it("matches travel rule rule ids", () => {
    expect(isTravelRuleRule("R-VA01")).toBe(true);
    expect(isTravelRuleRule("R-TR01")).toBe(true);
    expect(isTravelRuleRule("R-A01")).toBe(false);
  });
});

describe("flattenIvmsParty", () => {
  const payload = {
    originator: {
      originatorPersons: [
        {
          naturalPerson: {
            name: { nameIdentifier: [{ primaryIdentifier: "MENSAH", secondaryIdentifier: "KOFI", nameIdentifierType: "LEGL" }] },
            geographicAddress: [{ addressType: "HOME", addressLine: ["1 Ring Rd"], townName: "Accra", country: "GH" }],
            nationalIdentification: { nationalIdentifier: "GHA-1", nationalIdentifierType: "IDCD", countryOfIssue: "GH" },
            dateAndPlaceOfBirth: { dateOfBirth: "1990-04-01", placeOfBirth: "Kumasi" },
            customerIdentification: "CUST-1",
          },
        },
      ],
      accountNumber: ["TWallet1"],
    },
    beneficiaryVASP: {
      beneficiaryVASP: {
        legalPerson: {
          name: { nameIdentifier: [{ legalPersonName: "Luno", legalPersonNameIdentifierType: "LEGL" }] },
          nationalIdentification: { nationalIdentifier: "5493001KJTIIGC8Y1R12", nationalIdentifierType: "LEIX" },
        },
      },
    },
  };

  it("flattens a natural originator", () => {
    const p = flattenIvmsParty(payload, "originator");
    expect(p?.kind).toBe("natural");
    expect(p?.name).toBe("KOFI MENSAH");
    expect(p?.accounts).toEqual(["TWallet1"]);
    expect(p?.address).toBe("1 Ring Rd, Accra, GH");
    expect(p?.identifiers).toContain("IDCD: GHA-1 (GH)");
    expect(p?.dateOfBirth).toBe("1990-04-01");
    expect(p?.placeOfBirth).toBe("Kumasi");
    expect(p?.customerId).toBe("CUST-1");
  });

  it("flattens a legal VASP with or without the double wrapper and any key casing", () => {
    expect(flattenIvmsParty(payload, "beneficiaryVASP")?.name).toBe("Luno");
    const capitalised = { BeneficiaryVASP: payload.beneficiaryVASP.beneficiaryVASP };
    const p = flattenIvmsParty(capitalised, "beneficiaryVASP");
    expect(p?.kind).toBe("legal");
    expect(p?.identifiers).toContain("LEIX: 5493001KJTIIGC8Y1R12");
  });

  it("reads 2023-shape accounts inside the person and singular person keys", () => {
    const p2023 = {
      Beneficiary: {
        beneficiaryPerson: [
          { naturalPerson: { name: { nameIdentifier: [{ primaryIdentifier: "Ama", nameIdentifierType: "LEGL" }] }, accountNumber: ["TBen"] } },
        ],
      },
    };
    const p = flattenIvmsParty(p2023, "beneficiary");
    expect(p?.name).toBe("Ama");
    expect(p?.accounts).toEqual(["TBen"]);
  });

  it("returns null for missing parties or payloads", () => {
    expect(flattenIvmsParty(null, "originator")).toBeNull();
    expect(flattenIvmsParty({}, "beneficiary")).toBeNull();
  });
});
