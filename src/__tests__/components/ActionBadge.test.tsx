import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ActionBadge from "@/components/ActionBadge";

describe("ActionBadge", () => {
  it("renders ALLOW action", () => {
    render(<ActionBadge action="ALLOW" />);
    expect(screen.getByText("ALLOW")).toBeInTheDocument();
  });

  it("renders BLOCK action", () => {
    render(<ActionBadge action="BLOCK" />);
    expect(screen.getByText("BLOCK")).toBeInTheDocument();
  });

  it("renders REVIEW action", () => {
    render(<ActionBadge action="REVIEW" />);
    expect(screen.getByText("REVIEW")).toBeInTheDocument();
  });
});
