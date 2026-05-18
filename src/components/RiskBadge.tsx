const riskColors: Record<string, string> = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  VERY_HIGH: "bg-red-100 text-red-700",
  CRITICAL: "bg-red-200 text-red-800",
};

export default function RiskBadge({ level }: { level: string }) {
  const color = riskColors[level] || "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {level}
    </span>
  );
}
