import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import RiskBadge from "@/components/RiskBadge";
import { riskBand } from "@/config/constants";

describe("riskBand helper — 0-300 boundary semantics", () => {
  it("classifies 0-89 as ALLOW", () => {
    expect(riskBand(0)).toBe("ALLOW");
    expect(riskBand(89)).toBe("ALLOW");
  });

  it("classifies 90-119 as FLAG", () => {
    expect(riskBand(90)).toBe("FLAG");
    expect(riskBand(119)).toBe("FLAG");
  });

  it("classifies 120-149 as STEP_UP", () => {
    expect(riskBand(120)).toBe("STEP_UP");
    expect(riskBand(149)).toBe("STEP_UP");
  });

  it("classifies 150-199 as HOLD", () => {
    expect(riskBand(150)).toBe("HOLD");
    expect(riskBand(199)).toBe("HOLD");
  });

  it("classifies 200-300 as BLOCK", () => {
    expect(riskBand(200)).toBe("BLOCK");
    expect(riskBand(300)).toBe("BLOCK");
  });
});

describe("RiskBadge", () => {
  it("renders the numeric score alongside the band label", () => {
    render(<RiskBadge score={175} />);
    expect(screen.getByText("HOLD")).toBeInTheDocument();
    expect(screen.getByText("175")).toBeInTheDocument();
  });

  it("hides the numeric score when bandOnly is set", () => {
    render(<RiskBadge score={210} bandOnly />);
    expect(screen.getByText("BLOCK")).toBeInTheDocument();
    expect(screen.queryByText("210")).not.toBeInTheDocument();
  });

  it("renders ALLOW for a zero score", () => {
    render(<RiskBadge score={0} />);
    expect(screen.getByText("ALLOW")).toBeInTheDocument();
  });
});
