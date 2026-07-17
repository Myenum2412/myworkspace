import { newEnforcer, Enforcer } from "casbin";
import path from "path";
import { fileURLToPath } from "url";
import { buildFileResource, buildFolderResource } from "../../../src/config/casbin.js";

const _dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = path.resolve(_dirname, "../../../src/config");

let enforcer: Enforcer;

beforeAll(async () => {
  const modelPath = path.join(CONFIG_DIR, "rbac-model.conf");
  const policyPath = path.join(CONFIG_DIR, "casbin-policies.csv");
  enforcer = await newEnforcer(modelPath, policyPath);
});

describe("Casbin policy evaluation in isolation", () => {
  describe("super_admin", () => {
    const role = "super_admin";

    it("can view any file", async () => {
      expect(await enforcer.enforce(role, "*:file", "view")).toBe(true);
    });

    it("can delete any file", async () => {
      expect(await enforcer.enforce(role, "*:file", "delete")).toBe(true);
    });

    it("can view any folder", async () => {
      expect(await enforcer.enforce(role, "*:folder", "view")).toBe(true);
    });

    it("can create any folder", async () => {
      expect(await enforcer.enforce(role, "*:folder", "create")).toBe(true);
    });

    it("can resume uploads", async () => {
      expect(await enforcer.enforce(role, "*:upload", "resume")).toBe(true);
    });

    it("can cancel uploads", async () => {
      expect(await enforcer.enforce(role, "*:upload", "cancel")).toBe(true);
    });
  });

  describe("org_admin", () => {
    const role = "org_admin";

    it("can view any file", async () => {
      expect(await enforcer.enforce(role, "*:file", "view")).toBe(true);
    });

    it("can delete any file", async () => {
      expect(await enforcer.enforce(role, "*:file", "delete")).toBe(true);
    });

    it("can create folders", async () => {
      expect(await enforcer.enforce(role, "*:folder", "create")).toBe(true);
    });
  });

  describe("gen_admin", () => {
    const role = "gen_admin";

    it("can view org-scoped file", async () => {
      expect(await enforcer.enforce(role, ":org_file", "view")).toBe(true);
    });

    it("can upload org-scoped file", async () => {
      expect(await enforcer.enforce(role, ":org_file", "upload")).toBe(true);
    });

    it("can delete project-scoped file (via RBAC hierarchy: gen_admin -> branch_manager -> project_manager)", async () => {
      expect(await enforcer.enforce(role, ":project_file", "delete")).toBe(true);
    });

    it("cannot view client-scoped file", async () => {
      expect(await enforcer.enforce(role, ":client_file", "view")).toBe(false);
    });
  });

  describe("project_manager", () => {
    const role = "project_manager";

    it("can view project-scoped file", async () => {
      expect(await enforcer.enforce(role, ":project_file", "view")).toBe(true);
    });

    it("can delete project-scoped file", async () => {
      expect(await enforcer.enforce(role, ":project_file", "delete")).toBe(true);
    });

    it("cannot view org-level file", async () => {
      expect(await enforcer.enforce(role, ":org_file", "view")).toBe(false);
    });

    it("cannot delete org-level file", async () => {
      expect(await enforcer.enforce(role, ":org_file", "delete")).toBe(false);
    });

    it("cannot view client-scoped file", async () => {
      expect(await enforcer.enforce(role, ":client_file", "view")).toBe(false);
    });
  });

  describe("staff", () => {
    const role = "staff";

    it("can view project-scoped file", async () => {
      expect(await enforcer.enforce(role, ":project_file", "view")).toBe(true);
    });

    it("can upload project-scoped file", async () => {
      expect(await enforcer.enforce(role, ":project_file", "upload")).toBe(true);
    });

    it("cannot delete project-scoped file", async () => {
      expect(await enforcer.enforce(role, ":project_file", "delete")).toBe(false);
    });

    it("cannot edit project-scoped file", async () => {
      expect(await enforcer.enforce(role, ":project_file", "edit")).toBe(false);
    });
  });

  describe("client", () => {
    const role = "client";

    it("can view client-scoped file", async () => {
      expect(await enforcer.enforce(role, ":client_file", "view")).toBe(true);
    });

    it("cannot view org-scoped file", async () => {
      expect(await enforcer.enforce(role, ":org_file", "view")).toBe(false);
    });

    it("cannot view project-scoped folder", async () => {
      expect(await enforcer.enforce(role, ":project_folder", "view")).toBe(false);
    });
  });

  describe("guest", () => {
    const role = "guest";

    it("can view shared file", async () => {
      expect(await enforcer.enforce(role, ":shared_file", "view")).toBe(true);
    });

    it("can download shared file", async () => {
      expect(await enforcer.enforce(role, ":shared_file", "download")).toBe(true);
    });

    it("cannot upload", async () => {
      expect(await enforcer.enforce(role, ":org_file", "upload")).toBe(false);
    });

    it("cannot delete", async () => {
      expect(await enforcer.enforce(role, ":org_file", "delete")).toBe(false);
    });
  });

  describe("deny-by-default", () => {
    const roles = ["super_admin", "org_admin", "gen_admin", "project_manager", "staff", "client", "guest"];

    it("no role can access unknown action", async () => {
      for (const role of roles) {
        expect(await enforcer.enforce(role, "*:file", "sudo")).toBe(false);
        expect(await enforcer.enforce(role, ":org_file", "sudo")).toBe(false);
      }
    });

    it("no role can access unknown resource", async () => {
      for (const role of roles) {
        expect(await enforcer.enforce(role, "*:database", "view")).toBe(false);
        expect(await enforcer.enforce(role, ":admin_panel", "view")).toBe(false);
      }
    });

    it("unknown role gets no permissions", async () => {
      expect(await enforcer.enforce("hacker", "*:file", "view")).toBe(false);
      expect(await enforcer.enforce("hacker", ":org_file", "delete")).toBe(false);
    });
  });

  describe("role hierarchy (RBAC inheritance)", () => {
    it("super_admin inherits org_admin permissions", async () => {
      const roles = await enforcer.getRolesForUser("super_admin");
      expect(roles).toContain("org_admin");
    });

    it("org_admin inherits gen_admin permissions", async () => {
      const roles = await enforcer.getRolesForUser("org_admin");
      expect(roles).toContain("gen_admin");
    });

    it("project_manager inherits team_leader permissions", async () => {
      const roles = await enforcer.getRolesForUser("project_manager");
      expect(roles).toContain("team_leader");
    });

    it("full RBAC chain is correct", async () => {
      const superAdminRoles = await enforcer.getRolesForUser("super_admin");
      expect(superAdminRoles).toContain("org_admin");

      const orgAdminRoles = await enforcer.getRolesForUser("org_admin");
      expect(orgAdminRoles).toContain("gen_admin");

      const genAdminRoles = await enforcer.getRolesForUser("gen_admin");
      expect(genAdminRoles).toContain("branch_manager");

      const branchMgrRoles = await enforcer.getRolesForUser("branch_manager");
      expect(branchMgrRoles).toContain("project_manager");

      const projMgrRoles = await enforcer.getRolesForUser("project_manager");
      expect(projMgrRoles).toContain("team_leader");

      const teamLeaderRoles = await enforcer.getRolesForUser("team_leader");
      expect(teamLeaderRoles).toContain("staff");
    });

    it("staff inherits no further roles", async () => {
      const roles = await enforcer.getRolesForUser("staff");
      expect(roles).toHaveLength(0);
    });
  });
});

