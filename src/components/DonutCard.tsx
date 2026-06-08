"use client";

import dynamic from "next/dynamic";

// ApexCharts is client-only.
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface DonutCardProps {
  title: string;
  subtitle?: string;
  labels: string[];
  series: number[];
  colors: string[];
  height?: number;
}

/**
 * A self-contained donut chart in a card. Aggregation happens in the caller;
 * this just renders. Empty/zero series renders a graceful placeholder.
 */
export default function DonutCard({
  title,
  subtitle,
  labels,
  series,
  colors,
  height = 280,
}: DonutCardProps) {
  const total = series.reduce((a, b) => a + b, 0);
  return (
    <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 shadow-sm p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {title}
        </h2>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {total === 0 ? (
        <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">No data.</div>
      ) : (
        <>
          {/* Text alternative — the ApexCharts SVG is invisible to screen readers. */}
          <p className="sr-only">
            {title}: {labels.map((l, i) => `${l} ${series[i]}`).join(", ")} (total {total}).
          </p>
        <Chart
          options={{
            chart: { type: "donut", fontFamily: "var(--font-geist-sans), sans-serif" },
            labels,
            colors,
            legend: { position: "bottom", labels: { colors: "#94a3b8" } },
            dataLabels: { enabled: false },
            stroke: { width: 0 },
            tooltip: { theme: "dark" },
            plotOptions: {
              pie: {
                donut: {
                  labels: {
                    show: true,
                    total: {
                      show: true,
                      label: "Total",
                      color: "#94a3b8",
                      formatter: () => String(total),
                    },
                  },
                },
              },
            },
          }}
          series={series}
          type="donut"
          height={height}
        />
        </>
      )}
    </div>
  );
}
