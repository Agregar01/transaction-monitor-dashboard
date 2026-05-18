import { describe, it, expect } from "vitest";
import { filterNavByRoles } from "@/components/Sidebar";
import { HomeIcon } from "@heroicons/react/24/outline";

const NAV = [
  { name: "Overview", href: "/dashboard", icon: HomeIcon },
  { name: "Alerts", href: "/dashboard/alerts", icon: HomeIcon },
  { name: "STR Reports", href: "/dashboard/str", icon: HomeIcon },
  { name: "Rules", href: "/dashboard/rules", icon: HomeIcon },
  { name: "Users & Roles", href: "/dashboard/users", icon: HomeIcon },
  { name: "Settings", href: "/dashboard/settings", icon: HomeIcon },
];

describe("filterNavByRoles", () => {
  it("hides admin-only links from non-admin users", () => {
    const visible = filterNavByRoles(NAV, ["ANALYST"]).map((i) => i.href);
    expect(visible).toContain("/dashboard");
    expect(visible).toContain("/dashboard/alerts");
    expect(visible).not.toContain("/dashboard/users");
    expect(visible).not.toContain("/dashboard/str"); // STR requires SENIOR_ANALYST+
  });

  it("shows STR + rules to SENIOR_ANALYST + ML_ENGINEER combo", () => {
    const visible = filterNavByRoles(NAV, ["SENIOR_ANALYST", "ML_ENGINEER"]).map((i) => i.href);
    expect(visible).toContain("/dashboard/str");
    expect(visible).toContain("/dashboard/rules");
    expect(visible).not.toContain("/dashboard/users");
  });

  it("shows everything to SYSTEM_ADMIN", () => {
    const visible = filterNavByRoles(NAV, ["SYSTEM_ADMIN"]).map((i) => i.href);
    expect(visible).toEqual(NAV.map((i) => i.href));
  });

  it("settings link is visible to every role (empty-array policy)", () => {
    expect(filterNavByRoles(NAV, ["READONLY"]).some((i) => i.href === "/dashboard/settings")).toBe(true);
    expect(filterNavByRoles(NAV, ["ANALYST"]).some((i) => i.href === "/dashboard/settings")).toBe(true);
  });

  it("hides everything role-gated when the user has no roles", () => {
    const visible = filterNavByRoles(NAV, []).map((i) => i.href);
    // Only the empty-policy /dashboard/settings should survive
    expect(visible).toEqual(["/dashboard/settings"]);
  });
});
