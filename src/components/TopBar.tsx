"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/redux/store";
import { logout } from "@/redux/slices/authSlice";
import { baseApi } from "@/redux/slices/api/baseApi";
import {
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

function ApiStatusDot() {
  const [status, setStatus] = useState<"ok" | "degraded" | "down">("ok");

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/proxy/api/v1/health/", {
          credentials: "same-origin",
          signal: AbortSignal.timeout(5000),
        });
        if (!cancelled) setStatus(res.ok ? "ok" : "degraded");
      } catch {
        if (!cancelled) setStatus("down");
      }
    };
    check();
    const interval = setInterval(check, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const colors = {
    ok: "bg-green-500",
    degraded: "bg-amber-500",
    down: "bg-red-500",
  };
  const labels = { ok: "API Healthy", degraded: "API Degraded", down: "API Unreachable" };

  return (
    <div className="flex items-center gap-1.5" title={labels[status]}>
      <span className={`w-2 h-2 rounded-full ${colors[status]}`} role="img" aria-label={labels[status]} />
      <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
        {labels[status]}
      </span>
    </div>
  );
}

function JurisdictionBadge() {
  const { jurisdictionCode, jurisdictionDisplayName } = useAppSelector((s) => s.auth);
  if (!jurisdictionCode) return null;
  return (
    <span
      className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary"
      title={jurisdictionDisplayName ?? jurisdictionCode}
    >
      <span>{jurisdictionCode}</span>
      {jurisdictionDisplayName && (
        <span className="hidden lg:inline normal-case font-medium opacity-80">
          {jurisdictionDisplayName}
        </span>
      )}
    </span>
  );
}

function ProfileDropdown() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { email, fullName, roles } = useAppSelector((s) => s.auth);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const displayName = fullName || email || "User";
  const primaryRole = roles[0] ?? "READONLY";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-600 transition-colors"
      >
        <UserCircleIcon className="h-7 w-7 text-gray-400 dark:text-gray-500" />
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight truncate max-w-[140px]">
            {displayName}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {primaryRole}
          </p>
        </div>
        <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400 hidden sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-navy-700 border border-gray-200 dark:border-navy-600 rounded-lg shadow-lg z-50">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-navy-600">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{displayName}</p>
            {email && fullName && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{email}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1">
              {roles.map((role) => (
                <span
                  key={role}
                  className="inline-block px-2 py-0.5 text-[10px] font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
          <div className="py-1">
            <button
              onClick={() => {
                setOpen(false);
                router.push("/dashboard/settings");
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors"
            >
              <Cog6ToothIcon className="h-4 w-4" />
              Settings
            </button>
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                dispatch(baseApi.util.resetApiState());
                dispatch(logout());
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TopBar() {
  return (
    <header className="h-14 bg-white dark:bg-navy-800 border-b border-gray-200 dark:border-navy-600 flex items-center justify-end gap-4 px-4 lg:px-6">
      <JurisdictionBadge />
      <ApiStatusDot />
      <ProfileDropdown />
    </header>
  );
}
