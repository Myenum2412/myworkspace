import { describe, it, expect } from "vitest";

describe("middleware utilities", () => {
  describe("getHomePath", () => {
    function getHomePath(role?: string): string {
      if (role === "ORG_MENU_ADMIN" || role === "SUPER_ADMIN") return "/orgmenu";
      return "/dashboard";
    }

    it("returns /orgmenu for ORG_MENU_ADMIN", () => {
      expect(getHomePath("ORG_MENU_ADMIN")).toBe("/orgmenu");
    });

    it("returns /orgmenu for SUPER_ADMIN", () => {
      expect(getHomePath("SUPER_ADMIN")).toBe("/orgmenu");
    });

    it("returns /dashboard for admin", () => {
      expect(getHomePath("admin")).toBe("/dashboard");
    });

    it("returns /dashboard for member", () => {
      expect(getHomePath("member")).toBe("/dashboard");
    });

    it("returns /dashboard for undefined", () => {
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
});
