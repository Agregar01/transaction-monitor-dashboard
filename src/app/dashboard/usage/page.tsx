"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/redux/store";
import { useGetUsageQuery } from "@/redux/slices/api/usageApi";
import UsageChart from "@/components/UsageChart";
import ClientGuard from "@/components/ClientGuard";
import RoleGuard from "@/components/RoleGuard";

export default function UsagePage() {
  useEffect(() => { document.title = "Usage | Deferred KYC"; }, []);
  const clientId = useAppSelector((s) => s.auth.clientId) || "";
  const [days, setDays] = useState(30);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: usage, isLoading } = useGetUsageQuery({
    client_id: clientId,
    start_date: startDate.toISOString().split("T")[0],
  });

  return (
    <ClientGuard>
    <RoleGuard allowedRoles={["OWNER", "ADMIN", "EXECUTIVE"]}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Usage</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">API usage and decision analytics</p>
        </div>
        <div className="flex items-center gap-2">
        {usage && usage.daily_breakdown.length > 0 && (
          <button
            onClick={() => {
              const rows = usage.daily_breakdown.map((d) =>
                [d.date, d.total_calls, d.decisions_allow, d.decisions_block, d.decisions_review, d.decisions_upgrade].join(",")
              );
              const csv = ["date,total,allow,block,review,upgrade", ...rows].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "usage.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 border dark:border-navy-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-navy-600"
          >
            Export CSV
          </button>
        )}
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="border dark:border-navy-500 dark:bg-navy-700 dark:text-white rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={60}>Last 60 days</option>
          <option value={90}>Last 90 days</option>
        </select>
        </div>
      </div>

      {/* Summary Cards */}
      {usage && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Calls</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{usage.total_calls.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">Allowed</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{usage.total_allow.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">Blocked</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{usage.total_block.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">Reviews</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{usage.total_review.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 p-6">
        <h2 className="text-lg font-semibold dark:text-white mb-4">Decision Activity</h2>
        {isLoading ? (
          <div className="h-80 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
        ) : usage && usage.daily_breakdown.length > 0 ? (
          <UsageChart data={usage.daily_breakdown} />
        ) : (
          <div className="h-80 flex items-center justify-center text-gray-400 text-sm">
            No usage data for this period.
          </div>
        )}
      </div>

      {/* Daily Breakdown Table */}
      {usage && usage.daily_breakdown.length > 0 && (
        <div className="bg-white dark:bg-navy-700 rounded-xl border dark:border-navy-600 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-navy-600">
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th scope="col" className="px-6 py-3 font-medium">Date</th>
                <th scope="col" className="px-6 py-3 font-medium text-right">Total</th>
                <th scope="col" className="px-6 py-3 font-medium text-right">Allow</th>
                <th scope="col" className="px-6 py-3 font-medium text-right">Block</th>
                <th scope="col" className="px-6 py-3 font-medium text-right">Review</th>
                <th scope="col" className="px-6 py-3 font-medium text-right">Upgrade</th>
              </tr>
            </thead>
            <tbody>
              {[...usage.daily_breakdown].reverse().map((d) => (
                <tr key={d.date} className="border-t dark:border-navy-600 hover:bg-gray-50 dark:hover:bg-navy-600">
                  <td className="px-6 py-3 text-gray-900 dark:text-white">{d.date}</td>
                  <td className="px-6 py-3 text-right text-gray-900 dark:text-white font-medium">{d.total_calls}</td>
                  <td className="px-6 py-3 text-right text-green-600">{d.decisions_allow}</td>
                  <td className="px-6 py-3 text-right text-red-600">{d.decisions_block}</td>
                  <td className="px-6 py-3 text-right text-yellow-600">{d.decisions_review}</td>
                  <td className="px-6 py-3 text-right text-primary">{d.decisions_upgrade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </RoleGuard>
    </ClientGuard>
  );
}
