const tierColors: Record<string, string> = {
  T0: "bg-gray-100 text-gray-700",
  T1: "bg-blue-100 text-blue-700",
  T2: "bg-green-100 text-green-700",
  T3: "bg-purple-100 text-purple-700",
  B0: "bg-gray-100 text-gray-700",
  B1: "bg-cyan-100 text-cyan-700",
  B2: "bg-emerald-100 text-emerald-700",
  B3: "bg-violet-100 text-violet-700",
};

export default function TierBadge({ tier }: { tier: string }) {
  const color = tierColors[tier] || "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {tier}
    </span>
  );
}
