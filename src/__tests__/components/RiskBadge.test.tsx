import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import RiskBadge from "@/components/RiskBadge";

describe("RiskBadge", () => {
  it("renders LOW risk level", () => {
    render(<RiskBadge level="LOW" />);
    expect(screen.getByText("LOW")).toBeInTheDocument();
  });

  it("renders HIGH risk level", () => {
    render(<RiskBadge level="HIGH" />);
    expect(screen.getByText("HIGH")).toBeInTheDocument();
  });

  it("renders CRITICAL risk level", () => {
    render(<RiskBadge level="CRITICAL" />);
    expect(screen.getByText("CRITICAL")).toBeInTheDocument();
  });
});
