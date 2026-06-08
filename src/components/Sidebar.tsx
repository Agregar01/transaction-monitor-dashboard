"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { logout, type TenantFeatures } from "@/redux/slices/authSlice";
import { baseApi } from "@/redux/slices/api/baseApi";
import DarkModeToggle from "@/components/DarkModeToggle";
import {
  HomeIcon,
  BellAlertIcon,
  InboxStackIcon,
  BanknotesIcon,
  UsersIcon,
  DocumentTextIcon,
  DocumentDuplicateIcon,
  CheckBadgeIcon,
  ShieldExclamationIcon,
  NoSymbolIcon,
  AdjustmentsHorizontalIcon,
  ChartPieIcon,
  ChartBarIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  BuildingLibraryIcon,
  ClipboardDocumentListIcon,
  ServerIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  GlobeAltIcon,
  FingerPrintIcon,
} from "@heroicons/react/24/outline";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const monitorNav: NavItem[] = [
  { name: "Overview", href: "/dashboard", icon: HomeIcon },
  { name: "Alerts", href: "/dashboard/alerts", icon: BellAlertIcon },
  { name: "Cases", href: "/dashboard/cases", icon: InboxStackIcon },
  { name: "Transactions", href: "/dashboard/transactions", icon: BanknotesIcon },
  { name: "Customers", href: "/dashboard/customers", icon: UsersIcon },
];

const complianceNav: NavItem[] = [
  { name: "STR Reports", href: "/dashboard/str", icon: DocumentTextIcon },
  { name: "CTR Reports", href: "/dashboard/ctr", icon: DocumentDuplicateIcon },
  { name: "Approvals", href: "/dashboard/approvals", icon: CheckBadgeIcon },
  { name: "Reports", href: "/dashboard/reports", icon: ChartBarIcon },
  { name: "Geo Heatmap", href: "/dashboard/geo", icon: GlobeAltIcon },
  { name: "Watchlists", href: "/dashboard/watchlists", icon: ShieldExclamationIcon },
  { name: "Sanctions Check", href: "/dashboard/sanctions", icon: NoSymbolIcon },
];

const ruleOpsNav: NavItem[] = [
  { name: "Rules", href: "/dashboard/rules", icon: AdjustmentsHorizontalIcon },
  { name: "Shadow Stats", href: "/dashboard/shadow", icon: ChartPieIcon },
  { name: "ML Models", href: "/dashboard/models", icon: CpuChipIcon },
  { name: "Drift Monitoring", href: "/dashboard/drift", icon: ExclamationTriangleIcon },
];

const adminNav: NavItem[] = [
  { name: "Admin Config", href: "/dashboard/admin", icon: AdjustmentsHorizontalIcon },
  { name: "Users & Roles", href: "/dashboard/users", icon: UserGroupIcon },
  { name: "Jurisdictions", href: "/dashboard/jurisdictions", icon: BuildingLibraryIcon },
  { name: "Data Privacy", href: "/dashboard/privacy", icon: FingerPrintIcon },
  { name: "Audit Trail", href: "/dashboard/audit", icon: ClipboardDocumentListIcon },
  { name: "System Health", href: "/dashboard/health", icon: ServerIcon },
  { name: "Settings", href: "/dashboard/settings", icon: Cog6ToothIcon },
];

/**
 * Permission → allowed-routes mapping.
 * A route is visible when the user holds ANY of the listed permissions.
 * Empty array = visible to every authenticated user.
 * Backend enforces 403 on the actual endpoint regardless — this is UI convenience, not security.
 *
 * For pages that call multiple permissioned endpoints (e.g. /admin = rules + jurisdictions
 * + analytics), we use the most permissive gate (any-of). Individual sections within those
 * pages degrade gracefully via RTK Query isError when a specific permission is absent.
 */
const PERMISSION_NAV_MAP: Record<string, string[]> = {
  "/dashboard":               [],                                                         // any authenticated user
  "/dashboard/alerts":        ["view_cases"],
  "/dashboard/cases":         ["view_cases"],
  "/dashboard/transactions":  ["view_cases", "access_audit_trail"],
  "/dashboard/customers":     ["view_cases", "access_audit_trail"],
  "/dashboard/str":           ["file_str"],
  "/dashboard/ctr":           ["approve_action", "configure_thresholds"],
  "/dashboard/approvals":     ["approve_action"],
  "/dashboard/reports":       ["view_analytics"],
  "/dashboard/geo":           ["view_analytics"],
  "/dashboard/watchlists":    ["manage_sanctions_lists"],
  "/dashboard/sanctions":     ["manage_sanctions_lists"],
  "/dashboard/rules":         ["view_rules"],
  "/dashboard/shadow":        ["view_shadow_stats"],
  "/dashboard/models":        ["view_models"],
  "/dashboard/drift":         ["view_drift"],
  "/dashboard/audit":         ["view_audit_trail", "access_audit_trail"],
  "/dashboard/privacy":       ["view_dsar", "manage_dsar", "erase_pii"],
  "/dashboard/users":         ["view_users"],
  "/dashboard/admin":         ["create_rule", "configure_thresholds", "view_analytics"],  // any-of
  "/dashboard/jurisdictions": ["configure_thresholds"],
  "/dashboard/health":        ["manage_api_keys"],
  "/dashboard/settings":      [],                                                         // any authenticated user
};

