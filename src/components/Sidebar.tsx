"use client";

import Link from "next/link";
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
  BuildingOffice2Icon,
  KeyIcon,
  ScaleIcon,
  DocumentCheckIcon,
  CloudArrowUpIcon,
  EyeIcon,
  IdentificationIcon,
  CircleStackIcon,
} from "@heroicons/react/24/outline";
import { effectivePersona, PERSONA_META, type Persona } from "@/lib/personas";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

// Single registry of every nav link. Personas below compose these into the
// sections each role actually sees, so e.g. a platform admin never gets the
// single-tenant casework links and a scoped analyst never gets population
// analytics. Permission + feature filters still apply on top (graceful hiding).
const NAV = {
  overview: { name: "Overview", href: "/dashboard", icon: HomeIcon },
  alerts: { name: "Alerts", href: "/dashboard/alerts", icon: BellAlertIcon },
  cases: { name: "Cases", href: "/dashboard/cases", icon: InboxStackIcon },
  transactions: { name: "Transactions", href: "/dashboard/transactions", icon: BanknotesIcon },
  ingestion: { name: "Batch Upload", href: "/dashboard/ingestion", icon: CloudArrowUpIcon },
  customers: { name: "Customers", href: "/dashboard/customers", icon: UsersIcon },
  kyc: { name: "Identity Verification", href: "/dashboard/kyc", icon: IdentificationIcon },
  str: { name: "STR Reports", href: "/dashboard/str", icon: DocumentTextIcon },
  ctr: { name: "CTR Reports", href: "/dashboard/ctr", icon: DocumentDuplicateIcon },
  approvals: { name: "Approvals", href: "/dashboard/approvals", icon: CheckBadgeIcon },
  reports: { name: "Reports", href: "/dashboard/reports", icon: ChartBarIcon },
  geo: { name: "Geo Heatmap", href: "/dashboard/geo", icon: GlobeAltIcon },
  behavioral: { name: "Fraud Intelligence", href: "/dashboard/behavioral", icon: EyeIcon },
  watchlists: { name: "Watchlists", href: "/dashboard/watchlists", icon: ShieldExclamationIcon },
  sanctions: { name: "Sanctions Check", href: "/dashboard/sanctions", icon: NoSymbolIcon },
  rules: { name: "Rules", href: "/dashboard/rules", icon: AdjustmentsHorizontalIcon },
  shadow: { name: "Shadow Stats", href: "/dashboard/shadow", icon: ChartPieIcon },
  models: { name: "ML Models", href: "/dashboard/models", icon: CpuChipIcon },
  drift: { name: "Drift Monitoring", href: "/dashboard/drift", icon: ExclamationTriangleIcon },
  adminConfig: { name: "Admin Config", href: "/dashboard/admin", icon: AdjustmentsHorizontalIcon },
  team: { name: "Team", href: "/dashboard/team", icon: UserGroupIcon },
  apiKeys: { name: "API Keys", href: "/dashboard/api-keys", icon: KeyIcon },
  users: { name: "Users & Roles", href: "/dashboard/users", icon: UserGroupIcon },
  jurisdictions: { name: "Jurisdictions", href: "/dashboard/jurisdictions", icon: BuildingLibraryIcon },
  privacy: { name: "Data Privacy", href: "/dashboard/privacy", icon: FingerPrintIcon },
  audit: { name: "Audit Trail", href: "/dashboard/audit", icon: ClipboardDocumentListIcon },
  health: { name: "System Health", href: "/dashboard/health", icon: ServerIcon },
  settings: { name: "Settings", href: "/dashboard/settings", icon: Cog6ToothIcon },
  institutions: { name: "Institutions", href: "/dashboard/institutions", icon: BuildingOffice2Icon },
  usage: { name: "Usage", href: "/dashboard/api-keys", icon: ChartBarIcon },
  regulator: { name: "Regulator Dashboard", href: "/dashboard/regulator", icon: ScaleIcon },
  filings: { name: "Filed Reports", href: "/dashboard/regulator/filings", icon: DocumentCheckIcon },
  dataLake: { name: "Data Lake", href: "/dashboard/data-lake", icon: CircleStackIcon },
} satisfies Record<string, NavItem>;

type NavSectionDef = { label: string; items: NavItem[] };

