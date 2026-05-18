"use client";

import dynamic from "next/dynamic";
import type { UsageDayItem } from "@/types/api";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function UsageChart({ data }: { data: UsageDayItem[] }) {
  const options: ApexCharts.ApexOptions = {
    chart: { type: "bar", stacked: true, toolbar: { show: false }, fontFamily: "inherit" },
    xaxis: {
      categories: data.map((d) => d.date),
      labels: { style: { fontSize: "11px" } },
    },
    yaxis: { labels: { style: { fontSize: "11px" } } },
    colors: ["#22c55e", "#ef4444", "#f59e0b", "#1A1A4E"],
    plotOptions: { bar: { borderRadius: 3, columnWidth: "60%" } },
    legend: { position: "top", fontSize: "12px" },
    dataLabels: { enabled: false },
    grid: { borderColor: "#f3f4f6" },
  };

  const series = [
    { name: "Allow", data: data.map((d) => d.decisions_allow) },
    { name: "Block", data: data.map((d) => d.decisions_block) },
    { name: "Review", data: data.map((d) => d.decisions_review) },
    { name: "Upgrade", data: data.map((d) => d.decisions_upgrade) },
  ];

  return <Chart options={options} series={series} type="bar" height={320} />;
}