export function filterNavByPermissions(items: NavItem[], permissions: string[]): NavItem[] {
  return items.filter((item) => {
    const required = PERMISSION_NAV_MAP[item.href];
    if (!required) return true;           // unmapped routes default to visible
    if (required.length === 0) return true; // explicit "everyone"
    return required.some((p) => permissions.includes(p));
  });
}

/**
 * Routes hidden when their jurisdiction disables the corresponding feature
 * (TenantConfig flags from /tenant/info). A jurisdiction that turns off, say,
 * CTR reporting shouldn't show the CTR link at all.
 */
const FEATURE_NAV_MAP: Record<string, keyof TenantFeatures> = {
  "/dashboard/ctr": "ctr",
  "/dashboard/str": "str",
  "/dashboard/sanctions": "sanctions",
  "/dashboard/watchlists": "sanctions",
  "/dashboard/models": "ml",
  "/dashboard/drift": "ml",
  "/dashboard/shadow": "ml",
};

export function filterNavByFeatures(
  items: NavItem[],
  features: TenantFeatures | null,
): NavItem[] {
  if (!features) return items; // not loaded yet — don't hide prematurely
  return items.filter((item) => {
    const flag = FEATURE_NAV_MAP[item.href];
    return flag ? features[flag] : true;
  });
}

function NavSection({
  label,
  items,
  pathname,
  onNav,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  onNav?: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <>
      <p className="text-navy-400 text-[10px] font-semibold uppercase tracking-wider px-3 pt-4 pb-1">
        {label}
      </p>
      {items.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNav}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-primary text-white"
                : "text-navy-200 hover:bg-navy-600 hover:text-white"
            }`}
          >
            <item.icon className="h-5 w-5" aria-hidden="true" />
            {item.name}
          </Link>
        );
      })}
    </>
  );
}

function SidebarContent({ onNav }: { onNav?: () => void }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { permissions, jurisdictionCode, email, features } = useAppSelector((s) => s.auth);
  const navFor = (items: NavItem[]) =>
    filterNavByFeatures(filterNavByPermissions(items, permissions), features);

  return (
    <>
      <div className="flex items-center gap-3 px-6 py-5 border-b border-navy-600">
        <Image src="/images/Autheo_white.png" alt="Autheo TMS" width={120} height={32} />
      </div>

      <div className="px-6 py-3">
        <p className="text-primary-300 text-xs font-semibold uppercase tracking-wider">
          {jurisdictionCode ?? "—"} · Transaction Monitor
        </p>
        {email && <p className="text-navy-300 text-xs mt-1 truncate">{email}</p>}
      </div>

      <nav className="flex-1 px-3 py-0 space-y-0.5 overflow-y-auto">
        <NavSection
          label="Monitor"
          items={navFor(monitorNav)}
          pathname={pathname}
          onNav={onNav}
        />
        <NavSection
          label="Compliance"
          items={navFor(complianceNav)}
          pathname={pathname}
          onNav={onNav}
        />
        <NavSection
          label="Rule & ML Ops"
          items={navFor(ruleOpsNav)}
          pathname={pathname}
          onNav={onNav}
        />
        <NavSection
          label="Admin"
          items={navFor(adminNav)}
          pathname={pathname}
          onNav={onNav}
        />
      </nav>

      <div className="px-3 py-4 border-t border-navy-600 space-y-1">
        <DarkModeToggle />
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            dispatch(baseApi.util.resetApiState());
            dispatch(logout());
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-navy-300 hover:bg-navy-600 hover:text-white w-full transition-colors"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        className="fixed top-4 left-4 z-20 lg:hidden p-2 rounded-lg bg-navy text-white shadow-lg"
      >
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-50 w-64 h-full bg-navy flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
              className="absolute top-4 right-4 text-navy-300 hover:text-white"
            >
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
            <SidebarContent onNav={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-10 w-64 bg-navy flex-col">
        <SidebarContent />
      </aside>
    </>
  );
}
