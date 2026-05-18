import ComingSoon from "@/components/ComingSoon";

export default function CasesPage() {
  return (
    <ComingSoon
      title="Cases"
      description="Investigation cases bundling related alerts. State machine: OPEN → INVESTIGATING → ESCALATED/SAR_DRAFTED → SAR_FILED → CLOSED."
      phase="Phase 4"
    />
  );
}
