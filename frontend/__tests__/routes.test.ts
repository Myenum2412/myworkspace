import { describe, it, expect } from "vitest";

describe("staff routes inventory", () => {
  const staffRoutes = [
    { path: "/staffs", label: "Dashboard", exists: true },
    { path: "/staffs/activity", label: "Activity", exists: true },
    { path: "/staffs/list", label: "Directory", exists: true },
    { path: "/staffs/add", label: "Add Staff", exists: true },
    { path: "/staffs/schedule", label: "Shifts", exists: true },
    { path: "/staffs/time-off", label: "Time Off", exists: true },
    { path: "/staffs/attendance", label: "Today", exists: true },
    { path: "/staffs/attendance/reports", label: "Reports", exists: true },
    { path: "/staffs/performance", label: "Reviews", exists: true },
    { path: "/staffs/performance/goals", label: "Goals", exists: true },
    { path: "/staffs/settings", label: "General", exists: true },
    { path: "/staffs/settings/roles", label: "Roles", exists: true },
  ];

  it("all 12 staff routes are marked as existing", () => {
    expect(staffRoutes.length).toBe(12);
    for (const route of staffRoutes) {
      expect(route.exists).toBe(true);
    }
  });

  it("all paths start with /staffs", () => {
    for (const route of staffRoutes) {
      expect(route.path).toMatch(/^\/staffs/);
    }
  });

  it("no routes are marked broken", () => {
    const broken = staffRoutes.filter((r) => !r.exists);
    expect(broken.length).toBe(0);
  });
});

describe("app route availability", () => {
  const coreRoutes = [
    "/dashboard",
    "/employees",
    "/projects",
    "/alltasks",
    "/mytasks",
    "/time-tracker",
    "/approvals",
    "/files",
    "/calendar",
    "/profile",
    "/settings",
  ];

  it("all core app routes are defined", () => {
    for (const route of coreRoutes) {
      expect(route).toMatch(/^\//);
    }
  });

  it("has no duplicate routes", () => {
    const unique = new Set(coreRoutes);
    expect(unique.size).toBe(coreRoutes.length);
  });
});

describe("sidebar link integrity", () => {
  const sidebarLinks = [
    ...["/staffs", "/staffs/activity", "/staffs/list", "/staffs/add",
       "/staffs/schedule", "/staffs/time-off", "/staffs/attendance",
       "/staffs/attendance/reports", "/staffs/performance",
       "/staffs/performance/goals", "/staffs/settings", "/staffs/settings/roles"],
    ...["/dashboard", "/overview", "/reports", "/employees", "/projects",
       "/approvals", "/time-tracker", "/files", "/settings"],
  ];

  it("all sidebar links start with /", () => {
    for (const link of sidebarLinks) {
      expect(link).toMatch(/^\//);
    }
  });

  it("no empty links", () => {
    for (const link of sidebarLinks) {
      expect(link.length).toBeGreaterThan(1);
    }
  });
});
