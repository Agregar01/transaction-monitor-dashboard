"use client";

import { useEffect, useState } from "react";
import { useGetComplianceSummaryQuery, useLazyGenerateSarQuery } from "@/redux/slices/api/complianceApi";
import RegulatorGuard from "@/components/RegulatorGuard";
import {
  ShieldExclamationIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";

export default function RegulatoryReportsPage() {
  useEffect(() => {
    document.title = "Regulatory Reports | Deferred KYC";
  }, []);

  const { data: summary } = useGetComplianceSummaryQuery({});
  const [triggerSar] = useLazyGenerateSarQuery();
  const [generating, setGenerating] = useState<string | null>(null);

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
    if (!res.ok) throw new Error("Failed to generate CSV");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerate = async (reportKey: string) => {
    setGenerating(reportKey);
    try {
      const now = new Date().toISOString().slice(0, 10);
      switch (reportKey) {
        case "sar":
        case "str": {
          const result = await triggerSar({}).unwrap();
          downloadJson(result, `${reportKey}-${now}.json`);
          break;
        }
        case "kyc-compliance": {
          await downloadCsv(`kyc-compliance-${now}.csv`);
          break;
        }
        case "aml-monitoring": {
          const result = await triggerSar({}).unwrap();
          downloadJson(result, `aml-monitoring-${now}.json`);
          break;
        }
        case "risk-assessment": {
          const res = await fetch(`/api/proxy/api/v1/compliance/risk-distribution`, { credentials: "same-origin" });
          if (!res.ok) throw new Error("Failed to generate report");
          const data = await res.json();
          downloadJson(data, `risk-assessment-${now}.json`);
          break;
        }
      }
    } catch {
      // silently fail — user sees button reset
    }
    setGenerating(null);
  };

  const reports = [
    {
      key: "sar",
      name: "Suspicious Activity Report (SAR)",
      description: "Report of suspicious transactions and activity patterns flagged by the system",
      frequency: "As needed",
      items: summary?.flagged_decisions || 0,
      icon: ShieldExclamationIcon,
    },
    {
      key: "str",
      name: "Suspicious Transaction Report (STR)",
      description: "Detailed report of blocked transactions exceeding risk thresholds",
      frequency: "Monthly",
      items: summary?.decisions_by_action?.BLOCK || 0,
      icon: ExclamationTriangleIcon,
    },
    {
      key: "kyc-compliance",
      name: "KYC Compliance Report",
      description: "Overview of customer verification status, tier distribution, and compliance metrics",
      frequency: "Quarterly",
      items: summary?.total_decisions || 0,
      icon: DocumentTextIcon,
    },
    {
      key: "aml-monitoring",
      name: "AML Monitoring Report",
      description: "Anti-money laundering screening results, PEP exposure, and sanctions matches",
      frequency: "Monthly",
      items: summary?.high_risk_customers || 0,
      icon: ShieldExclamationIcon,
    },
    {
      key: "risk-assessment",
      name: "Risk Assessment Report",
      description: "Portfolio-wide risk analysis with distribution by level, entity type, and trend",
      frequency: "Monthly",
      items: summary?.high_risk_customers || 0,
      icon: ChartBarIcon,
    },
  ];

  return (
    <RegulatorGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Regulatory Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Generate and download compliance reports for Bank of Ghana regulatory filing
          </p>
        </div>

        <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-200 dark:border-navy-600">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-navy-600">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Available Reports</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-navy-600">
            {reports.map((report) => (
              <div key={report.key} className="px-6 py-5 flex items-center justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <report.icon className="h-5 w-5 text-red-500" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{report.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{report.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-gray-400">Frequency: {report.frequency}</span>
                      <span className="text-xs text-gray-400">Items: {report.items}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleGenerate(report.key)}
                  disabled={generating === report.key}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <DocumentArrowDownIcon className={`h-4 w-4 ${generating === report.key ? "animate-spin" : ""}`} aria-hidden="true" />
                  {generating === report.key ? "Generating..." : "Generate"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </RegulatorGuard>
  );
}
