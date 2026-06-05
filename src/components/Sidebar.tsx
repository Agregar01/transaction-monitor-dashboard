"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { logout } from "@/redux/slices/authSlice";
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
  { name: "Audit Trail", href: "/dashboard/audit", icon: ClipboardDocumentListIcon },
  { name: "System Health", href: "/dashboard/health", icon: ServerIcon },
  { name: "Settings", href: "/dashboard/settings", icon: Cog6ToothIcon },
];

/**
 * Role → allowed-routes mapping. A user sees a link if ANY of their roles
 * appears in the route's allowed list. Backend enforces 403 on the actual
 * endpoint regardless — this is convenience, not security.
 */
const ROLE_NAV_MAP: Record<string, string[]> = {
  "/dashboard": ["SYSTEM_ADMIN", "COMPLIANCE_OFFICER", "SENIOR_ANALYST", "ANALYST", "AUDITOR", "ML_ENGINEER", "OPERATIONS"],
  "/dashboard/alerts": ["SYSTEM_ADMIN", "COMPLIANCE_OFFICER", "SENIOR_ANALYST", "ANALYST"],
  "/dashboard/cases": ["SYSTEM_ADMIN", "COMPLIANCE_OFFICER", "SENIOR_ANALYST", "ANALYST"],
  "/dashboard/transactions": ["SYSTEM_ADMIN", "COMPLIANCE_OFFICER", "SENIOR_ANALYST", "ANALYST", "AUDITOR"],
  "/dashboard/customers": ["SYSTEM_ADMIN", "COMPLIANCE_OFFICER", "SENIOR_ANALYST", "ANALYST", "AUDITOR"],
  "/dashboard/str": ["SYSTEM_ADMIN", "COMPLIANCE_OFFICER", "SENIOR_ANALYST"],
  "/dashboard/ctr": ["SYSTEM_ADMIN", "COMPLIANCE_OFFICER"],
  "/dashboard/approvals": ["SYSTEM_ADMIN", "COMPLIANCE_OFFICER"],
  "/dashboard/reports": ["SYSTEM_ADMIN", "COMPLIANCE_OFFICER", "SENIOR_ANALYST", "ML_ENGINEER", "AUDITOR"],
  "/dashboard/watchlists": ["SYSTEM_ADMIN", "COMPLIANCE_OFFICER"],
  "/dashboard/sanctions": ["SYSTEM_ADMIN", "COMPLIANCE_OFFICER", "SENIOR_ANALYST", "ANALYST"],
  "/dashboard/rules": ["SYSTEM_ADMIN", "ML_ENGINEER", "COMPLIANCE_OFFICER", "AUDITOR"],
  "/dashboard/shadow": ["SYSTEM_ADMIN", "ML_ENGINEER", "COMPLIANCE_OFFICER"],
  "/dashboard/models": ["SYSTEM_ADMIN", "ML_ENGINEER"],
  "/dashboard/drift": ["SYSTEM_ADMIN", "ML_ENGINEER"],
  "/dashboard/audit": ["SYSTEM_ADMIN", "AUDITOR", "COMPLIANCE_OFFICER"],
  "/dashboard/users": ["SYSTEM_ADMIN"],
  "/dashboard/admin": ["SYSTEM_ADMIN", "COMPLIANCE_OFFICER"],
  "/dashboard/jurisdictions": ["SYSTEM_ADMIN"],
  "/dashboard/health": ["SYSTEM_ADMIN", "OPERATIONS"],
  "/dashboard/settings": [], // visible to everyone
};

export function filterNavByRoles(items: NavItem[], roles: string[]): NavItem[] {
  return items.filter((item) => {
    const allowed = ROLE_NAV_MAP[item.href];
    if (!allowed) return true; // unmapped routes default to visible
    if (allowed.length === 0) return true; // explicit "everyone"
    return roles.some((r) => allowed.includes(r));
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
  const { roles, jurisdictionCode, email } = useAppSelector((s) => s.auth);

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
          items={filterNavByRoles(monitorNav, roles)}
          pathname={pathname}
          onNav={onNav}
        />
        <NavSection
          label="Compliance"
          items={filterNavByRoles(complianceNav, roles)}
          pathname={pathname}
          onNav={onNav}
        />
        <NavSection
          label="Rule & ML Ops"
          items={filterNavByRoles(ruleOpsNav, roles)}
          pathname={pathname}
          onNav={onNav}
        />
        <NavSection
          label="Admin"
          items={filterNavByRoles(adminNav, roles)}
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
