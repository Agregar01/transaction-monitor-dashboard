"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "@/redux/store";
import { useGetComplianceSummaryQuery, useLazyGenerateSarQuery } from "@/redux/slices/api/complianceApi";
import { useGetDecisionStatisticsQuery } from "@/redux/slices/api/decisionsApi";
import { useGetUsageQuery } from "@/redux/slices/api/usageApi";
import StatCard from "@/components/StatCard";
import ClientGuard from "@/components/ClientGuard";
import RoleGuard from "@/components/RoleGuard";
import { SkeletonStats, SkeletonTable } from "@/components/Skeleton";
import { showToast } from "@/components/Toast";
import {
  DocumentArrowDownIcon,
  ClockIcon,
  ChartBarIcon,
  TableCellsIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";

type ReportType = "compliance" | "risk" | "usage" | "decisions" | "sar";
type ExportFormat = "csv" | "json" | "pdf";

interface ReportConfig {
  type: ReportType;
  label: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const REPORT_CONFIGS: ReportConfig[] = [
  { type: "compliance", label: "Compliance Report", description: "Flagged decisions, risk breakdown, compliance alerts", icon: DocumentArrowDownIcon },
  { type: "risk", label: "Risk Analysis Report", description: "Risk distribution, high-risk customers, rule triggers", icon: ChartBarIcon },
  { type: "usage", label: "Usage Report", description: "API calls, daily breakdown, decision outcomes", icon: TableCellsIcon },
  { type: "decisions", label: "Decision History", description: "Full decision log with actions, risk, processing times", icon: ClockIcon },
  { type: "sar", label: "SAR Report", description: "Suspicious Activity Report — all flagged/blocked decisions in period", icon: ExclamationTriangleIcon },
];

export default function ReportsPage() {
  const { clientId } = useAppSelector((s) => s.auth);
  const [selectedReport, setSelectedReport] = useState<ReportType>("compliance");
  const [period, setPeriod] = useState("30d");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [generateSar, { data: sarData, isLoading: sarLoading }] = useLazyGenerateSarQuery();

  useEffect(() => {
    document.title = "Reports & Analytics | Deferred KYC";
  }, []);

  const periodDates = getPeriodDates(period);

  const { data: summary, isLoading: summaryLoading } = useGetComplianceSummaryQuery(
    { client_id: clientId!, ...periodDates },
    { skip: !clientId }
  );

  const { data: stats, isLoading: statsLoading } = useGetDecisionStatisticsQuery(
    { client_id: clientId!, period },
    { skip: !clientId }
  );

  const { data: usage, isLoading: usageLoading } = useGetUsageQuery(
    { client_id: clientId || undefined, ...periodDates },
    { skip: !clientId }
  );

  const handleExport = (type: ReportType, format: ExportFormat) => {
    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === "pdf") {
      window.print();
      return;
    }

    let data: string;
    if (format === "json") {
      const reportData = type === "compliance" ? summary : type === "decisions" ? stats : type === "sar" ? sarData : usage;
      data = JSON.stringify(reportData, null, 2);
      downloadFile(data, `${type}-report-${timestamp}.json`, "application/json");
    } else {
      data = generateCsv(type, summary, stats, usage, sarData);
      downloadFile(data, `${type}-report-${timestamp}.csv`, "text/csv");
    }

    showToast({ type: "success", title: "Exported", message: `${type} report downloaded as ${format.toUpperCase()}` });
  };

  const handleGenerateSar = () => {
    generateSar({ client_id: clientId!, ...periodDates });
  };

  const isLoading = summaryLoading || statsLoading || usageLoading || sarLoading;

  return (
    <ClientGuard>
    <RoleGuard allowedRoles={["OWNER", "ADMIN", "EXECUTIVE", "COMPLIANCE", "SUPERVISOR"]}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Generate, preview, and export compliance and analytics reports
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="text-sm border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white px-3 py-2"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Quick Stats */}
      {isLoading ? (
        <SkeletonStats count={4} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Decisions"
            value={stats?.total_decisions || 0}
            subtitle={`Period: ${period}`}
            icon={<ChartBarIcon className="h-8 w-8" aria-hidden="true" />}
            color="text-primary"
          />
          <StatCard
            title="API Calls"
            value={usage?.total_calls || 0}
            subtitle={`${usage?.total_evaluate_calls || 0} evaluations`}
            icon={<TableCellsIcon className="h-8 w-8" aria-hidden="true" />}
            color="text-blue-500"
          />
          <StatCard
            title="Flagged"
            value={summary?.flagged_decisions || 0}
            subtitle="BLOCK + FREEZE + REVIEW"
            icon={<DocumentArrowDownIcon className="h-8 w-8" aria-hidden="true" />}
            color="text-red-500"
          />
          <StatCard
            title="Avg Processing"
            value={`${(stats?.avg_processing_time_ms || 0).toFixed(0)}ms`}
            subtitle="Decision latency"
            icon={<ClockIcon className="h-8 w-8" aria-hidden="true" />}
            color="text-amber-500"
          />
        </div>
      )}

      {/* Report Selection + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report Selector */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Select Report</p>
          {REPORT_CONFIGS.map((rc) => (
            <button
              key={rc.type}
              onClick={() => setSelectedReport(rc.type)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedReport === rc.type
                  ? "border-primary bg-primary/5 dark:bg-primary/10"
                  : "border-gray-200 dark:border-navy-600 bg-white dark:bg-navy-700 hover:bg-gray-50 dark:hover:bg-navy-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <rc.icon className={`h-5 w-5 ${selectedReport === rc.type ? "text-primary" : "text-gray-400"}`} aria-hidden="true" />
                <div>
                  <p className={`text-sm font-medium ${selectedReport === rc.type ? "text-primary" : "text-gray-900 dark:text-white"}`}>
                    {rc.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{rc.description}</p>
                </div>
              </div>
            </button>
          ))}

          {/* Export Controls */}
          <div className="mt-6 p-4 bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">Export</p>
            <div className="flex items-center gap-1 mb-3">
              {(["csv", "json", "pdf"] as ExportFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setExportFormat(fmt)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    exportFormat === fmt
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-200 dark:border-navy-600 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => handleExport(selectedReport, exportFormat)}
              disabled={isLoading || (selectedReport === "sar" && !sarData && exportFormat !== "pdf")}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {exportFormat === "pdf" ? <PrinterIcon className="h-4 w-4" aria-hidden="true" /> : <DocumentArrowDownIcon className="h-4 w-4" aria-hidden="true" />}
              {exportFormat === "pdf" ? "Print / Save as PDF" : "Download Report"}
            </button>
            {selectedReport === "sar" && (
              <button
                onClick={handleGenerateSar}
                disabled={sarLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-4 w-4 ${sarLoading ? "animate-spin" : ""}`} aria-hidden="true" />
                {sarLoading ? "Generating..." : "Generate SAR"}
              </button>
            )}
          </div>
        </div>

        {/* Report Preview */}
        <div className="lg:col-span-3 bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-600 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {REPORT_CONFIGS.find((r) => r.type === selectedReport)?.label} Preview
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <CalendarDaysIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {periodDates.start_date} to {periodDates.end_date}
            </span>
          </div>

          <div className="p-6">
            {isLoading && selectedReport !== "sar" ? (
              <SkeletonTable rows={6} cols={4} />
            ) : selectedReport === "compliance" ? (
              <CompliancePreview summary={summary} />
            ) : selectedReport === "risk" ? (
              <RiskPreview summary={summary} />
            ) : selectedReport === "usage" ? (
              <UsagePreview usage={usage} />
            ) : selectedReport === "sar" ? (
              <SarPreview sarData={sarData} onGenerate={handleGenerateSar} isLoading={sarLoading} />
            ) : (
              <DecisionsPreview stats={stats} />
            )}
          </div>
        </div>
      </div>
    </div>
    </RoleGuard>
    </ClientGuard>
  );
}

/* ── Preview Components ── */

function CompliancePreview({ summary }: { summary?: ComplianceSummaryType }) {
  if (!summary) return <EmptyPreview />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PreviewStat label="Total Decisions" value={summary.total_decisions} />
        <PreviewStat label="Flagged" value={summary.flagged_decisions} />
        <PreviewStat label="High Risk Customers" value={summary.high_risk_customers} />
        <PreviewStat label="Avg Risk Score" value={summary.average_risk_score?.toFixed(1) || "0"} />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Decisions by Action</p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {Object.entries(summary.decisions_by_action || {}).map(([action, count]) => (
            <div key={action} className="text-center p-2 rounded bg-gray-50 dark:bg-navy-800">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{count}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{action}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Decisions by Risk Level</p>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(summary.decisions_by_risk || {}).map(([level, count]) => (
            <div key={level} className="text-center p-2 rounded bg-gray-50 dark:bg-navy-800">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{count}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{level}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RiskPreview({ summary }: { summary?: ComplianceSummaryType }) {
  if (!summary) return <EmptyPreview />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <PreviewStat label="Avg Risk Score" value={summary.average_risk_score?.toFixed(1) || "0"} />
        <PreviewStat label="High Risk Customers" value={summary.high_risk_customers} />
        <PreviewStat label="Flagged Decisions" value={summary.flagged_decisions} />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Tier Distribution</p>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {Object.entries(summary.tier_distribution || {}).map(([tier, count]) => (
            <div key={tier} className="text-center p-2 rounded bg-gray-50 dark:bg-navy-800">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{count}</p>
              <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{tier}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UsagePreview({ usage }: { usage?: UsageType }) {
  if (!usage) return <EmptyPreview />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PreviewStat label="Total Calls" value={usage.total_calls} />
        <PreviewStat label="Evaluate Calls" value={usage.total_evaluate_calls} />
        <PreviewStat label="Allowed" value={usage.total_allow} />
        <PreviewStat label="Blocked" value={usage.total_block} />
      </div>
      {usage.daily_breakdown?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Recent Daily Breakdown</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-navy-800 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2 text-right font-medium">Allow</th>
                  <th className="px-3 py-2 text-right font-medium">Block</th>
                  <th className="px-3 py-2 text-right font-medium">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                {usage.daily_breakdown.slice(-10).map((day) => (
                  <tr key={day.date}>
                    <td className="px-3 py-2 text-gray-900 dark:text-white font-mono">{day.date}</td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{day.total_calls}</td>
                    <td className="px-3 py-2 text-right text-green-600">{day.decisions_allow}</td>
                    <td className="px-3 py-2 text-right text-red-600">{day.decisions_block}</td>
                    <td className="px-3 py-2 text-right text-amber-600">{day.decisions_review}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function DecisionsPreview({ stats }: { stats?: DecisionStatsType }) {
  if (!stats) return <EmptyPreview />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <PreviewStat label="Total Decisions" value={stats.total_decisions} />
        <PreviewStat label="Avg Processing" value={`${stats.avg_processing_time_ms.toFixed(0)}ms`} />
        <PreviewStat label="Period" value={stats.period} />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">By Action</p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {Object.entries(stats.decisions_by_action || {}).map(([action, count]) => (
            <div key={action} className="text-center p-2 rounded bg-gray-50 dark:bg-navy-800">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{count}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{action}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">By Risk Level</p>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(stats.decisions_by_risk_level || {}).map(([level, count]) => (
            <div key={level} className="text-center p-2 rounded bg-gray-50 dark:bg-navy-800">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{count}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{level}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-lg bg-gray-50 dark:bg-navy-800">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}

function SarPreview({ sarData, onGenerate, isLoading }: { sarData?: SarType; onGenerate: () => void; isLoading: boolean }) {
  if (!sarData) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-10 w-10 mx-auto mb-3 text-amber-400" aria-hidden="true" />
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Suspicious Activity Report</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Click &ldquo;Generate SAR&rdquo; to compile suspicious activity for the selected period.</p>
        <button onClick={onGenerate} disabled={isLoading} className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
          {isLoading ? "Generating..." : "Generate SAR"}
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PreviewStat label="Total Suspicious" value={sarData.total_suspicious} />
        <PreviewStat label="Period Start" value={sarData.period_start?.slice(0, 10) || "—"} />
        <PreviewStat label="Period End" value={sarData.period_end?.slice(0, 10) || "—"} />
        <PreviewStat label="Report ID" value={sarData.report_id?.slice(0, 8) + "..."} />
      </div>
      {sarData.items?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Suspicious Decisions</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-navy-800 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Decision ID</th>
                  <th className="px-3 py-2 text-left font-medium">Action</th>
                  <th className="px-3 py-2 text-left font-medium">Risk</th>
                  <th className="px-3 py-2 text-right font-medium">Score</th>
                  <th className="px-3 py-2 text-left font-medium">Rules Triggered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                {sarData.items.slice(0, 15).map((item) => (
                  <tr key={item.decision_id}>
                    <td className="px-3 py-2 font-mono text-gray-900 dark:text-white">{item.decision_id.slice(0, 8)}…</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${item.action === "BLOCK" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                        {item.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{item.risk_level}</td>
                    <td className="px-3 py-2 text-right font-mono">{item.risk_score}</td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{item.triggered_rules?.slice(0, 2).join(", ")}{item.triggered_rules?.length > 2 ? "…" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sarData.items.length > 15 && (
            <p className="text-xs text-gray-400 mt-2 text-center">Showing 15 of {sarData.items.length} items. Download to see all.</p>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
      <ArrowPathIcon className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" aria-hidden="true" />
      <p className="text-sm">No data available for the selected period.</p>
    </div>
  );
}

/* ── Helpers ── */

type ComplianceSummaryType = {
  total_decisions: number;
  flagged_decisions: number;
  high_risk_customers: number;
  average_risk_score: number;
  decisions_by_action: Record<string, number>;
  decisions_by_risk: Record<string, number>;
  tier_distribution: Record<string, number>;
};

type UsageType = {
  total_calls: number;
  total_evaluate_calls: number;
  total_allow: number;
  total_block: number;
  daily_breakdown: Array<{
    date: string;
    total_calls: number;
    decisions_allow: number;
    decisions_block: number;
    decisions_review: number;
  }>;
};

type DecisionStatsType = {
  total_decisions: number;
  avg_processing_time_ms: number;
  period: string;
  decisions_by_action: Record<string, number>;
  decisions_by_risk_level: Record<string, number>;
};

type SarType = {
  report_id: string;
  generated_at: string;
  client_id: string;
  period_start: string;
  period_end: string;
  total_suspicious: number;
  items: Array<{
    decision_id: string;
    customer_id: string;
    action: string;
    risk_level: string;
    risk_score: number;
    reason: string;
    triggered_rules: string[];
    tier_at_decision: string | null;
    created_at: string | null;
  }>;
};

function getPeriodDates(period: string) {
  const end = new Date();
  const start = new Date();
  const days = parseInt(period) || 30;
  start.setDate(start.getDate() - days);
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  };
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function generateCsv(
  type: ReportType,
  summary?: ComplianceSummaryType,
  stats?: DecisionStatsType,
  usage?: UsageType,
  sarData?: SarType
): string {
  if (type === "compliance" && summary) {
    const rows = [["Metric", "Value"]];
    rows.push(["Total Decisions", String(summary.total_decisions)]);
    rows.push(["Flagged Decisions", String(summary.flagged_decisions)]);
    rows.push(["High Risk Customers", String(summary.high_risk_customers)]);
    rows.push(["Avg Risk Score", String(summary.average_risk_score?.toFixed(2))]);
    Object.entries(summary.decisions_by_action || {}).forEach(([k, v]) => rows.push([`Action: ${k}`, String(v)]));
    Object.entries(summary.decisions_by_risk || {}).forEach(([k, v]) => rows.push([`Risk: ${k}`, String(v)]));
    return rows.map((r) => r.join(",")).join("\n");
  }

  if (type === "usage" && usage) {
    const rows = [["Date", "Total Calls", "Allow", "Block", "Review"]];
    (usage.daily_breakdown || []).forEach((d) =>
      rows.push([d.date, String(d.total_calls), String(d.decisions_allow), String(d.decisions_block), String(d.decisions_review)])
    );
    return rows.map((r) => r.join(",")).join("\n");
  }

  if (type === "decisions" && stats) {
    const rows = [["Metric", "Value"]];
    rows.push(["Total Decisions", String(stats.total_decisions)]);
    rows.push(["Avg Processing Time (ms)", String(stats.avg_processing_time_ms.toFixed(2))]);
    Object.entries(stats.decisions_by_action || {}).forEach(([k, v]) => rows.push([`Action: ${k}`, String(v)]));
    Object.entries(stats.decisions_by_risk_level || {}).forEach(([k, v]) => rows.push([`Risk: ${k}`, String(v)]));
    return rows.map((r) => r.join(",")).join("\n");
  }

  if (type === "sar" && sarData) {
    const rows = [["Decision ID", "Customer ID", "Action", "Risk Level", "Risk Score", "Reason", "Triggered Rules", "Tier", "Created At"]];
    (sarData.items || []).forEach((item) =>
      rows.push([
        item.decision_id, item.customer_id, item.action, item.risk_level,
        String(item.risk_score), `"${item.reason}"`,
        `"${(item.triggered_rules || []).join("; ")}"`,
        item.tier_at_decision || "", item.created_at || ""
      ])
    );
    return rows.map((r) => r.join(",")).join("\n");
  }

  return "No data";
}
