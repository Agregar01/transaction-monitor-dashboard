import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import TierBadge from "@/components/TierBadge";

describe("TierBadge", () => {
  it("renders tier label", () => {
    render(<TierBadge tier="T0" />);
    expect(screen.getByText("T0")).toBeInTheDocument();
  });

  it("renders business tier", () => {
    render(<TierBadge tier="B2" />);
    expect(screen.getByText("B2")).toBeInTheDocument();
  });
});
