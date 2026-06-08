"use client";

import { useState } from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { useAppSelector } from "@/redux/store";
import { downloadFile } from "@/lib/download";
import { showToast } from "@/components/Toast";
import { errorMessage } from "@/lib/errors";

interface Props {
  /** Full same-origin URL (through the proxy), e.g. `${API_V1}/export/...`. */
  url: string;
  /** Fallback filename if the server doesn't send Content-Disposition. */
  filename: string;
  label?: string;
  /** Hide the button unless the user holds this permission (UI convenience). */
  requiredPermission?: string;
  className?: string;
}

const DEFAULT_CLS =
  "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border " +
  "border-gray-300 dark:border-navy-500 text-gray-700 dark:text-gray-200 " +
  "hover:bg-gray-100 dark:hover:bg-navy-700 disabled:opacity-50";

export default function ExportButton({
  url,
  filename,
  label = "Export CSV",
  requiredPermission,
  className,
}: Props) {
  const permissions = useAppSelector((s) => s.auth.permissions);
  const [busy, setBusy] = useState(false);

  if (requiredPermission && !permissions.includes(requiredPermission)) return null;

  const onClick = async () => {
    setBusy(true);
    try {
      await downloadFile(url, filename);
    } catch (err) {
      showToast({ type: "error", title: "Export failed", message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={onClick} disabled={busy} className={className ?? DEFAULT_CLS}>
      <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
      {busy ? "Exporting…" : label}
    </button>
  );
}
