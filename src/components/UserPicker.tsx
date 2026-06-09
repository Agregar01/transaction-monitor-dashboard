"use client";

import { useState, useRef, useEffect } from "react";
import { useListAssignableUsersQuery } from "@/redux/slices/api/authApi";

interface UserPickerProps {
  /** Current value (email or user_id, per valueField). */
  value: string;
  onChange: (value: string) => void;
  /**
   * Which user field to emit. Alerts store `assigned_to` as a free string
   * (email); cases require a UUID (user_id). Pick the right one per caller so
   * the backend accepts it.
   */
  valueField: "email" | "user_id";
  /** Optional role filter, e.g. only show analysts. */
  roleFilter?: (roles: string[]) => boolean;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  /** Layout class for the wrapper (e.g. "flex-1"). */
  wrapperClassName?: string;
}

/**
 * Searchable user combobox, sourced from /auth/users. Emits the chosen user's
 * email or user_id so assignment/filter endpoints get an identifier they accept.
 * Type-to-filter so it scales past a handful of users (a plain <select> doesn't).
 */
export default function UserPicker({
  value,
  onChange,
  valueField,
  roleFilter,
  placeholder = "Select a user…",
  disabled,
  ariaLabel = "Select user",
  wrapperClassName = "",
}: UserPickerProps) {
  const { data: users, isLoading } = useListAssignableUsersQuery();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const options = (users ?? [])
    .filter((u) => u.active !== false)
    .filter((u) => (roleFilter ? roleFilter(u.roles ?? []) : true));

  const labelFor = (u: { full_name: string | null; email: string }) =>
    u.full_name ? `${u.full_name} (${u.email})` : u.email;

  const selected = options.find((u) => (u[valueField] ?? "") === value);
  const selectedLabel = selected ? labelFor(selected) : "";

  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter((u) => `${u.full_name ?? ""} ${u.email}`.toLowerCase().includes(q))
    : options;

  // Close on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const inputCls =
    "w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white disabled:opacity-50";

  return (
    <div ref={ref} className={`relative ${wrapperClassName}`}>
      <input
        type="text"
        aria-label={ariaLabel}
        disabled={disabled || isLoading}
        value={open ? query : selectedLabel}
        placeholder={isLoading ? "Loading users…" : placeholder}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        className={inputCls}
      />
      {value && !open && (
        <button
          type="button"
          aria-label="Clear selection"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
        >
          ×
        </button>
      )}
      {open && (
        <ul className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-gray-200 dark:border-navy-500 bg-white dark:bg-navy-800 shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400">No matching users</li>
          ) : (
            filtered.map((u) => (
              <li key={u.user_id}>
                <button
                  type="button"
                  // preventDefault keeps the input from blurring before the click registers
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(u[valueField] ?? "");
                    setQuery("");
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-navy-600"
                >
                  {labelFor(u)}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
