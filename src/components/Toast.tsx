"use client";

import { useState, useEffect, useCallback } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export interface ToastMessage {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
}

const typeStyles: Record<string, string> = {
  info: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300",
  warning: "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300",
  error: "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300",
  success: "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300",
};

let addToastGlobal: ((toast: Omit<ToastMessage, "id">) => void) | null = null;

export function showToast(toast: Omit<ToastMessage, "id">) {
  if (addToastGlobal) {
    addToastGlobal(toast);
  } else {
    console.warn(`[Toast not mounted] ${toast.type}: ${toast.title} — ${toast.message}`);
  }
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-4), { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  useEffect(() => {
    addToastGlobal = addToast;
    return () => { addToastGlobal = null; };
  }, [addToast]);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 w-80" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`border rounded-lg px-4 py-3 shadow-lg animate-slide-in flex items-start gap-3 ${typeStyles[t.type]}`}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{t.title}</p>
            <p className="text-xs mt-0.5 opacity-80">{t.message}</p>
          </div>
          <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="shrink-0 opacity-60 hover:opacity-100">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
