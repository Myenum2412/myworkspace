import { describe, it, expect } from "vitest";
import { getAppContext, isRouteInContext, isAppPage } from "@/lib/app-context";

describe("getAppContext", () => {
  it("returns 'origin' for /orgmenu routes", () => {
    expect(getAppContext("/orgmenu")).toBe("origin");
    expect(getAppContext("/orgmenu/analytics")).toBe("origin");
    expect(getAppContext("/orgmenu/org/billing")).toBe("origin");
    expect(getAppContext("/orgmenu/members/invite")).toBe("origin");
    expect(getAppContext("/orgmenu/settings/notifications")).toBe("origin");
    expect(getAppContext("/orgmenu/profile")).toBe("origin");
    expect(getAppContext("/orgmenu/audit/exports")).toBe("origin");
  });

  it("returns 'staff' for /staffs routes", () => {
    expect(getAppContext("/staffs")).toBe("staff");
    expect(getAppContext("/staffs/activity")).toBe("staff");
    expect(getAppContext("/staffs/schedule")).toBe("staff");
    expect(getAppContext("/staffs/attendance/reports")).toBe("staff");
    expect(getAppContext("/staffs/performance/goals")).toBe("staff");
    expect(getAppContext("/staffs/list")).toBe("staff");
    expect(getAppContext("/staffs/settings/roles")).toBe("staff");
  });

  it("returns 'public' for public routes", () => {
    expect(getAppContext("/login")).toBe("public");
    expect(getAppContext("/signup")).toBe("public");
    expect(getAppContext("/signup-mongo")).toBe("public");
    expect(getAppContext("/forgot-password")).toBe("public");
    expect(getAppContext("/pricing")).toBe("public");
    expect(getAppContext("/")).toBe("public");
  });

  it("returns 'public' for login sub-paths", () => {
    expect(getAppContext("/login/test")).toBe("public");
    expect(getAppContext("/signup/verify")).toBe("public");
  });

  it("returns 'workspace' for workspace routes", () => {
    expect(getAppContext("/dashboard")).toBe("workspace");
    expect(getAppContext("/dashboard")).toBe("workspace");
    expect(getAppContext("/employees")).toBe("workspace");
    expect(getAppContext("/alltasks")).toBe("workspace");
    expect(getAppContext("/mytasks")).toBe("workspace");
    expect(getAppContext("/projects")).toBe("workspace");
    expect(getAppContext("/teams")).toBe("workspace");
    expect(getAppContext("/clients")).toBe("workspace");
    expect(getAppContext("/approvals")).toBe("workspace");
    expect(getAppContext("/approvals/approved")).toBe("workspace");
    expect(getAppContext("/reports")).toBe("workspace");
    expect(getAppContext("/calendar")).toBe("workspace");
    expect(getAppContext("/time-tracker")).toBe("workspace");
    expect(getAppContext("/time-reports")).toBe("workspace");
    expect(getAppContext("/my-time")).toBe("workspace");
    expect(getAppContext("/teamtasks")).toBe("workspace");
    expect(getAppContext("/team-time")).toBe("workspace");
    expect(getAppContext("/settings")).toBe("workspace");
    expect(getAppContext("/settings/team")).toBe("workspace");
    expect(getAppContext("/profile")).toBe("workspace");
    expect(getAppContext("/admin/profile")).toBe("workspace");
    expect(getAppContext("/departments")).toBe("workspace");
    expect(getAppContext("/addemployees")).toBe("workspace");
    expect(getAppContext("/addprojects")).toBe("workspace");
    expect(getAppContext("/files")).toBe("workspace");
    expect(getAppContext("/savedtasks")).toBe("workspace");
    expect(getAppContext("/upcomingtasks")).toBe("workspace");
    expect(getAppContext("/terminated")).toBe("workspace");
    expect(getAppContext("/recycle-bin")).toBe("workspace");
    expect(getAppContext("/upload")).toBe("workspace");
    expect(getAppContext("/overview")).toBe("workspace");
  });

  it("returns 'workspace' for unknown paths as default", () => {
    expect(getAppContext("/some-unknown-path")).toBe("workspace");
    expect(getAppContext("/random/page")).toBe("workspace");
  });
});

describe("isRouteInContext", () => {
  it("correctly identifies origin routes", () => {
    expect(isRouteInContext("/orgmenu", "origin")).toBe(true);
    expect(isRouteInContext("/orgmenu/settings", "origin")).toBe(true);
    expect(isRouteInContext("/dashboard", "origin")).toBe(false);
    expect(isRouteInContext("/staffs", "origin")).toBe(false);
  });

  it("correctly identifies workspace routes", () => {
    expect(isRouteInContext("/dashboard", "workspace")).toBe(true);
    expect(isRouteInContext("/employees", "workspace")).toBe(true);
    expect(isRouteInContext("/orgmenu", "workspace")).toBe(false);
    expect(isRouteInContext("/staffs", "workspace")).toBe(false);
  });

  it("correctly identifies staff routes", () => {
    expect(isRouteInContext("/staffs", "staff")).toBe(true);
    expect(isRouteInContext("/staffs/schedule", "staff")).toBe(true);
    expect(isRouteInContext("/dashboard", "staff")).toBe(false);
    expect(isRouteInContext("/orgmenu", "staff")).toBe(false);
  });
});

describe("isAppPage", () => {
  it("returns false for root", () => {
    expect(isAppPage("/")).toBe(false);
  });

  it("returns false for public routes (except pricing)", () => {
    expect(isAppPage("/login")).toBe(false);
    expect(isAppPage("/signup")).toBe(false);
    expect(isAppPage("/signup-mongo")).toBe(false);
    expect(isAppPage("/forgot-password")).toBe(false);
  });

  it("returns true for pricing", () => {
    expect(isAppPage("/pricing")).toBe(true);
  });

  it("returns false for API routes", () => {
    expect(isAppPage("/api/auth")).toBe(false);
    expect(isAppPage("/api/user/profile")).toBe(false);
  });

  it("returns false for Next.js internal routes", () => {
    expect(isAppPage("/_next/static")).toBe(false);
  });

  it("returns true for workspace routes", () => {
    expect(isAppPage("/dashboard")).toBe(true);
    expect(isAppPage("/employees")).toBe(true);
    expect(isAppPage("/settings")).toBe(true);
    expect(isAppPage("/profile")).toBe(true);
    expect(isAppPage("/files")).toBe(true);
  });

  it("returns true for origin routes", () => {
    expect(isAppPage("/orgmenu")).toBe(true);
    expect(isAppPage("/orgmenu/analytics")).toBe(true);
  });

  it("returns true for staff routes", () => {
    expect(isAppPage("/staffs")).toBe(true);
    expect(isAppPage("/staffs/schedule")).toBe(true);
  });
});
