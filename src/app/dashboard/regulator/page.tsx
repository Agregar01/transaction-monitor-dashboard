"use client";

import { useEffect, useMemo } from "react";
import {
  useGetComplianceSummaryQuery,
  useGetComplianceAlertsQuery,
  useLazyGenerateSarQuery,
} from "@/redux/slices/api/complianceApi";
import { useListClientsQuery } from "@/redux/slices/api/clientsApi";
import { useListCustomersQuery } from "@/redux/slices/api/customersApi";
import RiskBadge from "@/components/RiskBadge";
import ActionBadge from "@/components/ActionBadge";
import { SkeletonStats, SkeletonTable } from "@/components/Skeleton";
import RegulatorGuard from "@/components/RegulatorGuard";
import {
  UsersIcon,
  BuildingOffice2Icon,
  ShieldExclamationIcon,
  DocumentArrowDownIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";

const RISK_COLORS: Record<string, string> = {
  LOW: "#22c55e",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
  CRITICAL: "#991b1b",
};

export default function RegulatorPage() {
  useEffect(() => {
    document.title = "Regulator Dashboard | Deferred KYC";
  }, []);

  const { data: summary, isLoading: summaryLoading } = useGetComplianceSummaryQuery({});
  const { data: alerts, isLoading: alertsLoading } = useGetComplianceAlertsQuery({ limit: 200 });
  const { data: clientsData } = useListClientsQuery({ page_size: 50 });
  const { data: customers } = useListCustomersQuery({ page_size: 1 });

  const clients = (clientsData?.items || []).filter((c) => !c.is_admin);
  const allAlerts = useMemo(() => alerts?.items || [], [alerts?.items]);
  const blockAlerts = allAlerts.filter(
    (a) => a.action === "BLOCK" || a.action === "FREEZE" || a.action === "REVIEW"
  );

  const clientMap: Record<string, string> = {};
  (clientsData?.items || []).forEach((c) => {
    clientMap[c.client_id] = c.name;
  });

  const tierDist = summary?.tier_distribution || {};
  const passedVerifications =
    (tierDist["T1"] || 0) + (tierDist["T2"] || 0) + (tierDist["T3"] || 0) +
    (tierDist["B1"] || 0) + (tierDist["B2"] || 0) + (tierDist["B3"] || 0);

  const riskDistribution = useMemo(() => {
    const dist: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    allAlerts.forEach((a) => {
      const level = a.risk_level?.toUpperCase() || "LOW";
      if (dist[level] !== undefined) dist[level]++;
    });
    return dist;
  }, [allAlerts]);

  const totalRisk = Object.values(riskDistribution).reduce((a, b) => a + b, 0);

  const stats = [
    {
      label: "Total Registered",
      value: customers?.total || 0,
      sub: `${passedVerifications} verified`,
      icon: UsersIcon,
      color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20",
    },
    {
      label: "Institutions",
      value: clients.length,
      sub: `${clients.filter((c) => c.is_active).length} active`,
      icon: BuildingOffice2Icon,
      color: "text-primary bg-primary/10",
    },
    {
      label: "AML Alerts",
      value: summary?.flagged_decisions || 0,
      sub: `${blockAlerts.length} blocked/frozen`,
      icon: ShieldExclamationIcon,
      color: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20",
    },
    {
      label: "Total Decisions",
      value: summary?.total_decisions || 0,
      sub: `${summary?.flagged_decisions || 0} flagged`,
      icon: CheckBadgeIcon,
      color: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20",
    },
    {
      label: "Avg Risk Score",
      value: (summary?.average_risk_score || 0).toFixed(1),
      sub: `${riskDistribution.HIGH + riskDistribution.CRITICAL} high risk`,
      icon: ExclamationTriangleIcon,
      color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20",
    },
  ];

  return (
    <RegulatorGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Regulator Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Controlled oversight of compliance activity across regulated institutions
          </p>
        </div>

        {/* ── 5 Stat Cards ── */}
        {summaryLoading ? (
          <SkeletonStats count={5} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-4 flex items-start gap-3"
              >
                <div className={`p-2 rounded-lg ${s.color} flex-shrink-0`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.label}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Two-Column: SAR Table (2/3) + Sidebar (1/3) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Suspicious Activity Reports */}
          <div className="lg:col-span-2 bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-navy-600 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Suspicious Activity Reports ({blockAlerts.length})
              </h2>
            </div>
            {alertsLoading ? (
              <SkeletonTable rows={6} cols={5} />
            ) : !blockAlerts.length ? (
              <div className="px-4 py-12 text-center text-gray-400 text-xs">No suspicious activity detected.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Report ID</th>
                      <th className="px-4 py-2.5 font-medium">Institution</th>
                      <th className="px-4 py-2.5 font-medium">Action</th>
                      <th className="px-4 py-2.5 font-medium">Risk Level</th>
                      <th className="px-4 py-2.5 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                    {blockAlerts.slice(0, 15).map((alert) => (
                      <tr key={alert.decision_id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-gray-900 dark:text-white">
                          {alert.decision_id.slice(0, 10)}...
                        </td>
                        <td className="px-4 py-2.5 text-primary font-medium">
                          {clientMap[alert.client_id] || "Unknown"}
                        </td>
                        <td className="px-4 py-2.5"><ActionBadge action={alert.action} /></td>
                        <td className="px-4 py-2.5"><RiskBadge level={alert.risk_level} /></td>
                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {new Date(alert.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Risk Distribution Chart */}
            <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Risk Distribution</h2>
              {totalRisk === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs">No risk data yet.</div>
              ) : (
                <>
                  {/* Simple donut chart via SVG */}
                  <div className="flex justify-center mb-4">
                    <svg width="120" height="120" viewBox="0 0 120 120">
                      {(() => {
                        let cumulative = 0;
                        const entries = Object.entries(riskDistribution).filter(([, v]) => v > 0);
                        return entries.map(([level, count]) => {
                          const pct = count / totalRisk;
                          const dashArray = pct * 283;
                          const dashOffset = -cumulative * 283;
                          cumulative += pct;
                          return (
                            <circle
                              key={level}
                              cx="60" cy="60" r="45"
                              fill="none"
                              stroke={RISK_COLORS[level] || "#94a3b8"}
                              strokeWidth="20"
                              strokeDasharray={`${dashArray} ${283 - dashArray}`}
                              strokeDashoffset={dashOffset}
                              transform="rotate(-90 60 60)"
                            />
                          );
                        });
                      })()}
                      <text x="60" y="56" textAnchor="middle" className="fill-gray-900 dark:fill-white text-lg font-bold">{totalRisk}</text>
                      <text x="60" y="72" textAnchor="middle" className="fill-gray-400 text-[10px]">total</text>
                    </svg>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(riskDistribution).map(([level, count]) => (
                      <div key={level} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RISK_COLORS[level] }} />
                          <span className="text-gray-600 dark:text-gray-300 capitalize">{level.toLowerCase()}</span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Regulated Entities */}
            <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Regulated Entities</h2>
                <span className="text-xs text-gray-400">{clients.length}</span>
              </div>
              {!clients.length ? (
                <div className="text-center py-4 text-gray-400 text-xs">No institutions found.</div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {clients.map((client) => (
                    <div
                      key={client.client_id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-navy-800"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <BuildingOffice2Icon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{client.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{client.contact_email || "—"}</p>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                          client.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {client.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Regulatory Reports */}
            <RegulatoryReports />
          </div>
        </div>
      </div>
    </RegulatorGuard>
  );
}

/* ── Regulatory Reports Download Section ── */
function RegulatoryReports() {
  const [triggerSar] = useLazyGenerateSarQuery();

  const downloadJson = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = async (filename: string) => {
    const res = await fetch(`/api/proxy/api/v1/compliance/summary/csv`, { credentials: "same-origin" });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reports = [
    {
      key: "sar",
      name: "SAR Reports",
      description: "BoG filing format",
      icon: ShieldExclamationIcon,
      action: async () => {
        const now = new Date().toISOString().slice(0, 10);
        const result = await triggerSar({}).unwrap();
        downloadJson(result, `sar-report-${now}.json`);
      },
    },
    {
      key: "kyc-audit",
      name: "KYC Audit Logs",
      description: "Full decision trail",
      icon: ClipboardDocumentListIcon,
      action: async () => {
        const now = new Date().toISOString().slice(0, 10);
        await downloadCsv(`kyc-audit-${now}.csv`);
      },
    },
  ];

  return (
    <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-4">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Regulatory Reports</h2>
      <div className="space-y-2">
        {reports.map((report) => (
          <button
            key={report.key}
            onClick={report.action}
            className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-navy-800 hover:bg-gray-100 dark:hover:bg-navy-600 transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
              <report.icon className="h-3.5 w-3.5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 dark:text-white">{report.name}</p>
              <p className="text-[10px] text-gray-400">{report.description}</p>
            </div>
            <DocumentArrowDownIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
