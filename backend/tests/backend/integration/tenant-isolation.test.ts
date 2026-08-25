import { enforce } from "../../../src/config/casbin.js";
import { ROLES } from "../../../src/lib/rbac/index.js";

describe("Tenant Isolation Integration Tests", () => {
  describe("Cross-tenant file access prevention", () => {
    it("staffs cannot access org-scoped files", async () => {
      const allowed = await enforce(ROLES.STAFFS, ":org_file", "view");
      expect(allowed).toBe(false);
    });

    it("clients cannot access project-scoped files", async () => {
      const allowed = await enforce(ROLES.CLIENTS, ":project_file", "view");
      expect(allowed).toBe(false);
    });

    it("clients cannot access org-scoped files", async () => {
      const allowed = await enforce(ROLES.CLIENTS, ":org_file", "view");
      expect(allowed).toBe(false);
    });

    it("hr cannot access project-scoped files (only org-scoped)", async () => {
      const allowed = await enforce(ROLES.HR, ":project_file", "view");
      expect(allowed).toBe(false);
    });

    it("guest cannot access org-scoped files", async () => {
      const allowed = await enforce("guest", ":org_file", "view");
      expect(allowed).toBe(false);
    });

    it("guest cannot access project-scoped files", async () => {
      const allowed = await enforce("guest", ":project_file", "view");
      expect(allowed).toBe(false);
    });
  });

  describe("Role-based resource scoping", () => {
    it("org_admin can access org-scoped files (via members inheritance)", async () => {
      const allowed = await enforce(ROLES.ORG_ADMIN, ":org_file", "view");
      expect(allowed).toBe(true);
    });

    it("members can access org-scoped files", async () => {
      const allowed = await enforce(ROLES.MEMBERS, ":org_file", "view");
      expect(allowed).toBe(true);
    });

    it("manager can access org-scoped files", async () => {
      const allowed = await enforce(ROLES.MANAGER, ":org_file", "view");
      expect(allowed).toBe(true);
    });

    it("staffs can access project-scoped files", async () => {
      const allowed = await enforce(ROLES.STAFFS, ":project_file", "view");
      expect(allowed).toBe(true);
    });

    it("team_leader can access project-scoped files", async () => {
      const allowed = await enforce(ROLES.TEAM_LEADER, ":project_file", "view");
      expect(allowed).toBe(true);
    });

    it("clients can access client-scoped files", async () => {
      const allowed = await enforce(ROLES.CLIENTS, ":client_file", "view");
      expect(allowed).toBe(true);
    });

    it("guest can access shared files", async () => {
      const allowed = await enforce("guest", ":shared_file", "view");
      expect(allowed).toBe(true);
    });
  });

  describe("Privilege escalation prevention", () => {
    it("staffs cannot delete org-scoped files", async () => {
      const allowed = await enforce(ROLES.STAFFS, ":org_file", "delete");
      expect(allowed).toBe(false);
    });

    it("clients cannot delete any files", async () => {
      const checks = await Promise.all([
        enforce(ROLES.CLIENTS, ":client_file", "delete"),
        enforce(ROLES.CLIENTS, ":project_file", "delete"),
        enforce(ROLES.CLIENTS, ":org_file", "delete"),
      ]);
      expect(checks).toEqual([false, false, false]);
    });

    it("guest cannot upload files", async () => {
      const checks = await Promise.all([
        enforce("guest", ":shared_file", "upload"),
        enforce("guest", ":org_file", "upload"),
        enforce("guest", ":project_file", "upload"),
      ]);
      expect(checks).toEqual([false, false, false]);
    });

    it("hr cannot delete org-scoped files", async () => {
      const allowed = await enforce(ROLES.HR, ":org_file", "delete");
      expect(allowed).toBe(false);
    });

    it("finance cannot upload org-scoped files", async () => {
      const allowed = await enforce(ROLES.FINANCE, ":org_file", "upload");
      expect(allowed).toBe(false);
    });
  });

  describe("Deny-by-default", () => {
    it("unknown role gets no permissions", async () => {
      const checks = await Promise.all([
        enforce("unknown_role", ":org_file", "view"),
        enforce("unknown_role", ":project_file", "view"),
        enforce("unknown_role", ":client_file", "view"),
        enforce("unknown_role", ":shared_file", "view"),
      ]);
      expect(checks).toEqual([false, false, false, false]);
    });

    it("no role can access unknown resource", async () => {
      const roles = [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.STAFFS, ROLES.HR, ROLES.CLIENTS];
      for (const role of roles) {
        const allowed = await enforce(role, ":database", "view");
        expect(allowed).toBe(false);
      }
    });

    it("no role can use unknown action", async () => {
      const roles = [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.STAFFS, ROLES.HR, ROLES.CLIENTS];
      for (const role of roles) {
        const allowed = await enforce(role, ":org_file", "sudo");
        expect(allowed).toBe(false);
      }
    });
  });

  describe("Role hierarchy inheritance", () => {
    it("org_admin inherits members permissions", async () => {
      // members can view org_file, so org_admin should too
      const membersAllowed = await enforce(ROLES.MEMBERS, ":org_file", "view");
      const orgAdminAllowed = await enforce(ROLES.ORG_ADMIN, ":org_file", "view");
      expect(orgAdminAllowed).toBe(membersAllowed);
    });

    it("manager inherits team_leader permissions", async () => {
      // team_leader can view project_file
      const teamLeaderAllowed = await enforce(ROLES.TEAM_LEADER, ":project_file", "view");
      const managerAllowed = await enforce(ROLES.MANAGER, ":project_file", "view");
      expect(managerAllowed).toBe(teamLeaderAllowed);
    });

    it("members inherits staffs permissions", async () => {
      // staffs can view project_file
      const staffsAllowed = await enforce(ROLES.STAFFS, ":project_file", "view");
      const membersAllowed = await enforce(ROLES.MEMBERS, ":project_file", "view");
      expect(membersAllowed).toBe(staffsAllowed);
    });
  });

  describe("Upload scope isolation", () => {
    it("staffs can view project uploads", async () => {
      const allowed = await enforce(ROLES.STAFFS, ":project_upload", "view");
      expect(allowed).toBe(true);
    });

    it("staffs cannot view org uploads", async () => {
      const allowed = await enforce(ROLES.STAFFS, ":org_upload", "view");
      expect(allowed).toBe(false);
    });

    it("members can view org uploads", async () => {
      const allowed = await enforce(ROLES.MEMBERS, ":org_upload", "view");
      expect(allowed).toBe(true);
    });

    it("clients cannot view any uploads", async () => {
      const checks = await Promise.all([
        enforce(ROLES.CLIENTS, ":org_upload", "view"),
        enforce(ROLES.CLIENTS, ":project_upload", "view"),
        enforce(ROLES.CLIENTS, ":client_upload", "view"),
      ]);
      expect(checks).toEqual([false, false, false]);
    });
  });
});
