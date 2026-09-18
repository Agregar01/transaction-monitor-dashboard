"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useGetCaseGraphQuery } from "@/redux/slices/api/casesApi";
import type { CaseGraphNode } from "@/types/api";
import { errorMessage } from "@/lib/errors";

/**
 * Entity-network (link-analysis) view for a case. Renders the case, its alerts,
 * subject customers, the devices they used, the SIM/handset IDs on those
 * devices, and any other customers sharing those devices (the ring).
 *
 * Cytoscape is imported dynamically inside the effect so it never runs during
 * SSR and stays out of the initial bundle.
 */

const TYPE_LABEL: Record<CaseGraphNode["type"], string> = {
  case: "Case",
  alert: "Alert",
  customer: "Customer",
  device: "Device",
  sim: "SIM / phone",
  handset: "Handset (IMEI)",
};

const LEGEND: { type: CaseGraphNode["type"]; color: string }[] = [
  { type: "case", color: "#0f172a" },
  { type: "alert", color: "#ef4444" },
  { type: "customer", color: "#2563eb" },
  { type: "device", color: "#7c3aed" },
  { type: "sim", color: "#64748b" },
  { type: "handset", color: "#475569" },
];

const ALERT_COLOR: Record<string, string> = {
  IMMEDIATE: "#ef4444",
  BATCH: "#f59e0b",
  REVIEW: "#94a3b8",
};

export default function CaseGraph({ caseId }: { caseId: string }) {
  const { data, isLoading, isError, error } = useGetCaseGraphQuery(caseId);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<{ destroy: () => void; fit: (p?: unknown, n?: number) => void } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!data || !containerRef.current) return;
    let destroyed = false;

    (async () => {
      const cytoscape = (await import("cytoscape")).default;
      if (destroyed || !containerRef.current) return;

      const dark =
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark");
      const labelColor = dark ? "#e5e7eb" : "#1f2937";

      // Prefer human-readable labels: a customer shows its name (or phone) over
      // its ID; a SIM shows its phone number (msisdn) over the ICCID serial.
      const displayLabel = (n: (typeof data.nodes)[number]): string => {
        if (n.type === "customer") return n.name || n.phone || n.label;
        if (n.type === "sim") return n.msisdn || n.label;
        return n.label;
      };

      const elements = [
        ...data.nodes.map((n) => ({
          data: {
            id: n.id,
            label: displayLabel(n),
            ntype: n.type,
            raw: n.id.includes(":") ? n.id.slice(n.id.indexOf(":") + 1) : n.id,
            in_case: n.in_case ? "yes" : "no",
            is_pep: n.is_pep ? "yes" : "no",
            priority: n.priority ?? "",
            alertColor: n.priority ? ALERT_COLOR[n.priority] ?? "#94a3b8" : "#94a3b8",
          },
        })),
        ...data.edges.map((e, i) => ({
          data: { id: `e${i}`, source: e.source, target: e.target, etype: e.type },
        })),
      ];

      const cy = cytoscape({
        container: containerRef.current,
        elements,
        wheelSensitivity: 0.2,
        style: [
          {
            selector: "node",
            style: {
              label: "data(label)",
              color: labelColor,
              "font-size": "9px",
              "text-wrap": "ellipsis",
              "text-max-width": "90px",
              "text-valign": "bottom",
              "text-margin-y": 3,
              width: 26,
              height: 26,
            },
          },
          {
            selector: 'node[ntype="case"]',
            style: {
              "background-color": "#0f172a",
              shape: "round-rectangle",
              width: 46,
              height: 46,
              color: "#ffffff",
              "font-size": "10px",
              "font-weight": "bold",
              "text-valign": "center",
              "text-max-width": "80px",
              "text-wrap": "wrap",
            },
          },
          {
            selector: 'node[ntype="alert"]',
            style: { "background-color": "data(alertColor)", shape: "diamond", width: 24, height: 24 },
          },
          {
            selector: 'node[ntype="customer"]',
            style: { "background-color": "#60a5fa", shape: "ellipse", width: 30, height: 30 },
          },
          {
            selector: 'node[ntype="customer"][in_case="yes"]',
            style: { "background-color": "#2563eb", width: 36, height: 36 },
          },
          {
            selector: 'node[ntype="customer"][is_pep="yes"]',
            style: { "border-width": 3, "border-color": "#a855f7" },
          },
          {
            selector: 'node[ntype="device"]',
            style: { "background-color": "#7c3aed", shape: "round-rectangle", width: 34, height: 34 },
          },
          {
            selector: 'node[ntype="sim"]',
            style: { "background-color": "#64748b", width: 18, height: 18, "font-size": "8px" },
          },
          {
            selector: 'node[ntype="handset"]',
            style: { "background-color": "#475569", width: 18, height: 18, "font-size": "8px" },
          },
          {
            selector: "edge",
            style: {
              width: 1.5,
              "line-color": dark ? "#475569" : "#cbd5e1",
              "curve-style": "bezier",
              "target-arrow-shape": "none",
            },
          },
          {
            selector: 'edge[etype="used_device"]',
            style: { "line-color": "#a78bfa", width: 2 },
          },
        ],
        layout: { name: "cose", animate: false, padding: 30, nodeRepulsion: 8000, idealEdgeLength: 90 } as never,
      });

      // Click a customer or alert node to open its page.
      cy.on("tap", "node", (evt: { target: { data: (k: string) => string } }) => {
        const ntype = evt.target.data("ntype");
        const raw = evt.target.data("raw");
        if (ntype === "customer") router.push(`/dashboard/customers/${encodeURIComponent(raw)}`);
        else if (ntype === "alert") router.push(`/dashboard/alerts/${encodeURIComponent(raw)}`);
      });

      cyRef.current = cy as unknown as typeof cyRef.current;
    })();

    return () => {
      destroyed = true;
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [data, router]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-8 text-center text-sm text-gray-400">
        Building network…
      </div>
    );
  }
  if (isError) {
    return (
      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-8 text-center text-sm text-rose-500">
        {errorMessage(error) || "Failed to load the network."}
      </div>
    );
  }
  if (!data || data.nodes.length <= 1) {
    return (
      <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 p-8 text-center text-sm text-gray-400">
        No connected entities to graph yet. The network appears once this case has alerts whose
        customers transacted on identifiable devices.
      </div>
    );
  }

  const s = data.stats;

  return (
    <div className="bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-navy-600 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Entity network</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {s.customers} customers ({s.connected_customers} connected via shared devices) ·{" "}
            {s.devices} devices · {s.alerts} alerts. Click a customer or alert to open it.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {LEGEND.map((l) => (
            <span key={l.type} className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
              {TYPE_LABEL[l.type]}
            </span>
          ))}
          <button
            type="button"
            onClick={() => cyRef.current?.fit(undefined, 30)}
            className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Fit
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="w-full bg-gray-50/60 dark:bg-navy-800/40"
        style={{ height: 620 }}
      />
    </div>
  );
}
