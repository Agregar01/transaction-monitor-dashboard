import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import AnalystWorkflow, { type AlertInput } from "@/components/simulator/AnalystWorkflow";

/**
 * The separation this suite defends: the public simulator represents the bank's
 * CUSTOMER side, the console represents the bank's COMPLIANCE side, and filing a
 * Suspicious Transaction Report belongs only to the second. A customer-side
 * visitor walking a replica STR misrepresents who does what, so
 * `allowFiling={false}` must make that half of the journey unreachable — not
 * merely hidden behind a label.
 */

const ALERT: AlertInput = {
  score: 210,
  rules: ["Structuring burst", "Near-CTR threshold"],
  subject: "Made-up sender · HIGH risk",
  txnNumber: "TXN-ABC123",
  primaryAmount: 45_000,
  summaryLine: "Transfer · Momo · GH",
  detailRows: [{ k: "Amount", v: "GHS 45,000" }],
  caseType: "AML",
  fromAlerts: 1,
};

function renderWorkflow(props: Partial<React.ComponentProps<typeof AnalystWorkflow>> = {}) {
  return render(<AnalystWorkflow alert={ALERT} onExit={vi.fn()} {...props} />);
}

describe("AnalystWorkflow — customer surface (allowFiling=false)", () => {
  it("offers a handover to compliance instead of an escalation to a case", () => {
    renderWorkflow({ allowFiling: false });
    expect(screen.getByRole("button", { name: /send to compliance/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /escalate to case/i })).not.toBeInTheDocument();
  });

  it("ends at the handover, with no route onward to filing", async () => {
    const user = userEvent.setup();
    renderWorkflow({ allowFiling: false });

    await user.click(screen.getByRole("button", { name: /send to compliance/i }));

    expect(screen.getByText(/sent to compliance/i)).toBeInTheDocument();
    // The terminal screen must not become a launchpad for the thing it replaced.
    expect(screen.queryByRole("button", { name: /file str/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit str/i })).not.toBeInTheDocument();
  });

  it("names the real ids the run wrote, so the handover is checkable in the console", async () => {
    const user = userEvent.setup();
    renderWorkflow({
      allowFiling: false,
      alert: { ...ALERT, persistedAlertIds: ["ALT-REAL-1"], persistedCaseIds: ["CASE-REAL-9"] },
    });

    await user.click(screen.getByRole("button", { name: /send to compliance/i }));

    expect(screen.getByText("ALT-REAL-1")).toBeInTheDocument();
    expect(screen.getByText("CASE-REAL-9")).toBeInTheDocument();
  });

  it("says nothing was written when the run was a dry-run", async () => {
    const user = userEvent.setup();
    renderWorkflow({ allowFiling: false });

    await user.click(screen.getByRole("button", { name: /send to compliance/i }));

    expect(screen.getByText(/scored and rolled back/i)).toBeInTheDocument();
  });

  it("never advertises an STR step in the breadcrumb", () => {
    renderWorkflow({ allowFiling: false });
    expect(screen.queryByText("STR")).not.toBeInTheDocument();
    expect(screen.getByText("Compliance")).toBeInTheDocument();
  });

  it("still allows closing the alert as a false positive", async () => {
    const user = userEvent.setup();
    renderWorkflow({ allowFiling: false });

    await user.click(screen.getByRole("button", { name: /false positive/i }));

    expect(screen.getByText(/alert closed/i)).toBeInTheDocument();
  });
});

describe("AnalystWorkflow — compliance surface (default)", () => {
  it("keeps the full journey through to a filed STR", async () => {
    const user = userEvent.setup();
    renderWorkflow();

    await user.click(screen.getByRole("button", { name: /escalate to case/i }));
    expect(screen.getByText(/str narrative/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /file str/i }));
    await user.click(screen.getByRole("button", { name: /submit str to fic/i }));

    expect(screen.getByText(/str filed/i)).toBeInTheDocument();
    expect(screen.getByText(/goAML XML/i)).toBeInTheDocument();
  });

  it("defaults to allowing filing when the prop is omitted", () => {
    renderWorkflow();
    expect(screen.getByRole("button", { name: /escalate to case/i })).toBeInTheDocument();
  });
});
