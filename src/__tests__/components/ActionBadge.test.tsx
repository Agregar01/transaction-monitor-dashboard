import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ActionBadge from "@/components/ActionBadge";

describe("ActionBadge — AML status variants", () => {
  it.each([
    ["OPEN"],
    ["INVESTIGATING"],
    ["CLOSED"],
    ["ESCALATED"],
    ["SAR_DRAFTED"],
    ["SAR_FILED"],
    ["DRAFT"],
    ["SHADOW"],
    ["PRODUCTION"],
    ["ARCHIVED"],
    ["FILED"],
    ["WITHDRAWN"],
    ["EXEMPT"],
    ["PENDING"],
    ["APPROVED"],
    ["REJECTED"],
    ["EXPIRED"],
    ["IMMEDIATE"],
    ["BATCH"],
    ["REVIEW"],
    ["CRITICAL"],
    ["HIGH"],
    ["MEDIUM"],
    ["LOW"],
  ])("renders the %s variant with humanized label", (variant) => {
    const { unmount } = render(<ActionBadge action={variant} />);
    expect(screen.getByText(variant.replace(/_/g, " "))).toBeInTheDocument();
    unmount();
  });

  it("falls back to a neutral pill for unknown actions", () => {
    render(<ActionBadge action="UNKNOWN_FUTURE_STATUS" />);
    expect(screen.getByText("UNKNOWN FUTURE STATUS")).toBeInTheDocument();
  });
});
