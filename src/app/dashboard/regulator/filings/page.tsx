"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useListFilingsQuery, type FilingReportType } from "@/redux/slices/api/filingsApi";
import { useAppSelector } from "@/redux/store";
import { isAgregarAdmin } from "@/lib/roles";
import RegulatorGuard from "@/components/RegulatorGuard";
import QueryState from "@/components/QueryState";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 50;

const JURISDICTIONS = ["GHA", "NGA", "KEN"];

export default function FilingsListPage() {
  useEffect(() => {
    document.title = "Filed Reports | Transaction Monitor";
  }, []);

  const roles = useAppSelector((s) => s.auth.roles);
  const isPlatform = isAgregarAdmin(roles);

  const [page, setPage] = useState(1);
  const [reportType, setReportType] = useState<FilingReportType | "">("");
  const [jurisdiction, setJurisdiction] = useState("");

  const { data, isLoading, isError, error } = useListFilingsQuery({
    page,
    page_size: PAGE_SIZE,
    report_type: reportType || undefined,
    jurisdiction_code: isPlatform && jurisdiction ? jurisdiction : undefined,
  });

  const items = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const selectCls =
    "px-3 py-2 border border-gray-300 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <RegulatorGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Filed Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Immutable STR/CTR snapshots as submitted. Click a reference to view the full report and goAML XML.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value as FilingReportType | "");
              setPage(1);
            }}
            className={selectCls}
          >
            <option value="">All types</option>
            <option value="STR">STR</option>
            <option value="CTR">CTR</option>
          </select>
          {isPlatform && (
            <select
              value={jurisdiction}
              onChange={(e) => {
                setJurisdiction(e.target.value);
                setPage(1);
              }}
              className={selectCls}
            >
              <option value="">All jurisdictions</option>
              {JURISDICTIONS.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={items.length === 0}
            emptyMessage="No filings match these filters."
            cols={5}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-navy-800 text-left text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">Reference</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Jurisdiction</th>
                    <th className="px-6 py-3 font-medium">Filed</th>
                    <th className="px-6 py-3 font-medium">goAML</th>
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
                      <td className="px-6 py-4">
                        {f.has_goaml_xml ? (
                          <span className="text-xs text-green-600 dark:text-green-400">available</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                total={data?.total}
                noun="filings"
                onPageChange={setPage}
              />
            )}
          </QueryState>
        </div>
      </div>
    </RegulatorGuard>
  );
}
