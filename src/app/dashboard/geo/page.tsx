"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useGetGeoHeatmapQuery } from "@/redux/slices/api/analyticsApi";
import type { GeoCountryStat, GeoCluster, GeoCorridor } from "@/types/api";

// Leaflet must be imported client-side only (no SSR)
const GeoMap = dynamic(() => import("@/components/GeoMap"), { ssr: false });

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function FraudBadge({ rate }: { rate: number }) {
  const pct = (rate * 100).toFixed(1);
  const color =
    rate >= 0.1 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" :
    rate >= 0.05 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" :
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${color}`}>{pct}%</span>;
}

function CountryTable({ data }: { data: GeoCountryStat[] }) {
  const sorted = [...data].sort((a, b) => b.alert_count - a.alert_count).slice(0, 15);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-gray-700 dark:text-gray-200">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-navy-600">
            <th className="pb-2 pr-4">Country</th>
            <th className="pb-2 pr-4 text-right">Transactions</th>
            <th className="pb-2 pr-4 text-right">Volume</th>
            <th className="pb-2 pr-4 text-right">Alerts</th>
            <th className="pb-2 text-right">Fraud rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-navy-700">
          {sorted.map((row) => (
            <tr key={row.country_code} className="hover:bg-gray-50 dark:hover:bg-navy-600">
              <td className="py-2 pr-4 font-mono font-semibold">{row.country_code}</td>
              <td className="py-2 pr-4 text-right">{row.transaction_count.toLocaleString()}</td>
              <td className="py-2 pr-4 text-right">{formatCurrency(row.total_volume)}</td>
              <td className="py-2 pr-4 text-right">{row.alert_count.toLocaleString()}</td>
              <td className="py-2 text-right"><FraudBadge rate={row.fraud_rate} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CorridorTable({ data }: { data: GeoCorridor[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-gray-700 dark:text-gray-200">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-navy-600">
            <th className="pb-2 pr-4">Corridor</th>
            <th className="pb-2 pr-4 text-right">Transactions</th>
            <th className="pb-2 text-right">Volume</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-navy-700">
          {data.map((c, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-navy-600">
              <td className="py-2 pr-4 font-mono">
                <span className="font-semibold">{c.sender_country}</span>
                <span className="text-gray-400 mx-1">→</span>
                <span className="font-semibold">{c.receiver_country}</span>
              </td>
              <td className="py-2 pr-4 text-right">{c.txn_count.toLocaleString()}</td>
              <td className="py-2 text-right">{formatCurrency(c.total_volume)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClusterTable({ data }: { data: GeoCluster[] }) {
  const sorted = [...data].sort((a, b) => b.size - a.size).slice(0, 10);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-gray-700 dark:text-gray-200">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-navy-600">
            <th className="pb-2 pr-4">Cluster</th>
            <th className="pb-2 pr-4">Country</th>
            <th className="pb-2 pr-4 text-right">Size</th>
            <th className="pb-2 pr-4 text-right">Avg Amount</th>
            <th className="pb-2">Channel</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-navy-700">
          {sorted.map((c) => (
            <tr key={c.cluster_id} className="hover:bg-gray-50 dark:hover:bg-navy-600">
              <td className="py-2 pr-4 font-mono">#{c.cluster_id}</td>
              <td className="py-2 pr-4 font-mono font-semibold">{c.country_code}</td>
              <td className="py-2 pr-4 text-right">{c.size.toLocaleString()}</td>
              <td className="py-2 pr-4 text-right">{formatCurrency(c.avg_amount)}</td>
              <td className="py-2 text-gray-600 dark:text-gray-300">{c.dominant_channel ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GeoPage() {
  const [periodDays, setPeriodDays] = useState(90);
  const { data, isLoading, isFetching, error } = useGetGeoHeatmapQuery(
    { period_days: periodDays },
    { refetchOnMountOrArgChange: true }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Geographic Heatmap</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Transaction density, fraud clusters, and remittance corridors
          </p>
        </div>
        <select
          value={periodDays}
          onChange={(e) => setPeriodDays(Number(e.target.value))}
          className="border border-gray-300 dark:border-navy-600 bg-white dark:bg-navy-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={180}>Last 180 days</option>
          <option value={365}>Last 365 days</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-4 text-sm">
          Failed to load geo data. Check backend connectivity.
        </div>
      )}

      {/* Leaflet Map */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-navy-600">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Transaction & Alert Density</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Circle size = transaction volume · colour = fraud rate (green → red) · orange markers = DBSCAN fraud clusters
          </p>
        </div>
        <div className="relative h-[480px]">
          {(isLoading || isFetching) && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-navy-800/60 z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}
          {!isLoading && data && (
            <GeoMap
              countryStats={data.country_stats}
              clusters={data.clusters}
            />
          )}
        </div>
      </div>

      {/* Three data tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Country breakdown */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Country Breakdown (top 15 by alerts)</h2>
          {isLoading ? (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
          ) : data ? (
            <CountryTable data={data.country_stats} />
          ) : null}
        </div>

        {/* Top corridors */}
        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Top Remittance Corridors (F4)</h2>
          {isLoading ? (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
          ) : data && data.top_corridors.length > 0 ? (
            <CorridorTable data={data.top_corridors} />
          ) : (
            <p className="text-sm text-gray-400">No cross-border corridors in this period.</p>
          )}
        </div>
      </div>

      {/* Cluster table */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-5">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">DBSCAN Fraud Clusters (M1 nightly run)</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Each cluster is a behavioural grouping of transactions flagged by the M1 anomaly engine.
          {data?.clusters[0]?.run_date
            ? ` Latest run: ${data.clusters[0].run_date}`
            : " No cluster run data in this period."}
        </p>
        {isLoading ? (
          <div className="h-24 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
        ) : data && data.clusters.length > 0 ? (
          <ClusterTable data={data.clusters} />
        ) : (
          <p className="text-sm text-gray-400">
            No cluster data available yet. The nightly clustering task runs at 03:30 UTC.
          </p>
        )}
      </div>
    </div>
  );
}
