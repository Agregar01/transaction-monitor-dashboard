"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAppSelector } from "@/redux/store";
import { useGetDecisionStatisticsQuery, useGetDecisionHistoryQuery } from "@/redux/slices/api/decisionsApi";
import { useGetUsageQuery } from "@/redux/slices/api/usageApi";
import { useListCustomersQuery } from "@/redux/slices/api/customersApi";
import { useGetComplianceSummaryQuery, useGetVerificationBacklogQuery } from "@/redux/slices/api/complianceApi";
import UsageChart from "@/components/UsageChart";
import { chartColors } from "@/config/constants";
import ClientGuard from "@/components/ClientGuard";
import RoleGuard from "@/components/RoleGuard";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const { action: actionColors, risk: riskColors, tier: tierColors } = chartColors;

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

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AnalyticsPage() {
  useEffect(() => { document.title = "Analytics | Deferred KYC"; }, []);
  const clientId = useAppSelector((s) => s.auth.clientId) || "";
  const isAdmin = useAppSelector((s) => s.auth.isAdmin);
  const [period, setPeriod] = useState("30d");

  const periodDates = getPeriodDates(period);

  const { data: stats } = useGetDecisionStatisticsQuery({ client_id: clientId, period });
  const { data: usage } = useGetUsageQuery({ client_id: clientId });
  const { data: decisions } = useGetDecisionHistoryQuery({ client_id: clientId, limit: 200 });
  const { data: customers } = useListCustomersQuery({ client_id: isAdmin ? undefined : clientId, page_size: 1000 });
  const { data: compliance } = useGetComplianceSummaryQuery(
    { client_id: clientId || undefined, ...periodDates },
    { skip: !clientId && !isAdmin }
  );
  const { data: backlog } = useGetVerificationBacklogQuery(
    { client_id: isAdmin ? undefined : clientId || undefined },
    { skip: !clientId && !isAdmin }
  );

  // Compute tier distribution from customers
  const tierDist: Record<string, number> = {};
  if (customers?.items) {
    for (const c of customers.items) {
      tierDist[c.current_tier] = (tierDist[c.current_tier] || 0) + 1;
    }
  }

  const processingTimes = decisions?.map((d) => d.processing_time_ms) || [];
  const avgProcessingTime = processingTimes.length
    ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length)
    : 0;
  const p95ProcessingTime = processingTimes.length
    ? processingTimes.sort((a, b) => a - b)[Math.floor(processingTimes.length * 0.95)]
    : 0;

  // Derived compliance KPIs
  const totalVerified = (backlog?.by_status?.passed ?? 0) + (backlog?.by_status?.failed ?? 0);
  const verificationRate = totalVerified > 0
    ? Math.round((backlog!.by_status.passed / totalVerified) * 100)
    : null;

  const totalCustomers = customers?.total ?? 0;
  const highRiskPct = totalCustomers > 0 && compliance?.high_risk_customers != null
    ? Math.round((compliance.high_risk_customers / totalCustomers) * 100)
    : null;

  const totalDecisions = compliance?.total_decisions ?? 0;
  const flaggedDecisions = compliance?.flagged_decisions ?? 0;
  const escalationRate = totalDecisions > 0
    ? Math.round((flaggedDecisions / totalDecisions) * 100)
    : null;

  const handleExport = () => {
    const rows: string[][] = [["Metric", "Value"]];
    if (stats) {
      rows.push(["Total Decisions", String(stats.total_decisions)]);
      rows.push(["Avg Latency (ms)", String(stats.avg_processing_time_ms.toFixed(1))]);
      Object.entries(stats.decisions_by_action || {}).forEach(([k, v]) => rows.push([`Action: ${k}`, String(v)]));
      Object.entries(stats.decisions_by_risk_level || {}).forEach(([k, v]) => rows.push([`Risk: ${k}`, String(v)]));
    }
    if (compliance) {
      rows.push(["High Risk Customers", String(compliance.high_risk_customers)]);
      rows.push(["Flagged Decisions", String(compliance.flagged_decisions)]);
    }
    if (verificationRate != null) rows.push(["Verification Completion Rate (%)", String(verificationRate)]);
    if (highRiskPct != null) rows.push(["High Risk %", String(highRiskPct)]);
    if (escalationRate != null) rows.push(["Escalation Rate (%)", String(escalationRate)]);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadCsv(rows.map((r) => r.join(",")).join("\n"), `analytics-${timestamp}.csv`);
  };

  return (
    <ClientGuard>
    <RoleGuard allowedRoles={["OWNER", "ADMIN", "EXECUTIVE", "COMPLIANCE"]}>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isAdmin ? "Platform Analytics" : "Analytics"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Decision trends, risk distribution, and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border dark:border-navy-600 dark:bg-navy-700 dark:text-white rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 dark:border-navy-600 bg-white dark:bg-navy-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards — Row 1: Core metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Decisions</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats?.total_decisions?.toLocaleString() ?? "..."}
          </p>
        </div>
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg Latency</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {stats?.avg_processing_time_ms ? `${Math.round(stats.avg_processing_time_ms)}ms` : avgProcessingTime ? `${avgProcessingTime}ms` : "..."}
          </p>
        </div>
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">P95 Latency</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {p95ProcessingTime ? `${p95ProcessingTime}ms` : "..."}
          </p>
        </div>
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Customers</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {customers?.total?.toLocaleString() ?? "..."}
          </p>
        </div>
      </div>

      {/* Summary Cards — Row 2: Compliance KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Verification Completion Rate</p>
          <p className={`text-2xl font-bold mt-1 ${verificationRate != null && verificationRate >= 80 ? "text-green-600" : verificationRate != null ? "text-amber-600" : "text-gray-400"}`}>
            {verificationRate != null ? `${verificationRate}%` : "—"}
          </p>
          <p className="text-xs text-gray-400 mt-1">Passed / (Passed + Failed)</p>
        </div>
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">High-Risk Customer Rate</p>
          <p className={`text-2xl font-bold mt-1 ${highRiskPct != null && highRiskPct > 10 ? "text-red-600" : highRiskPct != null ? "text-amber-500" : "text-gray-400"}`}>
            {highRiskPct != null ? `${highRiskPct}%` : "—"}
          </p>
          <p className="text-xs text-gray-400 mt-1">High-risk customers / total</p>
        </div>
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Compliance Escalation Rate</p>
          <p className={`text-2xl font-bold mt-1 ${escalationRate != null && escalationRate > 15 ? "text-red-600" : escalationRate != null ? "text-green-600" : "text-gray-400"}`}>
            {escalationRate != null ? `${escalationRate}%` : "—"}
          </p>
          <p className="text-xs text-gray-400 mt-1">Flagged / total decisions</p>
        </div>
      </div>

      {/* Charts Row 1: Decision Trend + Action Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
          <h2 className="text-lg font-semibold dark:text-white mb-4">Decision Trend</h2>
          {usage && usage.daily_breakdown.length > 0 ? (
            <UsageChart data={usage.daily_breakdown} />
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400 text-sm">No data</div>
          )}
        </div>

        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
          <h2 className="text-lg font-semibold dark:text-white mb-4">Actions Breakdown</h2>
          {stats?.decisions_by_action && Object.keys(stats.decisions_by_action).length > 0 ? (
            <Chart
              options={{
                chart: { type: "donut", fontFamily: "inherit" },
                labels: Object.keys(stats.decisions_by_action),
                colors: Object.keys(stats.decisions_by_action).map((k) => actionColors[k] || "#94a3b8"),
                legend: { position: "bottom", fontSize: "12px" },
                dataLabels: { enabled: true, formatter: (val: number) => `${val.toFixed(0)}%` },
              }}
              series={Object.values(stats.decisions_by_action)}
              type="donut"
              height={280}
            />
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Charts Row 2: Risk Distribution + Tier Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
          <h2 className="text-lg font-semibold dark:text-white mb-4">Risk Level Distribution</h2>
          {stats?.decisions_by_risk_level && Object.keys(stats.decisions_by_risk_level).length > 0 ? (
            <Chart
              options={{
                chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit" },
                xaxis: { categories: Object.keys(stats.decisions_by_risk_level) },
                colors: Object.keys(stats.decisions_by_risk_level).map((k) => riskColors[k] || "#94a3b8"),
                plotOptions: { bar: { borderRadius: 4, columnWidth: "50%", distributed: true } },
                legend: { show: false },
                dataLabels: { enabled: true },
                grid: { borderColor: "#f3f4f6" },
              }}
              series={[{ name: "Decisions", data: Object.values(stats.decisions_by_risk_level) }]}
              type="bar"
              height={280}
            />
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">No data</div>
          )}
        </div>

        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
          <h2 className="text-lg font-semibold dark:text-white mb-4">Customer Tier Distribution</h2>
          {Object.keys(tierDist).length > 0 ? (
            <Chart
              options={{
                chart: { type: "donut", fontFamily: "inherit" },
                labels: Object.keys(tierDist),
                colors: Object.keys(tierDist).map((k) => tierColors[k] || "#94a3b8"),
                legend: { position: "bottom", fontSize: "12px" },
                dataLabels: { enabled: true, formatter: (val: number) => `${val.toFixed(0)}%` },
              }}
              series={Object.values(tierDist)}
              type="donut"
              height={280}
            />
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Verification Success Rates */}
      {backlog && (
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
          <h2 className="text-lg font-semibold dark:text-white mb-4">Verification Status Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Not Started", value: backlog.by_status.none, color: "text-gray-500" },
              { label: "Pending", value: backlog.by_status.pending, color: "text-amber-500" },
              { label: "Passed", value: backlog.by_status.passed, color: "text-green-600" },
              { label: "Failed", value: backlog.by_status.failed, color: "text-red-600" },
            ].map((s) => (
              <div key={s.label} className="text-center p-4 bg-gray-50 dark:bg-navy-800 rounded-lg">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="w-full h-3 bg-gray-100 dark:bg-navy-600 rounded-full overflow-hidden flex">
              {totalVerified + backlog.by_status.none + backlog.by_status.pending > 0 && (() => {
                const total = backlog.by_status.none + backlog.by_status.pending + backlog.by_status.passed + backlog.by_status.failed;
                return (
                  <>
                    <div style={{ width: `${(backlog.by_status.passed / total) * 100}%` }} className="h-full bg-green-500" />
                    <div style={{ width: `${(backlog.by_status.failed / total) * 100}%` }} className="h-full bg-red-500" />
                    <div style={{ width: `${(backlog.by_status.pending / total) * 100}%` }} className="h-full bg-amber-400" />
                    <div style={{ width: `${(backlog.by_status.none / total) * 100}%` }} className="h-full bg-gray-300 dark:bg-navy-500" />
                  </>
                );
              })()}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Passed</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Failed</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Pending</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-navy-500 inline-block" />Not Started</span>
            </div>
          </div>
        </div>
      )}

      {/* Processing Time Trend */}
      {decisions && decisions.length > 5 && (
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
          <h2 className="text-lg font-semibold dark:text-white mb-4">Processing Time Trend</h2>
          <Chart
            options={{
              chart: { type: "area", toolbar: { show: false }, fontFamily: "inherit" },
              xaxis: {
                categories: [...decisions].reverse().map((d) =>
                  new Date(d.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                ),
                labels: { style: { fontSize: "10px" }, rotate: -45, rotateAlways: decisions.length > 20 },
              },
              yaxis: { title: { text: "ms" }, labels: { style: { fontSize: "11px" } } },
              colors: ["#3b82f6"],
              stroke: { curve: "smooth", width: 2 },
              fill: { type: "gradient", gradient: { opacityFrom: 0.3, opacityTo: 0.05 } },
              dataLabels: { enabled: false },
              grid: { borderColor: "#f3f4f6" },
              tooltip: { y: { formatter: (v: number) => `${v}ms` } },
            }}
            series={[{ name: "Processing Time", data: [...decisions].reverse().map((d) => d.processing_time_ms) }]}
            type="area"
            height={280}
          />
        </div>
      )}
    </div>
    </RoleGuard>
    </ClientGuard>
  );
}
