"use client";

import { useListUsersQuery } from "@/redux/slices/api/authApi";

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
  className?: string;
}

/**
 * Dropdown of system users, sourced from /auth/users. Emits the chosen user's
 * email or user_id so assignment endpoints get an identifier they accept —
 * replacing the free-text boxes that let users paste an email where a UUID was
 * required (and vice-versa).
 */
export default function UserPicker({
  value,
  onChange,
  valueField,
  roleFilter,
  placeholder = "Select a user…",
  disabled,
  ariaLabel = "Select user",
  className = "",
}: UserPickerProps) {
  const { data: users, isLoading } = useListUsersQuery();

  const options = (users ?? [])
    .filter((u) => u.active !== false)
    .filter((u) => (roleFilter ? roleFilter(u.roles ?? []) : true));

  return (
    <select
      aria-label={ariaLabel}
      value={value}
      disabled={disabled || isLoading}
      onChange={(e) => onChange(e.target.value)}
      className={
        className ||
        "w-full px-3 py-2 text-sm border border-gray-200 dark:border-navy-500 rounded-lg bg-white dark:bg-navy-800 text-gray-900 dark:text-white disabled:opacity-50"
      }
    >
      <option value="">{isLoading ? "Loading users…" : placeholder}</option>
      {options.map((u) => (
        <option key={u.user_id} value={u[valueField] ?? ""}>
          {u.full_name ? `${u.full_name} (${u.email})` : u.email}
        </option>
      ))}
    </select>
  );
}
