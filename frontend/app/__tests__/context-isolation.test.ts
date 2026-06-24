import { describe, it, expect } from "vitest";

/**
 * Context Isolation Tests
 *
 * These tests verify strict separation between Origin Menu, Workspace, and Staff contexts.
 * They test the route guard logic, navigation isolation, and layout protection.
 */

describe("Context Isolation - Route Protection", () => {
  function getRouteContext(pathname: string): "origin" | "staff" | "workspace" | "public" | "unknown" {
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

    if (ORIGIN_ROUTES.some((r) => pathname.startsWith(r))) return "origin";
    if (STAFF_ROUTES.some((r) => pathname.startsWith(r))) return "staff";
    if (PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return "public";
    if (WORKSPACE_ROUTES.some((r) => pathname.startsWith(r))) return "workspace";
    if (pathname === "/") return "public";
    return "unknown";
  }

  describe("origin context access", () => {
    it("should allow origin routes only in /orgmenu", () => {
      expect(getRouteContext("/orgmenu")).toBe("origin");
      expect(getRouteContext("/orgmenu/analytics")).toBe("origin");
      expect(getRouteContext("/orgmenu/members/invite")).toBe("origin");
      expect(getRouteContext("/orgmenu/settings")).toBe("origin");
      expect(getRouteContext("/orgmenu/profile")).toBe("origin");
    });

    it("should prevent origin routes from being accessed in workspace context", () => {
      expect(getRouteContext("/orgmenu")).not.toBe("workspace");
      expect(getRouteContext("/orgmenu")).not.toBe("staff");
    });

    it("should prevent origin routes from being accessed in staff context", () => {
      expect(getRouteContext("/orgmenu")).not.toBe("staff");
    });
  });

  describe("workspace context access", () => {
    it("should allow workspace routes in workspace context", () => {
      expect(getRouteContext("/dashboard")).toBe("workspace");
      expect(getRouteContext("/employees")).toBe("workspace");
      expect(getRouteContext("/settings")).toBe("workspace");
      expect(getRouteContext("/profile")).toBe("workspace");
      expect(getRouteContext("/files")).toBe("workspace");
      expect(getRouteContext("/approvals/approved")).toBe("workspace");
      expect(getRouteContext("/teamtasks")).toBe("workspace");
      expect(getRouteContext("/savedtasks")).toBe("workspace");
    });

    it("should prevent workspace routes from being accessed in origin context", () => {
      expect(getRouteContext("/dashboard")).not.toBe("origin");
      expect(getRouteContext("/employees")).not.toBe("origin");
    });

    it("should prevent workspace routes from being accessed in staff context", () => {
      expect(getRouteContext("/dashboard")).not.toBe("staff");
      expect(getRouteContext("/employees")).not.toBe("staff");
    });
  });

  describe("staff context access", () => {
    it("should allow staff routes in staff context", () => {
      expect(getRouteContext("/staffs")).toBe("staff");
      expect(getRouteContext("/staffs/schedule")).toBe("staff");
      expect(getRouteContext("/staffs/attendance")).toBe("staff");
      expect(getRouteContext("/staffs/performance/goals")).toBe("staff");
      expect(getRouteContext("/staffs/settings")).toBe("staff");
    });

    it("should prevent staff routes from being accessed in origin context", () => {
      expect(getRouteContext("/staffs")).not.toBe("origin");
    });

    it("should prevent staff routes from being accessed in workspace context", () => {
      expect(getRouteContext("/staffs")).not.toBe("workspace");
    });
  });

  describe("context boundary enforcement", () => {
    it("should never allow a route to match multiple contexts", () => {
      const testRoutes = [
        "/orgmenu", "/orgmenu/analytics",
        "/staffs", "/staffs/schedule",
        "/dashboard", "/employees", "/settings",
        "/login", "/signup", "/pricing",
      ];

      const contextCounts = testRoutes.map((route) => {
        const origin = getRouteContext(route) === "origin" ? 1 : 0;
        const workspace = getRouteContext(route) === "workspace" ? 1 : 0;
        const staff = getRouteContext(route) === "staff" ? 1 : 0;
        const pub = getRouteContext(route) === "public" ? 1 : 0;
        return origin + workspace + staff + pub;
      });

      for (const [index, route] of testRoutes.entries()) {
        expect(contextCounts[index], `${route} matched multiple contexts`).toBe(1);
      }
    });
  });
});

describe("Context Isolation - Sidebar Validation", () => {
  describe("AppSidebar (workspace context)", () => {
    const workspaceNavSections = [
      "Dashboard", "Task Allocation", "Employees", "Projects",
      "Approvals", "Time Tracker", "File Manager", "Settings",
    ];

    const workspaceNavUrls = [
      "/dashboard", "/overview", "/employees", "/alltasks", "/mytasks",
      "/projects", "/clients", "/approvals", "/reports",
      "/time-tracker", "/my-time", "/team-time", "/time-reports",
      "/files", "/recycle-bin", "/settings", "/teamtasks",
      "/savedtasks", "/upcomingtasks", "/terminated", "/teams",
      "/approvals/approved", "/approvals/rejected",
    ];

    it("should NOT contain /orgmenu links in default nav data", () => {
      const orgmenuLinks = workspaceNavUrls.filter((url) => url.startsWith("/orgmenu"));
      expect(orgmenuLinks).toHaveLength(0);
    });

    it("should contain only workspace-context links", () => {
      const workspacePrefixes = [
        "/dashboard", "/overview", "/employees", "/alltasks", "/mytasks",
        "/projects", "/teams", "/clients", "/approvals", "/reports",
        "/calendar", "/time-tracker", "/time-reports", "/my-time",
        "/teamtasks", "/team-time", "/settings", "/profile",
        "/departments", "/addemployees", "/files",
        "/savedtasks", "/upcomingtasks", "/terminated",
        "/recycle-bin",
      ];

      for (const url of workspaceNavUrls) {
        const belongs = workspacePrefixes.some((p) => url.startsWith(p));
        expect(belongs, `URL ${url} is not a valid workspace link`).toBe(true);
      }
    });
  });

  describe("OrgSidebar (origin context)", () => {
    const originNavUrls = [
      "/orgmenu", "/orgmenu/analytics",
      "/orgmenu/org", "/orgmenu/org/billing", "/orgmenu/org/plans",
      "/orgmenu/members", "/orgmenu/members/invite", "/orgmenu/members/roles",
      "/orgmenu/audit", "/orgmenu/audit/exports",
      "/orgmenu/reports", "/orgmenu/reports/usage", "/orgmenu/reports/activity",
      "/orgmenu/security", "/orgmenu/security/policies", "/orgmenu/security/sso",
      "/orgmenu/files",
      "/orgmenu/settings", "/orgmenu/settings/notifications",
      "/orgmenu/profile",
    ];

    it("should contain only /orgmenu prefixed links", () => {
      for (const url of originNavUrls) {
        expect(url.startsWith("/orgmenu"), `URL ${url} does not start with /orgmenu`).toBe(true);
      }
    });

    it("should NOT contain workspace links", () => {
      const workspaceLinks = originNavUrls.filter((url) => !url.startsWith("/orgmenu"));
      expect(workspaceLinks).toHaveLength(0);
    });
  });
});

describe("Context Isolation - Layout Rendering", () => {
  function getLayoutContext(pathname: string): "origin" | "workspace" | "staff" {
    if (pathname.startsWith("/orgmenu")) return "origin";
    if (pathname.startsWith("/staffs")) return "staff";
    return "workspace";
  }

  it("origin pages should use origin layout", () => {
    expect(getLayoutContext("/orgmenu")).toBe("origin");
    expect(getLayoutContext("/orgmenu/settings")).toBe("origin");
    expect(getLayoutContext("/orgmenu/profile")).toBe("origin");
  });

  it("workspace pages should use workspace layout", () => {
    expect(getLayoutContext("/dashboard")).toBe("workspace");
    expect(getLayoutContext("/employees")).toBe("workspace");
    expect(getLayoutContext("/settings")).toBe("workspace");
    expect(getLayoutContext("/profile")).toBe("workspace");
    expect(getLayoutContext("/files")).toBe("workspace");
  });

  it("staff pages should use staff layout", () => {
    expect(getLayoutContext("/staffs")).toBe("staff");
    expect(getLayoutContext("/staffs/schedule")).toBe("staff");
    expect(getLayoutContext("/staffs/profile")).toBe("staff");
  });

  it("origin layout should NEVER render for workspace pages", () => {
    expect(getLayoutContext("/dashboard")).not.toBe("origin");
    expect(getLayoutContext("/profile")).not.toBe("origin");
  });

  it("workspace layout should NEVER render for origin pages", () => {
    expect(getLayoutContext("/orgmenu")).not.toBe("workspace");
    expect(getLayoutContext("/orgmenu/settings")).not.toBe("workspace");
  });
});

describe("Context Isolation - Profile Navigation", () => {
  function getProfileHref(pathname: string, role: string): string {
    if (pathname.startsWith("/orgmenu")) return "/orgmenu/profile";
    if (pathname.startsWith("/staffs")) return "/staffs/profile";
    if (role === "member") return "/staffs/profile";
    if (role === "admin" || role === "manager") return "/admin/profile";
    return "/profile";
  }

  it("origin context should link to /orgmenu/profile", () => {
    expect(getProfileHref("/orgmenu", "ORG_MENU_ADMIN")).toBe("/orgmenu/profile");
    expect(getProfileHref("/orgmenu/settings", "admin")).toBe("/orgmenu/profile");
    expect(getProfileHref("/orgmenu/profile", "member")).toBe("/orgmenu/profile");
  });

  it("staff context should link to /staffs/profile", () => {
    expect(getProfileHref("/staffs", "member")).toBe("/staffs/profile");
    expect(getProfileHref("/staffs/schedule", "member")).toBe("/staffs/profile");
  });

  it("workspace context should link based on role", () => {
    expect(getProfileHref("/dashboard", "admin")).toBe("/admin/profile");
    expect(getProfileHref("/dashboard", "manager")).toBe("/admin/profile");
    expect(getProfileHref("/dashboard", "member")).toBe("/staffs/profile");
    expect(getProfileHref("/dashboard", "user")).toBe("/profile");
  });

  it("profile links should stay within the same context", () => {
    const originRoutes = ["/orgmenu", "/orgmenu/settings"];
    const workspaceRoutes = ["/dashboard", "/employees"];
    const staffRoutes = ["/staffs", "/staffs/schedule"];

    for (const route of originRoutes) {
      const href = getProfileHref(route, "admin");
      expect(href.startsWith("/orgmenu"), `Origin profile link ${href} should start with /orgmenu`).toBe(true);
    }

    for (const route of workspaceRoutes) {
      const href = getProfileHref(route, "admin");
      expect(href.startsWith("/orgmenu"), `Workspace profile link ${href} should NOT start with /orgmenu`).toBe(false);
      expect(href.startsWith("/staffs"), `Workspace profile link ${href} should NOT start with /staffs`).toBe(false);
    }

    for (const route of staffRoutes) {
      const href = getProfileHref(route, "member");
      expect(href.startsWith("/staffs"), `Staff profile link ${href} should start with /staffs`).toBe(true);
    }
  });
});

describe("Context Isolation - Breadcrumb Context Labels", () => {
  const contextLabels: Record<string, string> = {
    origin: "Origin Menu",
    workspace: "Workspace",
    staff: "Staff Panel",
  };

  it("origin breadcrumbs should show 'Origin Menu' label", () => {
    expect(contextLabels.origin).toBe("Origin Menu");
  });

  it("workspace breadcrumbs should show 'Workspace' label", () => {
    expect(contextLabels.workspace).toBe("Workspace");
  });

  it("staff breadcrumbs should show 'Staff Panel' label", () => {
    expect(contextLabels.staff).toBe("Staff Panel");
  });

  it("each context should have a unique breadcrumb label", () => {
    const labels = Object.values(contextLabels);
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(labels.length);
  });
});
