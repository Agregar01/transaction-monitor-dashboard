"use client";

import TravelRulePanel from "@/components/TravelRulePanel";
import { useGetAlertQuery } from "@/redux/slices/api/alertsApi";
import { isTravelRuleRule } from "@/lib/travelRule";

/** Travel Rule panel for one linked alert, shown only when the alert involves the Travel Rule. */
function AlertTravelRule({ alertId }: { alertId: string }) {
  const { data: alert } = useGetAlertQuery(alertId);
  const txn = alert?.transaction_context;
  if (!alert || !txn) return null;
  const relevant =
    txn.channel === "VirtualAsset" || alert.triggered_rules.some((r) => isTravelRuleRule(r.rule_id));
  return relevant ? <TravelRulePanel transactionId={txn.transaction_id} /> : null;
}

/** Travel Rule panels for a case, one per linked alert whose transaction is subject to the Travel Rule. */
export default function CaseTravelRulePanels({ alertIds }: { alertIds: string[] }) {
  if (alertIds.length === 0) return null;
  return (
    <>
      {alertIds.map((id) => (
        <AlertTravelRule key={id} alertId={id} />
      ))}
    </>
  );
}
