"use client";

import { useEffect } from "react";
import {
  useGetComplianceAlertsQuery,
} from "@/redux/slices/api/complianceApi";
import { useListClientsQuery } from "@/redux/slices/api/clientsApi";
import StatCard from "@/components/StatCard";
import RiskBadge from "@/components/RiskBadge";
import ActionBadge from "@/components/ActionBadge";
import { SkeletonStats, SkeletonTable } from "@/components/Skeleton";
import RegulatorGuard from "@/components/RegulatorGuard";
import {
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  FlagIcon,
} from "@heroicons/react/24/outline";

export default function SuspiciousActivityPage() {
  useEffect(() => {
    document.title = "Suspicious Activity | Deferred KYC";
  }, []);

  const { data: alerts, isLoading } = useGetComplianceAlertsQuery({ limit: 200 });
  const { data: clientsData } = useListClientsQuery({ page_size: 50 });

  const clientMap: Record<string, string> = {};
  (clientsData?.items || []).forEach((c) => {
    clientMap[c.client_id] = c.name;
  });

  const blockAlerts = (alerts?.items || []).filter(
    (a) => a.action === "BLOCK" || a.action === "FREEZE" || a.action === "REVIEW"
  );

  const amlAlerts = blockAlerts.filter((a) =>
    a.triggered_rules?.some((r) => r.includes("AML") || r.includes("GEO") || r.includes("EXT"))
  );

  const highRiskBlocks = blockAlerts.filter(
    (a) => a.risk_level === "HIGH" || a.risk_level === "VERY_HIGH" || a.risk_level === "CRITICAL"
  );

  return (
    <RegulatorGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Suspicious Activity</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            BLOCK, FREEZE, and REVIEW decisions requiring regulatory attention
          </p>
        </div>

        {isLoading ? (
          <SkeletonStats count={3} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="AML / Sanctions Alerts"
              value={amlAlerts.length}
              subtitle="AML/GEO/EXT rule triggers"
              icon={<ShieldExclamationIcon className="h-8 w-8" aria-hidden="true" />}
              color="text-red-600"
            />
            <StatCard
              title="High-Risk Blocks"
              value={highRiskBlocks.length}
              subtitle="HIGH+ risk BLOCK/FREEZE"
              icon={<ExclamationTriangleIcon className="h-8 w-8" aria-hidden="true" />}
              color="text-amber-600"
            />
            <StatCard
              title="Total Suspicious"
              value={blockAlerts.length}
              subtitle="All BLOCK + FREEZE + REVIEW"
              icon={<FlagIcon className="h-8 w-8" aria-hidden="true" />}
              color="text-primary"
            />
          </div>
        )}

        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-600">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Suspicious Activity Alerts ({blockAlerts.length})
            </h2>
          </div>
          {isLoading ? (
            <SkeletonTable rows={8} cols={7} />
          ) : !blockAlerts.length ? (
            <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No suspicious activity detected.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">Decision ID</th>
                    <th className="px-6 py-3 font-medium">Institution</th>
                    <th className="px-6 py-3 font-medium">Action</th>
                    <th className="px-6 py-3 font-medium">Risk</th>
                    <th className="px-6 py-3 font-medium">Score</th>
                    <th className="px-6 py-3 font-medium">Triggered Rules</th>
                    <th className="px-6 py-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                  {blockAlerts.map((alert) => (
                    <tr key={alert.decision_id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-900 dark:text-white">
                        {alert.decision_id.slice(0, 12)}...
                      </td>
                      <td className="px-6 py-4 text-xs text-primary font-medium">
                        {clientMap[alert.client_id] || "Unknown"}
                      </td>
                      <td className="px-6 py-4"><ActionBadge action={alert.action} /></td>
                      <td className="px-6 py-4"><RiskBadge level={alert.risk_level} /></td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{alert.risk_score.toFixed(1)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(alert.triggered_rules || []).slice(0, 3).map((rule) => (
                            <span key={rule} className="px-2 py-0.5 bg-gray-100 dark:bg-navy-600 text-gray-700 dark:text-gray-300 text-xs rounded font-mono">
                              {rule}
                            </span>
                          ))}
                          {(alert.triggered_rules || []).length > 3 && (
                            <span className="text-xs text-gray-400">+{alert.triggered_rules.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                        {new Date(alert.created_at).toLocaleString()}
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
