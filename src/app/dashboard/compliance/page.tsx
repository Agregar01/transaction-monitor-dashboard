"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAppSelector } from "@/redux/store";
import {
  useGetComplianceSummaryQuery,
  useGetComplianceAlertsQuery,
  useGetReviewQueueQuery,
} from "@/redux/slices/api/complianceApi";

import StatCard from "@/components/StatCard";
import RiskBadge from "@/components/RiskBadge";
import ActionBadge from "@/components/ActionBadge";
import { SkeletonStats, SkeletonTable } from "@/components/Skeleton";
import RoleGuard from "@/components/RoleGuard";
import {
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  DocumentMagnifyingGlassIcon,
  NewspaperIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

// Derive alert type from triggered rule codes
function getAlertType(triggeredRules: string[]): string {
  if (!triggeredRules?.length) return "Other";
  const codes = triggeredRules.map((r) => (typeof r === "string" ? r : String(r)).split("_")[0]);
  if (codes.some((c) => c === "TXN" || c === "BEH")) return "AML";
  if (codes.some((c) => c === "REG")) return "PEP";
  if (codes.some((c) => c === "EXT")) return "Sanctions";
  if (codes.some((c) => c === "DOC")) return "Document Anomaly";
  if (codes.some((c) => c === "ADV")) return "Adverse Media";
  return "Other";
}

const ALERT_TYPE_BADGE: Record<string, string> = {
  AML: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  PEP: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Sanctions: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "Document Anomaly": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Adverse Media": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Other: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

export default function CompliancePage() {
  const { clientId, isAdmin } = useAppSelector((s) => s.auth);

  const [riskFilter, setRiskFilter] = useState("ALL");
  const [alertTypeFilter, setAlertTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    document.title = "Compliance Dashboard | Deferred KYC";
  }, []);

  // Admins can view all data without a client_id filter; clients must have clientId
  const skipQuery = !isAdmin && !clientId;

  const { data: summary, isLoading: summaryLoading } = useGetComplianceSummaryQuery(
    { client_id: clientId ?? undefined },
    { skip: skipQuery }
  );

  const { data: alerts, isLoading: alertsLoading, refetch: refetchAlerts } = useGetComplianceAlertsQuery(
    { client_id: clientId ?? undefined, limit: 200 },
    { skip: skipQuery }
  );

  const { data: reviewQueue, isLoading: reviewLoading } = useGetReviewQueueQuery(
    { client_id: clientId ?? undefined, limit: 100 },
    { skip: skipQuery }
  );

  // Compute alert type counts for KPI cards
  const alertCounts = useMemo(() => {
    const items = alerts?.items || [];
    return {
      aml: items.filter((a) => getAlertType(a.triggered_rules) === "AML").length,
      pep: items.filter((a) => getAlertType(a.triggered_rules) === "PEP").length,
      sanctions: items.filter((a) => getAlertType(a.triggered_rules) === "Sanctions").length,
      adverseMedia: items.filter((a) => getAlertType(a.triggered_rules) === "Adverse Media").length,
      documentAnomalies: items.filter((a) => getAlertType(a.triggered_rules) === "Document Anomaly").length,
    };
  }, [alerts]);

  // Build the case investigation queue from alerts + review queue
  // Alerts are the primary source; review queue adds cases not already covered
  const investigationQueue = useMemo(() => {
    const alertItems = (alerts?.items || []).map((a) => ({
      case_id: a.decision_id,
      customer_id: a.customer_id,
      risk_score: a.risk_score,
      risk_level: a.risk_level,
      alert_type: getAlertType(a.triggered_rules),
      verification_status: a.action,
      assigned_investigator: "—",
      escalation_level: a.risk_level === "CRITICAL" ? "High" : a.risk_level === "VERY_HIGH" ? "Medium" : "Low",
      created_at: a.created_at,
    }));

    // Add review queue items not already in alerts
    const alertIds = new Set(alertItems.map((a) => a.case_id));
    const reviewItems = (reviewQueue?.items || [])
      .filter((r) => !alertIds.has(r.decision_id))
      .map((r) => ({
        case_id: r.decision_id,
        customer_id: r.customer_id,
        risk_score: r.risk_score,
        risk_level: r.risk_level,
        alert_type: "Other",
        verification_status: "REVIEW",
        assigned_investigator: "—",
        escalation_level: r.risk_level === "CRITICAL" ? "High" : r.risk_level === "VERY_HIGH" ? "Medium" : "Low",
        created_at: r.created_at,
      }));

    return [...alertItems, ...reviewItems];
  }, [alerts, reviewQueue]);

  // Apply filters
  const filteredQueue = useMemo(() => {
    return investigationQueue.filter((item) => {
      if (riskFilter !== "ALL" && item.risk_level !== riskFilter) return false;
      if (alertTypeFilter !== "ALL" && item.alert_type !== alertTypeFilter) return false;
      if (statusFilter !== "ALL" && item.verification_status !== statusFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          item.case_id.toLowerCase().includes(term) ||
          item.customer_id.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [investigationQueue, riskFilter, alertTypeFilter, statusFilter, searchTerm]);

  const isLoading = alertsLoading || reviewLoading;

  return (
    <RoleGuard allowedRoles={["OWNER", "ADMIN", "COMPLIANCE"]}>
        <div className="space-y-6">

          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Compliance Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Monitor risk alerts, investigate flagged cases, and manage compliance reviews
              </p>
            </div>
            <button
              onClick={() => refetchAlerts()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-navy-700 border border-gray-200 dark:border-navy-600 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
              Refresh
            </button>
          </div>

          {/* Alert Summary Panel — 5 KPI cards */}
          {summaryLoading || alertsLoading ? (
            <SkeletonStats count={5} />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard
                title="AML Matches"
                value={alertCounts.aml}
                subtitle="Transaction & behavioral"
                icon={<ShieldExclamationIcon className="h-8 w-8" aria-hidden="true" />}
                color="text-red-600"
              />
              <StatCard
                title="PEP Matches"
                value={alertCounts.pep}
                subtitle="Regulatory exposure"
                icon={<ExclamationTriangleIcon className="h-8 w-8" aria-hidden="true" />}
                color="text-amber-500"
              />
              <StatCard
                title="Sanctions Hits"
                value={alertCounts.sanctions}
                subtitle="External screening"
                icon={<FlagIcon className="h-8 w-8" aria-hidden="true" />}
                color="text-purple-600"
              />
              <StatCard
                title="Adverse Media"
                value={alertCounts.adverseMedia}
                subtitle="Media risk alerts"
                icon={<NewspaperIcon className="h-8 w-8" aria-hidden="true" />}
                color="text-orange-500"
              />
              <StatCard
                title="Document Anomalies"
                value={alertCounts.documentAnomalies}
                subtitle="Document flag alerts"
                icon={<DocumentMagnifyingGlassIcon className="h-8 w-8" aria-hidden="true" />}
                color="text-blue-600"
              />
            </div>
          )}

          {/* Case Investigation Queue */}
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
            {/* Queue header + filters */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-600">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Case Investigation Queue
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {filteredQueue.length} cases
                    {filteredQueue.length !== investigationQueue.length && ` (filtered from ${investigationQueue.length})`}
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Search */}
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
                    <input
                      type="text"
                      placeholder="Search case ID or customer..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent w-52"
                    />
                  </div>

                  <FunnelIcon className="h-4 w-4 text-gray-400 hidden sm:block" aria-hidden="true" />

                  {/* Risk Level filter */}
                  <select
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    className="text-sm border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white px-3 py-2"
                    aria-label="Filter by risk level"
                  >
                    <option value="ALL">All Risk Levels</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="VERY_HIGH">Very High</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>

                  {/* Alert Type filter */}
                  <select
                    value={alertTypeFilter}
                    onChange={(e) => setAlertTypeFilter(e.target.value)}
                    className="text-sm border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white px-3 py-2"
                    aria-label="Filter by alert type"
                  >
                    <option value="ALL">All Alert Types</option>
                    <option value="AML">AML</option>
                    <option value="PEP">PEP</option>
                    <option value="Sanctions">Sanctions</option>
                    <option value="Adverse Media">Adverse Media</option>
                    <option value="Document Anomaly">Document Anomaly</option>
                  </select>

                  {/* Investigation Status filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-sm border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white px-3 py-2"
                    aria-label="Filter by investigation status"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="REVIEW">Review</option>
                    <option value="BLOCK">Blocked</option>
                    <option value="FREEZE">Frozen</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <SkeletonTable rows={6} cols={7} />
            ) : filteredQueue.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <ShieldExclamationIcon className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" aria-hidden="true" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">No cases match the selected filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3 font-medium">Case ID</th>
                      <th className="px-6 py-3 font-medium">Customer</th>
                      <th className="px-6 py-3 font-medium">Risk Score</th>
                      <th className="px-6 py-3 font-medium">Alert Type</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Assigned Investigator</th>
                      <th className="px-6 py-3 font-medium">Escalation</th>
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 font-medium sr-only">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                    {filteredQueue.slice(0, 50).map((item) => (
                      <tr
                        key={item.case_id}
                        className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors"
                      >
                        <td className="px-6 py-4 font-mono text-xs text-gray-900 dark:text-white whitespace-nowrap">
                          {item.case_id.slice(0, 18)}…
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-300">
                          {item.customer_id.slice(0, 12)}…
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {item.risk_score.toFixed(1)}
                            </span>
                            <RiskBadge level={item.risk_level} />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ALERT_TYPE_BADGE[item.alert_type] || ALERT_TYPE_BADGE.Other}`}>
                            {item.alert_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <ActionBadge action={item.verification_status} />
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">
                          {item.assigned_investigator}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            item.escalation_level === "High"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : item.escalation_level === "Medium"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                          }`}>
                            {item.escalation_level}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/dashboard/compliance/${item.case_id}`}
                            className="inline-flex items-center gap-1 text-primary hover:text-primary-600 text-sm font-medium whitespace-nowrap"
                          >
                            Investigate
                            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredQueue.length > 50 && (
                  <div className="px-6 py-3 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-navy-600">
                    Showing 50 of {filteredQueue.length} cases. Refine your filters to narrow results.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Summary footer — quick stats */}
          {!summaryLoading && summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Decisions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{summary.total_decisions ?? 0}</p>
              </div>
              <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Flagged</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{summary.flagged_decisions ?? 0}</p>
              </div>
              <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Avg Risk Score</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{summary.average_risk_score?.toFixed(1) ?? "0.0"}</p>
              </div>
              <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">High-Risk Customers</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{summary.high_risk_customers ?? 0}</p>
              </div>
            </div>
          )}

        </div>
    </RoleGuard>
  );
}
