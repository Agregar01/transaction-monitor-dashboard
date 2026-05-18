/** Hex colors for chart libraries (ApexCharts). */
export const chartColors = {
  action: {
    ALLOW: "#22c55e",
    BLOCK: "#ef4444",
    REVIEW: "#f59e0b",
    UPGRADE_REQUIRED: "#1A1A4E",
    STEP_UP: "#8b5cf6",
    FREEZE: "#64748b",
  } as Record<string, string>,

  risk: {
    LOW: "#22c55e",
    MEDIUM: "#f59e0b",
    HIGH: "#ef4444",
    VERY_HIGH: "#dc2626",
    CRITICAL: "#991b1b",
  } as Record<string, string>,

  tier: {
    T0: "#94a3b8", T1: "#3b82f6", T2: "#8b5cf6", T3: "#22c55e",
    B0: "#94a3b8", B1: "#3b82f6", B2: "#8b5cf6", B3: "#22c55e",
  } as Record<string, string>,
};
