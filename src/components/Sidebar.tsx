"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { logout } from "@/redux/slices/authSlice";
import { baseApi } from "@/redux/slices/api/baseApi";
import DarkModeToggle from "@/components/DarkModeToggle";
import {
  HomeIcon,
  UsersIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ChartPieIcon,
  ArrowRightOnRectangleIcon,
  DocumentTextIcon,
  AdjustmentsHorizontalIcon,
  BuildingOfficeIcon,
  BellAlertIcon,
  BookOpenIcon,
  Bars3Icon,
  XMarkIcon,
  InboxArrowDownIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon,
  DocumentArrowDownIcon,
  ServerIcon,
  WrenchScrewdriverIcon,
  UserPlusIcon,
  BuildingLibraryIcon,
  InboxStackIcon,
  CubeTransparentIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import NotificationBell from "@/components/NotificationBell";

/* ── Admin navigation (Agregar platform management) ── */
const adminPlatformNav = [
  { name: "Platform Overview", href: "/dashboard", icon: HomeIcon },
  { name: "Signup Requests", href: "/dashboard/signup-requests", icon: InboxArrowDownIcon },
  { name: "Clients", href: "/dashboard/clients", icon: BuildingOfficeIcon },
];

const adminAnalyticsNav = [
  { name: "Platform Usage", href: "/dashboard/usage", icon: ChartBarIcon },
  { name: "Analytics", href: "/dashboard/analytics", icon: ChartPieIcon },
  { name: "Reports", href: "/dashboard/reports", icon: DocumentArrowDownIcon },
  { name: "Regulator", href: "/dashboard/regulator", icon: BuildingLibraryIcon },
  { name: "Audit Logs", href: "/dashboard/audit-logs", icon: ClipboardDocumentListIcon },
];

const adminOpsNav = [
  { name: "Cases", href: "/dashboard/cases", icon: InboxStackIcon },
  { name: "Super Admin", href: "/dashboard/admin", icon: WrenchScrewdriverIcon },
  { name: "Internal Ops", href: "/dashboard/internal-ops", icon: ServerIcon },
];

const adminConfigNav = [
  { name: "Workflows", href: "/dashboard/workflows", icon: CubeTransparentIcon },
  { name: "Policies", href: "/dashboard/policies", icon: DocumentTextIcon },
  { name: "Tiers", href: "/dashboard/tiers", icon: AdjustmentsHorizontalIcon },
  { name: "Settings", href: "/dashboard/settings", icon: Cog6ToothIcon },
];

/* ── Client navigation (bank/fintech integration) ── */
const clientMainNav = [
  { name: "Overview", href: "/dashboard", icon: HomeIcon },
  { name: "My Customers", href: "/dashboard/customers", icon: UsersIcon },
  { name: "Decisions", href: "/dashboard/decisions", icon: ShieldCheckIcon },
  { name: "Usage", href: "/dashboard/usage", icon: ChartBarIcon },
  { name: "Analytics", href: "/dashboard/analytics", icon: ChartPieIcon },
];

const clientComplianceNav = [
  { name: "Cases", href: "/dashboard/cases", icon: InboxStackIcon },
  { name: "Compliance", href: "/dashboard/compliance", icon: ShieldExclamationIcon },
  { name: "Risk Monitoring", href: "/dashboard/risk", icon: ExclamationTriangleIcon },
  { name: "Supervisor", href: "/dashboard/supervisor", icon: CheckBadgeIcon },
  { name: "Onboarding", href: "/dashboard/onboarding", icon: UserPlusIcon },
  { name: "Reports", href: "/dashboard/reports", icon: DocumentArrowDownIcon },
];

const clientIntegrationNav = [
  { name: "Integration Status", href: "/dashboard/integration", icon: RocketLaunchIcon },
  { name: "Webhooks", href: "/dashboard/webhooks", icon: BellAlertIcon },
  { name: "Docs", href: "/dashboard/docs", icon: BookOpenIcon },
];

const clientConfigNav = [
  { name: "Admin", href: "/dashboard/client-admin", icon: WrenchScrewdriverIcon },
  { name: "Workflows", href: "/dashboard/workflows", icon: CubeTransparentIcon },
  { name: "Policies", href: "/dashboard/policies", icon: DocumentTextIcon },
  { name: "Tiers", href: "/dashboard/tiers", icon: AdjustmentsHorizontalIcon },
  { name: "Settings", href: "/dashboard/settings", icon: Cog6ToothIcon },
];

/* ── Regulator navigation (Bank of Ghana, FIUs — cross-tenant) ── */
const regulatorMainNav = [
  { name: "Overview", href: "/dashboard/regulator", icon: BuildingLibraryIcon },
  { name: "Institution Monitoring", href: "/dashboard/regulator/institutions", icon: BuildingOfficeIcon },
  { name: "Suspicious Activity", href: "/dashboard/regulator/suspicious", icon: ShieldExclamationIcon },
];

const regulatorReportsNav = [
  { name: "Regulatory Reports", href: "/dashboard/regulator/reports", icon: DocumentArrowDownIcon },
  { name: "Audit Logs", href: "/dashboard/regulator/audit", icon: ClipboardDocumentListIcon },
];

type NavItem = { name: string; href: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; roles?: string[] };

// Role-based visibility for client navigation
// If `roles` is undefined or empty, the item is visible to all roles.
// Supervisor role = Approval Dashboard only (spec): Cases + Supervisor + Reports + Docs.
const ROLE_NAV_MAP: Record<string, string[]> = {
  // General monitor — hidden from Supervisor (home = Supervisor page) and Operations (home = Onboarding)
  "/dashboard": ["OWNER", "ADMIN", "COMPLIANCE", "RISK", "EXECUTIVE"],
  "/dashboard/customers": ["OWNER", "ADMIN", "OPERATIONS", "COMPLIANCE", "RISK", "EXECUTIVE"],
  // Decisions = compliance decisions log — Operations has NO access per spec
  "/dashboard/decisions": ["OWNER", "ADMIN", "COMPLIANCE", "RISK", "EXECUTIVE"],
  "/dashboard/usage": ["OWNER", "ADMIN", "EXECUTIVE"],
  "/dashboard/analytics": ["OWNER", "ADMIN", "EXECUTIVE", "COMPLIANCE"],
  // Cases — Operations creates/views cases; Supervisor reviews escalated ones
  "/dashboard/cases": ["OWNER", "ADMIN", "COMPLIANCE", "SUPERVISOR", "OPERATIONS"],
  "/dashboard/compliance": ["OWNER", "ADMIN", "COMPLIANCE"],
  "/dashboard/risk": ["OWNER", "ADMIN", "RISK", "COMPLIANCE", "EXECUTIVE"],
  "/dashboard/supervisor": ["OWNER", "ADMIN", "SUPERVISOR"],
  "/dashboard/onboarding": ["OWNER", "ADMIN", "OPERATIONS", "COMPLIANCE"],
  "/dashboard/reports": ["OWNER", "ADMIN", "EXECUTIVE", "COMPLIANCE", "SUPERVISOR"],
  // Integration — admin/owner only
  "/dashboard/integration": ["OWNER", "ADMIN"],
  "/dashboard/webhooks": ["OWNER", "ADMIN"],
  "/dashboard/docs": [],
  // Configuration — admin/owner only
  "/dashboard/client-admin": ["OWNER", "ADMIN"],
  "/dashboard/workflows": ["OWNER", "ADMIN"],
  "/dashboard/policies": ["OWNER", "ADMIN"],
  "/dashboard/tiers": ["OWNER", "ADMIN"],
  "/dashboard/settings": ["OWNER", "ADMIN"],
};

function filterNavByRole(items: NavItem[], role: string | null): NavItem[] {
  if (!role) return items; // No role info = show all (backward compat)
  return items.filter((item) => {
    const allowed = ROLE_NAV_MAP[item.href];
    if (!allowed || allowed.length === 0) return true; // No restriction
    return allowed.includes(role);
  });
}

function NavSection({ label, items, pathname, onNav }: { label: string; items: NavItem[]; pathname: string; onNav?: () => void }) {
  if (items.length === 0) return null;
  return (
    <>
      <p className="text-navy-400 text-[10px] font-semibold uppercase tracking-wider px-3 pt-4 pb-1">{label}</p>
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
  const { isAdmin, isRegulator, clientName, userRole } = useAppSelector((s) => s.auth);
  const effectiveRole = isAdmin ? null : (userRole || "OWNER");

  const portalLabel = isAdmin ? "Super Admin Console" : isRegulator ? "Regulator Portal" : "Client Portal";

  return (
    <>
      <div className="flex items-center gap-3 px-6 py-5 border-b border-navy-600">
        <Image src="/images/Autheo_white.png" alt="Autheo TMS" width={120} height={32} />
      </div>

      <div className="px-6 py-3">
        <p className="text-primary-300 text-xs font-semibold uppercase tracking-wider">
          {portalLabel}
        </p>
        {clientName && (
          <p className="text-navy-300 text-xs mt-1 truncate">{clientName}</p>
        )}
      </div>

      <nav className="flex-1 px-3 py-0 space-y-0.5 overflow-y-auto">
        {isAdmin ? (
          <>
            <NavSection label="Platform" items={adminPlatformNav} pathname={pathname} onNav={onNav} />
            <NavSection label="Analytics" items={adminAnalyticsNav} pathname={pathname} onNav={onNav} />
            <NavSection label="Operations" items={adminOpsNav} pathname={pathname} onNav={onNav} />
            <NavSection label="Configuration" items={adminConfigNav} pathname={pathname} onNav={onNav} />
          </>
        ) : isRegulator ? (
          <>
            <NavSection label="Monitoring" items={regulatorMainNav} pathname={pathname} onNav={onNav} />
            <NavSection label="Reports" items={regulatorReportsNav} pathname={pathname} onNav={onNav} />
          </>
        ) : (
          <>
            <NavSection label="Monitor" items={filterNavByRole(clientMainNav, effectiveRole)} pathname={pathname} onNav={onNav} />
            <NavSection label="Compliance & Risk" items={filterNavByRole(clientComplianceNav, effectiveRole)} pathname={pathname} onNav={onNav} />
            <NavSection label="Integration" items={filterNavByRole(clientIntegrationNav, effectiveRole)} pathname={pathname} onNav={onNav} />
            <NavSection label="Configuration" items={filterNavByRole(clientConfigNav, effectiveRole)} pathname={pathname} onNav={onNav} />
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-navy-600 space-y-1">
        <NotificationBell />
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
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        className="fixed top-4 left-4 z-20 lg:hidden p-2 rounded-lg bg-navy text-white shadow-lg"
      >
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Mobile overlay */}
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

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-10 w-64 bg-navy flex-col">
        <SidebarContent />
      </aside>
    </>
  );
}
