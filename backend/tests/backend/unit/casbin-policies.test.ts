import { newEnforcer, Enforcer } from "casbin";
import path from "path";
import { fileURLToPath } from "url";
import { buildFileResource, buildFolderResource } from "../../../src/config/casbin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_DIR = path.resolve(__dirname, "../../../src/config");

let enforcer: Enforcer;

beforeAll(async () => {
  const modelPath = path.join(CONFIG_DIR, "rbac-model.conf");
  const policyPath = path.join(CONFIG_DIR, "casbin-policies.csv");
  enforcer = await newEnforcer(modelPath, policyPath);
});

describe("Casbin policy evaluation in isolation", () => {
  describe("org_admin", () => {
    const role = "org_admin";

    it("can view org-scoped file (inherited from members)", async () => {
      expect(await enforcer.enforce(role, ":org_file", "view")).toBe(true);
    });

    it("can delete org-scoped file (inherited from members)", async () => {
      expect(await enforcer.enforce(role, ":org_file", "delete")).toBe(true);
    });

    it("can view org-scoped folder (inherited from members)", async () => {
      expect(await enforcer.enforce(role, ":org_folder", "view")).toBe(true);
    });

    it("can create org-scoped folder (inherited from members)", async () => {
      expect(await enforcer.enforce(role, ":org_folder", "create")).toBe(true);
    });

    it("can resume org-scoped uploads (inherited from members)", async () => {
      expect(await enforcer.enforce(role, ":org_upload", "resume")).toBe(true);
    });

    it("can cancel org-scoped uploads (inherited from members)", async () => {
      expect(await enforcer.enforce(role, ":org_upload", "cancel")).toBe(true);
    });

    it("cannot access wildcard resources (wildcard policies removed for security)", async () => {
      expect(await enforcer.enforce(role, "*:file", "view")).toBe(false);
    });
  });

  describe("members", () => {
    const role = "members";

    it("can view org-scoped file", async () => {
      expect(await enforcer.enforce(role, ":org_file", "view")).toBe(true);
    });

    it("can upload org-scoped file", async () => {
      expect(await enforcer.enforce(role, ":org_file", "upload")).toBe(true);
    });

    it("can delete project-scoped file (via RBAC hierarchy: org_admin -> members -> staffs)", async () => {
      expect(await enforcer.enforce(role, ":project_file", "delete")).toBe(true);
    });

    it("cannot view client-scoped file", async () => {
      expect(await enforcer.enforce(role, ":client_file", "view")).toBe(false);
    });
  });

  describe("members", () => {
    const role = "members";

    it("can view org-scoped file", async () => {
      expect(await enforcer.enforce(role, ":org_file", "view")).toBe(true);
    });

    it("can delete org-scoped file", async () => {
      expect(await enforcer.enforce(role, ":org_file", "delete")).toBe(true);
    });

    it("can view project-scoped file (inherited from staffs)", async () => {
      expect(await enforcer.enforce(role, ":project_file", "view")).toBe(true);
    });

    it("can delete project-scoped file (inherited from staffs)", async () => {
      expect(await enforcer.enforce(role, ":project_file", "delete")).toBe(true);
    });

    it("cannot view client-scoped file", async () => {
      expect(await enforcer.enforce(role, ":client_file", "view")).toBe(false);
    });
  });

  describe("staffs", () => {
    const role = "staffs";

    it("can view project-scoped file", async () => {
      expect(await enforcer.enforce(role, ":project_file", "view")).toBe(true);
    });

    it("can upload project-scoped file", async () => {
      expect(await enforcer.enforce(role, ":project_file", "upload")).toBe(true);
    });

    it("can edit project-scoped file", async () => {
      expect(await enforcer.enforce(role, ":project_file", "edit")).toBe(true);
    });

    it("can delete project-scoped file", async () => {
      expect(await enforcer.enforce(role, ":project_file", "delete")).toBe(true);
    });

    it("cannot view org-scoped file", async () => {
      expect(await enforcer.enforce(role, ":org_file", "view")).toBe(false);
    });
  });

  describe("clients", () => {
    const role = "clients";

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
    const roles = ["org_admin", "org_admin", "members", "members", "staffs", "clients", "guest"];

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
    it("org_admin inherits members permissions", async () => {
      const roles = await enforcer.getRolesForUser("org_admin");
      expect(roles).toContain("members");
    });

    it("members inherits manager, hr, and finance permissions", async () => {
      const roles = await enforcer.getRolesForUser("members");
      expect(roles).toContain("manager");
      expect(roles).toContain("hr");
      expect(roles).toContain("finance");
    });

    it("manager inherits team_leader permissions", async () => {
      const roles = await enforcer.getRolesForUser("manager");
      expect(roles).toContain("team_leader");
    });

    it("team_leader inherits staffs permissions", async () => {
      const roles = await enforcer.getRolesForUser("team_leader");
      expect(roles).toContain("staffs");
    });

    it("full RBAC chain is correct", async () => {
      const orgAdminRoles = await enforcer.getRolesForUser("org_admin");
      expect(orgAdminRoles).toContain("members");

      const membersRoles = await enforcer.getRolesForUser("members");
      expect(membersRoles).toContain("manager");
      expect(membersRoles).toContain("hr");
      expect(membersRoles).toContain("finance");

      const managerRoles = await enforcer.getRolesForUser("manager");
      expect(managerRoles).toContain("team_leader");

      const teamLeaderRoles = await enforcer.getRolesForUser("team_leader");
      expect(teamLeaderRoles).toContain("staffs");

      const staffsRoles = await enforcer.getRolesForUser("staffs");
      expect(staffsRoles).toHaveLength(0);
    });

    it("staffs inherits no further roles", async () => {
      const roles = await enforcer.getRolesForUser("staffs");
      expect(roles).toHaveLength(0);
    });

    it("hr inherits no further roles", async () => {
      const roles = await enforcer.getRolesForUser("hr");
      expect(roles).toHaveLength(0);
    });

    it("finance inherits no further roles", async () => {
      const roles = await enforcer.getRolesForUser("finance");
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
