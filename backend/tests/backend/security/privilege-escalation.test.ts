import { enforce } from "../../../src/config/casbin.js";
import { ROLES, getEffectivePermissions } from "../../../src/lib/rbac/index.js";

describe("Privilege Escalation Security Tests", () => {
  describe("Vertical privilege escalation prevention", () => {
    it("staffs cannot access org_admin resources", async () => {
      const checks = await Promise.all([
        enforce(ROLES.STAFFS, ":org_file", "delete"),
        enforce(ROLES.STAFFS, ":org_folder", "delete"),
        enforce(ROLES.STAFFS, ":org_upload", "cancel"),
      ]);
      expect(checks).toEqual([false, false, false]);
    });

    it("hr cannot access org_admin resources", async () => {
      const checks = await Promise.all([
        enforce(ROLES.HR, ":org_file", "delete"),
        enforce(ROLES.HR, ":org_folder", "delete"),
      ]);
      expect(checks).toEqual([false, false]);
    });

    it("clients cannot access staff resources", async () => {
      const checks = await Promise.all([
        enforce(ROLES.CLIENTS, ":project_file", "view"),
        enforce(ROLES.CLIENTS, ":project_file", "edit"),
        enforce(ROLES.CLIENTS, ":project_file", "delete"),
      ]);
      expect(checks).toEqual([false, false, false]);
    });

    it("guest cannot access any authenticated resources", async () => {
      const checks = await Promise.all([
        enforce("guest", ":org_file", "view"),
        enforce("guest", ":project_file", "view"),
        enforce("guest", ":client_file", "view"),
        enforce("guest", ":org_file", "upload"),
      ]);
      expect(checks).toEqual([false, false, false, false]);
    });
  });

  describe("Horizontal privilege escalation prevention", () => {
    it("different orgs have separate permission scopes", async () => {
      // User A has org_file access
      const userAAllowed = await enforce(ROLES.MEMBERS, ":org_file", "view");
      expect(userAAllowed).toBe(true);

      // User B cannot access User A's org resources via project scope
      const userBAllowed = await enforce(ROLES.STAFFS, ":org_file", "view");
      expect(userBAllowed).toBe(false);
    });

    it("clients cannot access other clients' files", async () => {
      // Client A has client_file access
      const clientAAllowed = await enforce(ROLES.CLIENTS, ":client_file", "view");
      expect(clientAAllowed).toBe(true);

      // But client cannot access project or org files
      const checks = await Promise.all([
        enforce(ROLES.CLIENTS, ":project_file", "view"),
        enforce(ROLES.CLIENTS, ":org_file", "view"),
      ]);
      expect(checks).toEqual([false, false]);
    });
  });

  describe("Wildcard permission prevention", () => {
    it("org_admin cannot access wildcard resources", async () => {
      const checks = await Promise.all([
        enforce(ROLES.ORG_ADMIN, "*:file", "view"),
        enforce(ROLES.ORG_ADMIN, "*:file", "delete"),
        enforce(ROLES.ORG_ADMIN, "*:folder", "view"),
        enforce(ROLES.ORG_ADMIN, "*:upload", "view"),
      ]);
      expect(checks).toEqual([false, false, false, false]);
    });

    it("members cannot access wildcard resources", async () => {
      const checks = await Promise.all([
        enforce(ROLES.MEMBERS, "*:file", "view"),
        enforce(ROLES.MEMBERS, "*:file", "delete"),
      ]);
      expect(checks).toEqual([false, false]);
    });
  });

  describe("Role permission boundary validation", () => {
    it("staffs have only project-level permissions", async () => {
      const staffsPerms = getEffectivePermissions(ROLES.STAFFS);

      // Should not have manage permissions
      expect(staffsPerms).not.toContain("manage:workspaces");
      expect(staffsPerms).not.toContain("manage:projects");
      expect(staffsPerms).not.toContain("manage:staff");
      expect(staffsPerms).not.toContain("manage:billing");
      expect(staffsPerms).not.toContain("manage:settings");

      // Should have access permissions
      expect(staffsPerms).toContain("access:tasks");
      expect(staffsPerms).toContain("access:files");
    });

    it("hr has only HR-related permissions", async () => {
      const hrPerms = getEffectivePermissions(ROLES.HR);

      // Should have HR permissions
      expect(hrPerms).toContain("manage:employees");
      expect(hrPerms).toContain("manage:attendance");
      expect(hrPerms).toContain("manage:leave");

      // Should not have admin permissions
      expect(hrPerms).not.toContain("manage:billing");
      expect(hrPerms).not.toContain("manage:settings");
      expect(hrPerms).not.toContain("manage:permissions");
    });

    it("finance has only finance-related permissions", async () => {
      const financePerms = getEffectivePermissions(ROLES.FINANCE);

      // Should have finance permissions
      expect(financePerms).toContain("manage:billing");
      expect(financePerms).toContain("manage:invoices");

      // Should not have admin permissions
      expect(financePerms).not.toContain("manage:staff");
      expect(financePerms).not.toContain("manage:settings");
      expect(financePerms).not.toContain("manage:permissions");
    });

    it("clients have only portal permissions", async () => {
      const clientPerms = getEffectivePermissions(ROLES.CLIENTS);

      // Should have portal permissions
      expect(clientPerms).toContain("access:portal");
      expect(clientPerms).toContain("access:projects");

      // Should not have admin permissions
      expect(clientPerms).not.toContain("manage:workspaces");
      expect(clientPerms).not.toContain("manage:projects");
      expect(clientPerms).not.toContain("manage:staff");
    });

    it("org_admin has all management permissions", async () => {
      const adminPerms = getEffectivePermissions(ROLES.ORG_ADMIN);

      // Should have all management permissions
      expect(adminPerms).toContain("manage:workspaces");
      expect(adminPerms).toContain("manage:projects");
      expect(adminPerms).toContain("manage:staff");
      expect(adminPerms).toContain("manage:billing");
      expect(adminPerms).toContain("manage:settings");
      expect(adminPerms).toContain("manage:permissions");

      // Should have platform permissions
      expect(adminPerms).toContain("manage:organizations");
      expect(adminPerms).toContain("manage:subscriptions");
      expect(adminPerms).toContain("manage:audit-logs");
    });
  });

  describe("IDOR prevention", () => {
    it("resource access requires correct scope", async () => {
      // Staff can view project files
      const staffProjectAllowed = await enforce(ROLES.STAFFS, ":project_file", "view");
      expect(staffProjectAllowed).toBe(true);

      // Staff cannot view org files (different scope)
      const staffOrgAllowed = await enforce(ROLES.STAFFS, ":org_file", "view");
      expect(staffOrgAllowed).toBe(false);
    });

    it("upload scope cannot be manipulated", async () => {
      // Staff can view project uploads
      const staffProjectAllowed = await enforce(ROLES.STAFFS, ":project_upload", "view");
      expect(staffProjectAllowed).toBe(true);

      // Staff cannot view org uploads (different scope)
      const staffOrgAllowed = await enforce(ROLES.STAFFS, ":org_upload", "view");
      expect(staffOrgAllowed).toBe(false);
    });

    it("folder access requires correct scope", async () => {
      // Staff can view project folders
      const staffProjectAllowed = await enforce(ROLES.STAFFS, ":project_folder", "view");
      expect(staffProjectAllowed).toBe(true);

      // Staff cannot view org folders
      const staffOrgAllowed = await enforce(ROLES.STAFFS, ":org_folder", "view");
      expect(staffOrgAllowed).toBe(false);
    });
  });
});
