"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard/travel-rule", label: "Exceptions & MI" },
  { href: "/dashboard/travel-rule/counterparties", label: "Counterparty VASPs" },
  { href: "/dashboard/travel-rule/profiles", label: "Jurisdiction profiles" },
];

/** Section header + sub-navigation shared by the Travel Rule pages. */
export default function TravelRuleTabs({ subtitle }: { subtitle?: string }) {
  const pathname = usePathname();
  const active = (href: string) =>
    href === "/dashboard/travel-rule"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Travel Rule</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {subtitle ??
            "FATF Travel Rule (R.15 / R.16) evidence for virtual asset transfers: verdicts, exceptions and counterparties."}
        </p>
      </div>
      <nav className="flex gap-1 border-b border-gray-200 dark:border-navy-600 overflow-x-auto" aria-label="Travel Rule sections">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active(t.href) ? "page" : undefined}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${
              active(t.href)
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
