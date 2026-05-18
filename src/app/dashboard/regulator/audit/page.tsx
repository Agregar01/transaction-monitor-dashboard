"use client";

import { useEffect } from "react";
import { useGetComplianceAlertsQuery } from "@/redux/slices/api/complianceApi";
import { useListClientsQuery } from "@/redux/slices/api/clientsApi";
import RiskBadge from "@/components/RiskBadge";
import ActionBadge from "@/components/ActionBadge";
import { SkeletonTable } from "@/components/Skeleton";
import RegulatorGuard from "@/components/RegulatorGuard";

export default function AuditLogsPage() {
  useEffect(() => {
    document.title = "Audit Logs | Deferred KYC";
  }, []);

  const { data: alerts, isLoading } = useGetComplianceAlertsQuery({ limit: 200 });
  const { data: clientsData } = useListClientsQuery({ page_size: 50 });

  const clientMap: Record<string, string> = {};
  (clientsData?.items || []).forEach((c) => {
    clientMap[c.client_id] = c.name;
  });

  const allAlerts = alerts?.items || [];

  return (
    <RegulatorGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Full compliance decision audit trail across all regulated institutions
          </p>
        </div>

        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-600">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Compliance Audit Trail ({allAlerts.length} entries)
            </h2>
          </div>
          {isLoading ? (
            <SkeletonTable rows={10} cols={7} />
          ) : !allAlerts.length ? (
            <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No audit entries found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">Decision ID</th>
                    <th className="px-6 py-3 font-medium">Institution</th>
                    <th className="px-6 py-3 font-medium">Action</th>
                    <th className="px-6 py-3 font-medium">Risk Level</th>
                    <th className="px-6 py-3 font-medium">Score</th>
                    <th className="px-6 py-3 font-medium">Reason</th>
                    <th className="px-6 py-3 font-medium">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                  {allAlerts.map((entry) => (
                    <tr key={entry.decision_id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-900 dark:text-white">
                        {entry.decision_id.slice(0, 12)}...
                      </td>
                      <td className="px-6 py-4 text-xs text-primary font-medium">
                        {clientMap[entry.client_id] || "Unknown"}
                      </td>
                      <td className="px-6 py-4"><ActionBadge action={entry.action} /></td>
                      <td className="px-6 py-4"><RiskBadge level={entry.risk_level} /></td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{entry.risk_score.toFixed(1)}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300 max-w-xs truncate">{entry.reason}</td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RegulatorGuard>
  );
}