describe("buildFileResource", () => {
  it("returns :org_file when orgId is provided", () => {
    expect(buildFileResource({ orgId: "org-1" })).toBe(":org_file");
  });

  it("returns :project_file when projectId is provided", () => {
    expect(buildFileResource({ projectId: "proj-1" })).toBe(":project_file");
  });

  it("returns :client_file when clientId is provided", () => {
    expect(buildFileResource({ clientId: "client-1" })).toBe(":client_file");
  });

  it("returns *:file when nothing is provided", () => {
    expect(buildFileResource({})).toBe("*:file");
  });

  it("prioritizes scope over other params", () => {
    expect(buildFileResource({ scope: ":custom_scope", orgId: "org-1" })).toBe(":custom_scope");
  });

  it("prioritizes clientId over projectId and orgId", () => {
    expect(buildFileResource({ orgId: "org-1", projectId: "proj-1", clientId: "client-1" })).toBe(":client_file");
  });

  it("prioritizes projectId over orgId", () => {
    expect(buildFileResource({ orgId: "org-1", projectId: "proj-1" })).toBe(":project_file");
  });
});

describe("buildFolderResource", () => {
  it("returns :org_folder when orgId is provided", () => {
    expect(buildFolderResource({ orgId: "org-1" })).toBe(":org_folder");
  });

  it("returns :project_folder when projectId is provided", () => {
    expect(buildFolderResource({ projectId: "proj-1" })).toBe(":project_folder");
  });

  it("returns :client_folder when clientId is provided", () => {
    expect(buildFolderResource({ clientId: "client-1" })).toBe(":client_folder");
  });

  it("returns *:folder when nothing is provided", () => {
    expect(buildFolderResource({})).toBe("*:folder");
  });
});
