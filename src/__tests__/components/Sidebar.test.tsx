import { describe, it, expect } from "vitest";
import { filterNavByPermissions } from "@/components/Sidebar";
import { HomeIcon } from "@heroicons/react/24/outline";

const NAV = [
  { name: "Overview", href: "/dashboard", icon: HomeIcon },
  { name: "Alerts", href: "/dashboard/alerts", icon: HomeIcon },
  { name: "STR Reports", href: "/dashboard/str", icon: HomeIcon },
  { name: "Sanctions", href: "/dashboard/sanctions", icon: HomeIcon },
  { name: "Rules", href: "/dashboard/rules", icon: HomeIcon },
  { name: "Users & Roles", href: "/dashboard/users", icon: HomeIcon },
  { name: "Settings", href: "/dashboard/settings", icon: HomeIcon },
];

// Flat permission sets as /auth/me would resolve them for each role.
const ANALYST = ["view_cases", "view_audit_trail", "access_audit_trail", "view_rules", "view_lists", "view_labels", "view_analytics"];
const COMPLIANCE = [...ANALYST, "file_str", "approve_action", "manage_sanctions_lists", "configure_thresholds"];

describe("filterNavByPermissions", () => {
  it("hides links whose permission the user lacks", () => {
    const visible = filterNavByPermissions(NAV, ANALYST).map((i) => i.href);
    expect(visible).toContain("/dashboard/alerts"); // view_cases
    expect(visible).toContain("/dashboard/rules"); // view_rules
    expect(visible).not.toContain("/dashboard/str"); // needs file_str
    expect(visible).not.toContain("/dashboard/users"); // needs view_users
  });

  it("does NOT show sanctions to a user with only view_cases (regression: no manage_sanctions_lists)", () => {
    const visible = filterNavByPermissions(NAV, ANALYST).map((i) => i.href);
    expect(visible).not.toContain("/dashboard/sanctions");
  });

  it("shows sanctions + STR to a compliance officer", () => {
    const visible = filterNavByPermissions(NAV, COMPLIANCE).map((i) => i.href);
    expect(visible).toContain("/dashboard/sanctions"); // manage_sanctions_lists
    expect(visible).toContain("/dashboard/str"); // file_str
    expect(visible).not.toContain("/dashboard/users"); // still no view_users
  });

  it("settings + overview are visible to everyone (empty-array policy)", () => {
    for (const perms of [[], ["view_users"], ANALYST]) {
      const visible = filterNavByPermissions(NAV, perms).map((i) => i.href);
      expect(visible).toContain("/dashboard");
      expect(visible).toContain("/dashboard/settings");
    }
  });

  it("with no permissions, only the empty-policy links survive", () => {
    const visible = filterNavByPermissions(NAV, []).map((i) => i.href);
    expect(visible).toEqual(["/dashboard", "/dashboard/settings"]);
  });
});
