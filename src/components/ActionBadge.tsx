const actionColors: Record<string, string> = {
  ALLOW: "bg-green-100 text-green-700",
  BLOCK: "bg-red-100 text-red-700",
  FREEZE: "bg-red-200 text-red-800",
  REVIEW: "bg-yellow-100 text-yellow-700",
  STEP_UP: "bg-orange-100 text-orange-700",
  UPGRADE_REQUIRED: "bg-primary-100 text-primary-700",
};

export default function ActionBadge({ action }: { action: string }) {
  const color = actionColors[action] || "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {action}
    </span>
  );
}
