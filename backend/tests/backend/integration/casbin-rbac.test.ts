import { enforce, buildFileResource, buildFolderResource, resetEnforcer } from "../../../src/config/casbin.js";

describe("Casbin RBAC", () => {
  beforeEach(async () => {
    await resetEnforcer();
  });

  describe("buildFileResource", () => {
    it("returns client scope for clientId", () => {
      const res = buildFileResource({ clientId: "c1" });
      expect(res).toBe(":client_file");
    });

    it("returns project scope for projectId", () => {
      const res = buildFileResource({ projectId: "p1" });
      expect(res).toBe(":project_file");
    });

    it("returns org scope for orgId", () => {
      const res = buildFileResource({ orgId: "o1" });
      expect(res).toBe(":org_file");
    });

    it("returns wildcard when no scope params", () => {
      const res = buildFileResource({});
      expect(res).toBe("*:file");
    });

    it("uses explicit scope over auto-detection", () => {
      const res = buildFileResource({ scope: ":shared_file", clientId: "c1" });
      expect(res).toBe(":shared_file");
    });
  });

  describe("buildFolderResource", () => {
    it("returns client scope for clientId", () => {
      expect(buildFolderResource({ clientId: "c1" })).toBe(":client_folder");
    });

    it("returns project scope for projectId", () => {
      expect(buildFolderResource({ projectId: "p1" })).toBe(":project_folder");
    });

    it("returns org scope for orgId", () => {
      expect(buildFolderResource({ orgId: "o1" })).toBe(":org_folder");
    });
  });

  describe("enforce", () => {
    it("org_admin can view any file", async () => {
      const allowed = await enforce("org_admin", "*:file", "view");
      expect(allowed).toBe(true);
    });

    it("org_admin can upload any file", async () => {
      const allowed = await enforce("org_admin", "*:file", "upload");
      expect(allowed).toBe(true);
    });

    it("org_admin can delete any file", async () => {
      const allowed = await enforce("org_admin", "*:file", "delete");
      expect(allowed).toBe(true);
    });

    it("org_admin can view any file", async () => {
      const allowed = await enforce("org_admin", "*:file", "view");
      expect(allowed).toBe(true);
    });

    it("org_admin can upload any file", async () => {
      const allowed = await enforce("org_admin", "*:file", "upload");
      expect(allowed).toBe(true);
    });

    it("members can view org files", async () => {
      const allowed = await enforce("members", ":org_file", "view");
      expect(allowed).toBe(true);
    });

    it("members can view project files via role hierarchy", async () => {
      const allowed = await enforce("members", ":project_file", "view");
      expect(allowed).toBe(true);
    });

    it("staffs can view project files", async () => {
      const allowed = await enforce("staffs", ":project_file", "view");
      expect(allowed).toBe(true);
    });

    it("staffs cannot delete project files", async () => {
      const allowed = await enforce("staffs", ":project_file", "delete");
      expect(allowed).toBe(false);
    });

    it("staffs cannot view org files", async () => {
      const allowed = await enforce("staffs", ":org_file", "view");
      expect(allowed).toBe(false);
    });

    it("clients can view client files", async () => {
      const allowed = await enforce("clients", ":client_file", "view");
      expect(allowed).toBe(true);
    });

    it("clients cannot view project files", async () => {
      const allowed = await enforce("clients", ":project_file", "view");
      expect(allowed).toBe(false);
    });

    it("guest can view shared files", async () => {
      const allowed = await enforce("guest", ":shared_file", "view");
      expect(allowed).toBe(true);
    });

    it("guest cannot view org files", async () => {
      const allowed = await enforce("guest", ":org_file", "view");
      expect(allowed).toBe(false);
    });

    it("staffs inherits staffs permissions via role hierarchy", async () => {
      const allowed = await enforce("staffs", ":project_file", "view");
      expect(allowed).toBe(true);
    });

    it("members can share files", async () => {
      const allowed = await enforce("members", ":project_file", "share");
      expect(allowed).toBe(true);
    });

    it("staffs cannot share files", async () => {
      const allowed = await enforce("staffs", ":project_file", "share");
      expect(allowed).toBe(false);
    });

    it("members can delete project files", async () => {
      const allowed = await enforce("members", ":project_file", "delete");
      expect(allowed).toBe(true);
    });

    it("hr can view any file", async () => {
      const allowed = await enforce("hr", "*:file", "view");
      expect(allowed).toBe(true);
    });

    it("hr can upload any file", async () => {
      const allowed = await enforce("hr", "*:file", "upload");
      expect(allowed).toBe(true);
    });

    it("members can view org folders", async () => {
      const allowed = await enforce("members", ":org_folder", "view");
      expect(allowed).toBe(true);
    });

    it("staffs can view project folders", async () => {
      const allowed = await enforce("staffs", ":project_folder", "view");
      expect(allowed).toBe(true);
    });

    it("staffs cannot create org folders", async () => {
      const allowed = await enforce("staffs", ":org_folder", "create");
      expect(allowed).toBe(false);
    });

    it("unknown role is denied", async () => {
      const allowed = await enforce("unknown_role", "*:file", "view");
      expect(allowed).toBe(false);
    });

    it("org_admin inherits org_admin permissions", async () => {
      const allowed = await enforce("org_admin", ":org_file", "view");
      expect(allowed).toBe(true);
    });
  });
});
