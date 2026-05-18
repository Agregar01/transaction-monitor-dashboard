import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import StatCard from "@/components/StatCard";

describe("StatCard", () => {
  it("renders title and value", () => {
    render(<StatCard title="Total Customers" value="1,234" />);
    expect(screen.getByText("Total Customers")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    render(
      <StatCard title="Decisions" value="500" subtitle="+12% this week" />
    );
    expect(screen.getByText("+12% this week")).toBeInTheDocument();
  });
});
