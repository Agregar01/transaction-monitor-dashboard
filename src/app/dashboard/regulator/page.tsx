"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  useGetFilingAnalyticsQuery,
  useListFilingsQuery,
} from "@/redux/slices/api/filingsApi";
import RegulatorGuard from "@/components/RegulatorGuard";
import StatCard from "@/components/StatCard";
import QueryState from "@/components/QueryState";
import { SkeletonStats } from "@/components/Skeleton";
import {
  DocumentTextIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

export default function RegulatorOverviewPage() {
  useEffect(() => {
    document.title = "Regulator Dashboard | Transaction Monitor";
  }, []);

  const { data: analytics, isLoading: aLoading } = useGetFilingAnalyticsQuery();
  const {
    data: recent,
    isLoading: rLoading,
    isError: rError,
    error: rErr,
  } = useListFilingsQuery({ page: 1, page_size: 10 });

  const items = recent?.items ?? [];

  return (
    <RegulatorGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Regulator Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Read-only oversight of filed STR/CTR reports across institutions in your jurisdiction.
          </p>
        </div>

        {aLoading ? (
          <SkeletonStats count={4} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total filings"
              value={(analytics?.total ?? 0).toLocaleString()}
              subtitle="STR + CTR on record"
              icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
            />
            <StatCard
              title="STR reports"
              value={(analytics?.total_str ?? 0).toLocaleString()}
              subtitle="suspicious transactions"
              icon={<DocumentTextIcon className="h-6 w-6" />}
              color="text-amber-600 dark:text-amber-400"
            />
            <StatCard
              title="CTR reports"
              value={(analytics?.total_ctr ?? 0).toLocaleString()}
              subtitle="cash threshold"
              icon={<DocumentDuplicateIcon className="h-6 w-6" />}
              color="text-blue-600 dark:text-blue-400"
            />
            <StatCard
              title="Last 30 days"
              value={(analytics?.recent_30d?.total ?? 0).toLocaleString()}
              subtitle={`${analytics?.recent_30d?.STR ?? 0} STR · ${analytics?.recent_30d?.CTR ?? 0} CTR`}
              icon={<ClockIcon className="h-6 w-6" />}
              color="text-green-600 dark:text-green-400"
            />
          </div>
        )}

        {analytics?.by_jurisdiction && Object.keys(analytics.by_jurisdiction).length > 0 && (
          <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600 p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Filings by jurisdiction</h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(analytics.by_jurisdiction).map(([jur, count]) => (
                <div key={jur} className="px-4 py-2 rounded-lg bg-gray-50 dark:bg-navy-800">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{jur}</span>
                  <span className="ml-2 text-sm font-semibold text-gray-900 dark:text-white">
                    {count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-600 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent filings</h2>
            <Link href="/dashboard/regulator/filings" className="text-sm text-primary hover:text-primary-600 font-medium">
              View all &rarr;
            </Link>
          </div>
          <QueryState
            isLoading={rLoading}
            isError={rError}
            error={rErr}
            isEmpty={items.length === 0}
            emptyMessage="No filings on record yet."
            cols={4}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">Reference</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Jurisdiction</th>
                    <th className="px-6 py-3 font-medium">Filed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-navy-600">
                  {items.map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/regulator/filings/${f.id}`}
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          {f.filing_reference}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-gray-100 dark:bg-navy-600 text-gray-700 dark:text-gray-300">
                          {f.report_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{f.jurisdiction_code}</td>
                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(f.filed_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </QueryState>
        </div>
      </div>
    </RegulatorGuard>
  );
}
