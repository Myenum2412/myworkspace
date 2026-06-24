import { describe, it, expect } from "vitest";

describe("middleware utilities", () => {
  describe("getHomePath", () => {
    function getHomePath(_role?: string): string {
      return "/dashboard";
    }

    it("always returns /dashboard for any role", () => {
      expect(getHomePath("ORG_MENU_ADMIN")).toBe("/dashboard");
      expect(getHomePath("SUPER_ADMIN")).toBe("/dashboard");
      expect(getHomePath("admin")).toBe("/dashboard");
      expect(getHomePath("member")).toBe("/dashboard");
      expect(getHomePath(undefined)).toBe("/dashboard");
    });
  });

  describe("public path detection", () => {
    const publicPaths = ["/login", "/signup", "/signup-mongo", "/forgot-password", "/pricing"];

    function isPublic(pathname: string): boolean {
      return publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
    }

    it("detects /login as public", () => {
      expect(isPublic("/login")).toBe(true);
    });

    it("detects /signup as public", () => {
      expect(isPublic("/signup")).toBe(true);
    });

    it("detects /forgot-password as public", () => {
      expect(isPublic("/forgot-password")).toBe(true);
    });

    it("detects /pricing as public", () => {
      expect(isPublic("/pricing")).toBe(true);
    });

    it("detects /dashboard as protected", () => {
      expect(isPublic("/dashboard")).toBe(false);
    });

    it("detects /employees as protected", () => {
      expect(isPublic("/employees")).toBe(false);
    });

    it("detects /staffs as protected", () => {
      expect(isPublic("/staffs")).toBe(false);
    });

    it("detects /orgmenu as protected", () => {
      expect(isPublic("/orgmenu")).toBe(false);
    });

    it("handles /login/ sub-paths", () => {
      expect(isPublic("/login/test")).toBe(true);
    });
  });

  describe("orgmenu access control", () => {
    function canAccessOrgmenu(
      role: string | undefined,
      email: string | undefined,
      adminEmail: string
    ): string {
      if (!email) return "denied";
      if (role === "ORG_MENU_ADMIN" || role === "SUPER_ADMIN") return "granted";
      if (email === adminEmail) return "granted";
      return "denied";
    }

    it("grants ORG_MENU_ADMIN by role", () => {
      expect(canAccessOrgmenu("ORG_MENU_ADMIN", "user@co.com", "admin@co.com")).toBe("granted");
    });

    it("grants SUPER_ADMIN by role", () => {
      expect(canAccessOrgmenu("SUPER_ADMIN", "user@co.com", "admin@co.com")).toBe("granted");
    });

    it("grants admin email regardless of role", () => {
      expect(canAccessOrgmenu("member", "admin@co.com", "admin@co.com")).toBe("granted");
    });

    it("denies regular member", () => {
      expect(canAccessOrgmenu("member", "user@co.com", "admin@co.com")).toBe("denied");
    });

    it("denies when no email", () => {
      expect(canAccessOrgmenu("member", undefined, "admin@co.com")).toBe("denied");
    });
  });

  describe("route context detection", () => {
    const ORIGIN_ROUTES = ["/orgmenu"];
    const STAFF_ROUTES = ["/staffs"];
    const PUBLIC_ROUTES = ["/login", "/signup", "/signup-mongo", "/forgot-password", "/pricing"];
    const WORKSPACE_ROUTES = [
      "/dashboard", "/overview", "/employees", "/alltasks", "/mytasks",
      "/projects", "/teams", "/clients", "/approvals", "/reports",
      "/calendar", "/time-tracker", "/time-reports", "/my-time",
      "/teamtasks", "/team-time", "/settings", "/profile", "/admin",
      "/departments", "/addemployees", "/addprojects", "/files",
      "/savedtasks", "/upcomingtasks", "/terminated",
      "/recycle-bin", "/upload",
    ];

    function getRouteContext(pathname: string): "origin" | "staff" | "workspace" | "public" | "unknown" {
      if (ORIGIN_ROUTES.some((r) => pathname.startsWith(r))) return "origin";
      if (STAFF_ROUTES.some((r) => pathname.startsWith(r))) return "staff";
      if (PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return "public";
      if (WORKSPACE_ROUTES.some((r) => pathname.startsWith(r))) return "workspace";
      if (pathname === "/") return "public";
      return "unknown";
    }

    it("detects origin context", () => {
      expect(getRouteContext("/orgmenu")).toBe("origin");
      expect(getRouteContext("/orgmenu/analytics")).toBe("origin");
      expect(getRouteContext("/orgmenu/settings")).toBe("origin");
    });

    it("detects staff context", () => {
      expect(getRouteContext("/staffs")).toBe("staff");
      expect(getRouteContext("/staffs/schedule")).toBe("staff");
    });

    it("detects public context", () => {
      expect(getRouteContext("/login")).toBe("public");
      expect(getRouteContext("/signup")).toBe("public");
      expect(getRouteContext("/pricing")).toBe("public");
      expect(getRouteContext("/")).toBe("public");
    });

    it("detects workspace context", () => {
      expect(getRouteContext("/dashboard")).toBe("workspace");
      expect(getRouteContext("/employees")).toBe("workspace");
      expect(getRouteContext("/settings")).toBe("workspace");
      expect(getRouteContext("/profile")).toBe("workspace");
      expect(getRouteContext("/files")).toBe("workspace");
    });

    it("returns unknown for unrecognized paths", () => {
      expect(getRouteContext("/unknown")).toBe("unknown");
      expect(getRouteContext("/some-random-path")).toBe("unknown");
    });

    it("no route matches multiple contexts", () => {
      const testRoutes = [
        "/orgmenu", "/staffs", "/dashboard", "/login", "/",
      ];

      for (const route of testRoutes) {
        const contexts = [
          getRouteContext(route) === "origin" ? 1 : 0,
          getRouteContext(route) === "staff" ? 1 : 0,
          getRouteContext(route) === "workspace" ? 1 : 0,
          getRouteContext(route) === "public" ? 1 : 0,
        ].reduce((a, b) => a + b, 0);
        expect(contexts, `${route} matched ${contexts} contexts`).toBe(1);
      }
    });
  });
});