// Each persona's nav, in render order. Backend RLS still scopes the data;
// this just shapes what each persona is offered.
const PERSONA_SECTIONS: Record<Persona, NavSectionDef[]> = {
  platform: [
    { label: "Platform", items: [NAV.overview, NAV.institutions] },
    // Rules + ML ops are Agregar-owned (platform assets), not exposed to tenants.
    { label: "Rules & ML", items: [NAV.adminConfig, NAV.rules, NAV.models, NAV.drift, NAV.shadow] },
    { label: "System", items: [NAV.jurisdictions, NAV.dataLake, NAV.audit, NAV.health, NAV.settings] },
  ],
  regulator: [
    { label: "Oversight", items: [NAV.regulator, NAV.filings] },
    { label: "Account", items: [NAV.settings] },
  ],
  client_admin: [
    { label: "Monitor", items: [NAV.overview, NAV.alerts, NAV.cases, NAV.transactions, NAV.customers, NAV.kyc] },
    { label: "Compliance", items: [NAV.str, NAV.ctr, NAV.approvals, NAV.reports, NAV.behavioral, NAV.geo, NAV.watchlists, NAV.sanctions] },
    // Tenants can view + tune detection rules for their own institution (backend
    // scopes the edit). ML Ops (shadow/models/drift) stays Agregar-only.
    { label: "Detection", items: [NAV.rules] },
    { label: "Admin", items: [NAV.ingestion, NAV.team, NAV.apiKeys, NAV.users, NAV.privacy, NAV.audit, NAV.health, NAV.settings] },
  ],
  compliance: [
    { label: "Monitor", items: [NAV.overview, NAV.alerts, NAV.cases, NAV.kyc] },
    { label: "Compliance", items: [NAV.str, NAV.ctr, NAV.approvals, NAV.reports, NAV.behavioral, NAV.watchlists, NAV.sanctions] },
    { label: "Account", items: [NAV.audit, NAV.settings] },
  ],
  supervisor: [
    { label: "Team", items: [NAV.overview, NAV.alerts, NAV.cases, NAV.transactions, NAV.customers, NAV.kyc] },
    // Supervisors review filed STR/CTR reports (read/file STR via FILE_STR; CTR read-only via VIEW_CASES).
    { label: "Compliance", items: [NAV.str, NAV.ctr] },
    { label: "Analytics", items: [NAV.reports, NAV.behavioral, NAV.geo] },
    { label: "Account", items: [NAV.settings] },
  ],
  ml: [
    { label: "Model Ops", items: [NAV.overview, NAV.models, NAV.drift, NAV.shadow, NAV.rules] },
    { label: "Account", items: [NAV.settings] },
  ],
  dpo: [
    { label: "Data Protection", items: [NAV.overview, NAV.privacy] },
    { label: "Account", items: [NAV.audit, NAV.settings] },
  ],
  auditor: [
    { label: "Review", items: [NAV.overview, NAV.audit, NAV.reports] },
    { label: "Casework (read-only)", items: [NAV.alerts, NAV.cases] },
    { label: "Account", items: [NAV.settings] },
  ],
  analyst: [
    { label: "My Work", items: [NAV.overview, NAV.alerts, NAV.cases, NAV.transactions, NAV.customers, NAV.kyc] },
    { label: "Account", items: [NAV.settings] },
  ],
  default: [
    { label: "Monitor", items: [NAV.overview, NAV.alerts, NAV.cases] },
    { label: "Account", items: [NAV.audit, NAV.settings] },
  ],
};

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
  "/dashboard/kyc":           ["view_cases"],
  "/dashboard/str":           ["file_str"],
  "/dashboard/ctr":           ["view_cases", "approve_action", "configure_thresholds"],  // backend GET requires only VIEW_CASES; filing actions are gated in-page
  "/dashboard/approvals":     ["approve_action"],
  "/dashboard/reports":       ["view_analytics"],
  "/dashboard/geo":           ["view_analytics"],
  "/dashboard/behavioral":    ["view_analytics"],
  "/dashboard/watchlists":    ["manage_sanctions_lists"],
  "/dashboard/sanctions":     ["manage_sanctions_lists"],
  "/dashboard/rules":         ["view_rules"],
  "/dashboard/shadow":        ["view_shadow_stats"],
  "/dashboard/models":        ["view_models"],
  "/dashboard/drift":         ["view_drift"],
  "/dashboard/audit":         ["view_audit_trail", "access_audit_trail"],
  "/dashboard/privacy":       ["view_dsar", "manage_dsar", "erase_pii"],
  "/dashboard/users":         ["view_users"],
  "/dashboard/admin":         ["create_rule", "configure_thresholds"],  // admin functions only — not view_analytics (analysts have that)
  "/dashboard/jurisdictions": ["configure_thresholds"],
  "/dashboard/health":        ["manage_api_keys"],
  "/dashboard/settings":      [],                                                         // any authenticated user
  // Multi-tenant + regulator
  "/dashboard/institutions":  ["manage_institutions", "view_institutions"],
  "/dashboard/team":          ["manage_institution_users", "view_users"],
  "/dashboard/api-keys":      ["manage_api_keys"],
  "/dashboard/regulator":          ["view_regulator_filings"],
  "/dashboard/regulator/filings":  ["view_regulator_filings"],
  "/dashboard/data-lake":          ["view_audit_trail"],
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
  const { permissions, roles, jurisdictionCode, email, features, activePersona, institutionName } =
    useAppSelector((s) => s.auth);
  const persona = effectivePersona(roles, activePersona);
  const sections = PERSONA_SECTIONS[persona];

  // Permission + feature filtering still applies on top of the persona's
  // section list — a persona offers a link, the user's grants decide if it shows.
  const navFor = (items: NavItem[]) =>
    filterNavByFeatures(filterNavByPermissions(items, permissions), features);

  const tierLabel = PERSONA_META[persona].label;
  // Org line: real institution name for tenant users; platform users belong to
  // no institution (they see all), so label that explicitly.
  const orgName = institutionName ?? (persona === "platform" ? "Agregar Platform" : "Transaction Monitor");

  return (
    <>
      <div className="px-6 py-5 border-b border-navy-600">
        <div className="flex items-center gap-2">
          <BuildingOffice2Icon className="h-5 w-5 text-primary-300 shrink-0" aria-hidden="true" />
          <p className="text-sm font-semibold text-white truncate" title={orgName}>
            {orgName}
          </p>
        </div>
        <p className="text-primary-300 text-[10px] font-semibold uppercase tracking-wider mt-1">
          {tierLabel} · {jurisdictionCode ?? "TMS"}
        </p>
        {email && <p className="text-navy-300 text-xs mt-1 truncate">{email}</p>}
      </div>

      <nav className="flex-1 px-3 py-0 space-y-0.5 overflow-y-auto">
        {sections.map((s) => (
          <NavSection
            key={s.label}
            label={s.label}
            items={navFor(s.items)}
            pathname={pathname}
            onNav={onNav}
          />
        ))}
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
