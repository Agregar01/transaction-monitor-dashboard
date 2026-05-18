"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/redux/store";
import { logout } from "@/redux/slices/authSlice";
import { baseApi } from "@/redux/slices/api/baseApi";
import { useGetClientProfileQuery } from "@/redux/slices/api/usersApi";
import { useListCustomersQuery } from "@/redux/slices/api/customersApi";
import {
  MagnifyingGlassIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import RiskBadge from "@/components/RiskBadge";
import TierBadge from "@/components/TierBadge";

/* ── API Status Indicator ── */
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
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const colors = {
    ok: "bg-green-500",
    degraded: "bg-amber-500",
    down: "bg-red-500",
  };
  const labels = { ok: "API Healthy", degraded: "API Degraded", down: "API Unreachable" };

  return (
    <div className="flex items-center gap-1.5" title={labels[status]}>
      <span className={`w-2 h-2 rounded-full ${colors[status]}`} />
      <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">{labels[status]}</span>
    </div>
  );
}

/* ── Global Search ── */
function GlobalSearch() {
  const router = useRouter();
  const { clientId, isAdmin } = useAppSelector((s) => s.auth);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: results } = useListCustomersQuery(
    {
      client_id: isAdmin ? undefined : (clientId || undefined),
      search: query,
      page_size: 5,
    },
    { skip: query.length < 2 }
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSelect = useCallback((externalId: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/dashboard/customers/${externalId}`);
  }, [router]);

  return (
    <div ref={ref} className="relative flex-1 max-w-md">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search customers... (Ctrl+K)"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (query.length >= 2) setOpen(true); }}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-navy-700 border border-gray-200 dark:border-navy-600 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {!results?.items?.length ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">No results found</div>
          ) : (
            results.items.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelect(c.external_id)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-navy-600 transition-colors flex items-center justify-between border-b last:border-b-0 border-gray-100 dark:border-navy-600"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {c.external_id}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {c.entity_type} &middot; Score: {c.risk_score.toFixed(1)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <TierBadge tier={c.current_tier} />
                  <RiskBadge level={c.risk_level} />
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ── User Profile Dropdown ── */
function ProfileDropdown() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { clientName, isAdmin, userRole } = useAppSelector((s) => s.auth);
  const { data: profile } = useGetClientProfileQuery();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayName = profile?.name || clientName || "User";
  const displayEmail = profile?.contact_email || "";
  const displayRole = isAdmin ? "Admin" : (userRole || "Owner");

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-600 transition-colors"
      >
        <UserCircleIcon className="h-7 w-7 text-gray-400 dark:text-gray-500" />
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight truncate max-w-[120px]">
            {displayName}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {displayRole}
          </p>
        </div>
        <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400 hidden sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-navy-700 border border-gray-200 dark:border-navy-600 rounded-lg shadow-lg z-50">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-navy-600">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{displayName}</p>
            {displayEmail && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{displayEmail}</p>
            )}
            <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded ${
              isAdmin
                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
            }`}>
              {displayRole}
            </span>
          </div>
          <div className="py-1">
            <button
              onClick={() => { setOpen(false); router.push("/dashboard/settings"); }}
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

/* ── Main TopBar ── */
export default function TopBar() {
  return (
    <header className="h-14 bg-white dark:bg-navy-800 border-b border-gray-200 dark:border-navy-600 flex items-center gap-4 px-4 lg:px-6">
      <GlobalSearch />
      <ApiStatusDot />
      <ProfileDropdown />
    </header>
  );
}
