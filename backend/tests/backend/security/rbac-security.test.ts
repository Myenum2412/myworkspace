import { Response, NextFunction } from "express";
import { enforce, buildFileResource, buildFolderResource, resetEnforcer } from "../../../src/config/casbin.js";
import {
  ROLES, isAdminRole, isPlatformRole, hasRole, hasAnyRole,
  getEffectivePermissions, ADMIN_ROLES, PLATFORM_ROLES,
} from "../../../src/lib/rbac/index.js";
import { authorizeRole, orgAdminOnly, membersOnly } from "../../../src/middleware/authorize.js";
import { verifyOwnership } from "../../../src/middleware/ownership.js";
import { resolveOrgContext, requireOrgContext } from "../../../src/middleware/org-context.js";
import type { AuthRequest, JwtPayload } from "../../../src/types/index.js";

jest.mock("../../../src/services/audit.service.js", () => ({
  recordAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../../src/lib/db/models/OrgMember.js", () => ({
  OrgMember: { findOne: jest.fn() },
}));

import { recordAuditLog } from "../../../src/services/audit.service.js";
import { OrgMember } from "../../../src/lib/db/models/OrgMember.js";

function mockReq(overrides?: Partial<AuthRequest>): AuthRequest {
  return {
    user: undefined,
    orgId: undefined,
    params: {},
    headers: {},
    ip: "127.0.0.1",
    method: "GET",
    originalUrl: "/test",
    ...overrides,
  } as AuthRequest;
}

function mockRes(): Response {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as unknown as Response;
  return res;
}

function mockNext(): NextFunction {
  return jest.fn();
}

function buildUser(overrides?: Partial<JwtPayload>): JwtPayload {
  return {
    userId: `user-${Math.random().toString(36).slice(2, 8)}`,
    email: "test@example.com",
    role: ROLES.STAFFS,
    orgId: `org-${Math.random().toString(36).slice(2, 8)}`,
    ...overrides,
  };
}

describe("RBAC Security", () => {
  beforeEach(async () => {
    await resetEnforcer();
    jest.clearAllMocks();
  });

  describe("Vertical Privilege Escalation", () => {
    it("authorizeRole(ORG_ADMIN) rejects staffs", async () => {
      const middleware = authorizeRole(ROLES.ORG_ADMIN);
      const req = mockReq({ user: buildUser({ role: ROLES.STAFFS }) });
      await expect(middleware(req, mockRes(), mockNext())).rejects.toThrow("Forbidden");
    });

    it("authorizeRole(ORG_ADMIN) rejects members", async () => {
      const middleware = authorizeRole(ROLES.ORG_ADMIN);
      const req = mockReq({ user: buildUser({ role: ROLES.MEMBERS }) });
      await expect(middleware(req, mockRes(), mockNext())).rejects.toThrow("Forbidden");
    });

    it("authorizeRole(ORG_ADMIN) rejects hr", async () => {
      const middleware = authorizeRole(ROLES.ORG_ADMIN);
      const req = mockReq({ user: buildUser({ role: ROLES.HR }) });
      await expect(middleware(req, mockRes(), mockNext())).rejects.toThrow("Forbidden");
    });

    it("authorizeRole(ORG_ADMIN) rejects clients", async () => {
      const middleware = authorizeRole(ROLES.ORG_ADMIN);
      const req = mockReq({ user: buildUser({ role: ROLES.CLIENTS }) });
      await expect(middleware(req, mockRes(), mockNext())).rejects.toThrow("Forbidden");
    });

    it("authorizeRole(ORG_ADMIN) passes for org_admin", async () => {
      const middleware = authorizeRole(ROLES.ORG_ADMIN);
      const req = mockReq({ user: buildUser({ role: ROLES.ORG_ADMIN }) });
      const next = mockNext();
      await middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it("orgAdminOnly rejects members", async () => {
      const middleware = orgAdminOnly();
      const req = mockReq({ user: buildUser({ role: ROLES.MEMBERS }) });
      await expect(middleware(req, mockRes(), mockNext())).rejects.toThrow("Forbidden");
    });

    it("orgAdminOnly logs audit when rejecting non-platform role", async () => {
      const middleware = orgAdminOnly();
      const req = mockReq({ user: buildUser({ role: ROLES.MEMBERS }) });
      await expect(middleware(req, mockRes(), mockNext())).rejects.toThrow("Forbidden");
      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: "authorization.platform.denied" }),
      );
    });

    it("orgAdminOnly rejects staffs", async () => {
      const middleware = orgAdminOnly();
      const req = mockReq({ user: buildUser({ role: ROLES.STAFFS }) });
      await expect(middleware(req, mockRes(), mockNext())).rejects.toThrow("Forbidden");
    });

    it("orgAdminOnly rejects hr", async () => {
      const middleware = orgAdminOnly();
      const req = mockReq({ user: buildUser({ role: ROLES.HR }) });
      await expect(middleware(req, mockRes(), mockNext())).rejects.toThrow("Forbidden");
    });

    it("orgAdminOnly rejects clients", async () => {
      const middleware = orgAdminOnly();
      const req = mockReq({ user: buildUser({ role: ROLES.CLIENTS }) });
      await expect(middleware(req, mockRes(), mockNext())).rejects.toThrow("Forbidden");
    });

    it("orgAdminOnly passes for org_admin", async () => {
      const middleware = orgAdminOnly();
      const req = mockReq({ user: buildUser({ role: ROLES.ORG_ADMIN }) });
      const next = mockNext();
      await middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it("orgAdminOnly requires authentication", async () => {
      const middleware = orgAdminOnly();
      const req = mockReq();
      await expect(middleware(req, mockRes(), mockNext())).rejects.toThrow("Authentication required");
    });

    it("membersOnly rejects staffs", async () => {
      const middleware = membersOnly();
      const req = mockReq({ user: buildUser({ role: ROLES.STAFFS }) });
      await expect(middleware(req, mockRes(), mockNext())).rejects.toThrow("Forbidden");
    });

    it("membersOnly rejects hr", async () => {
      const middleware = membersOnly();
      const req = mockReq({ user: buildUser({ role: ROLES.HR }) });
      await expect(middleware(req, mockRes(), mockNext())).rejects.toThrow("Forbidden");
    });

    it("membersOnly rejects clients", async () => {
      const middleware = membersOnly();
      const req = mockReq({ user: buildUser({ role: ROLES.CLIENTS }) });
      await expect(middleware(req, mockRes(), mockNext())).rejects.toThrow("Forbidden");
    });

    it("membersOnly passes for members", async () => {
      const middleware = membersOnly();
      const req = mockReq({ user: buildUser({ role: ROLES.MEMBERS }) });
      const next = mockNext();
      await middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it("membersOnly passes for org_admin", async () => {
      const middleware = membersOnly();
      const req = mockReq({ user: buildUser({ role: ROLES.ORG_ADMIN }) });
      const next = mockNext();
      await middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it("membersOnly requires authentication", async () => {
      const middleware = membersOnly();
      const req = mockReq();
      await expect(middleware(req, mockRes(), mockNext())).rejects.toThrow("Authentication required");
    });

    it("authorizeRole requires authentication", async () => {
      const middleware = authorizeRole(ROLES.ORG_ADMIN);
      const req = mockReq();
      await expect(middleware(req, mockRes(), mockNext())).rejects.toThrow("Authentication required");
    });

    it("isPlatformRole returns true only for org_admin", () => {
      expect(isPlatformRole(ROLES.ORG_ADMIN)).toBe(true);
      expect(isPlatformRole(ROLES.MEMBERS)).toBe(false);
      expect(isPlatformRole(ROLES.STAFFS)).toBe(false);
      expect(isPlatformRole(ROLES.HR)).toBe(false);
      expect(isPlatformRole(ROLES.CLIENTS)).toBe(false);
    });

    it("isAdminRole returns true for org_admin and members", () => {
      expect(isAdminRole(ROLES.ORG_ADMIN)).toBe(true);
      expect(isAdminRole(ROLES.MEMBERS)).toBe(true);
      expect(isAdminRole(ROLES.STAFFS)).toBe(false);
      expect(isAdminRole(ROLES.HR)).toBe(false);
      expect(isAdminRole(ROLES.CLIENTS)).toBe(false);
    });
  });

  describe("Horizontal Privilege Escalation", () => {
    it("staffs cannot view org-scoped files", async () => {
      const allowed = await enforce(ROLES.STAFFS, ":org_file", "view");
      expect(allowed).toBe(false);
    });

    it("staffs cannot edit org-scoped files", async () => {
      const allowed = await enforce(ROLES.STAFFS, ":org_file", "edit");
      expect(allowed).toBe(false);
    });

    it("staffs cannot upload org-scoped files", async () => {
      const allowed = await enforce(ROLES.STAFFS, ":org_file", "upload");
      expect(allowed).toBe(false);
    });

    it("staffs cannot share org-scoped files", async () => {
      const allowed = await enforce(ROLES.STAFFS, ":org_file", "share");
      expect(allowed).toBe(false);
    });

    it("staffs cannot delete org-scoped files", async () => {
      const allowed = await enforce(ROLES.STAFFS, ":org_file", "delete");
      expect(allowed).toBe(false);
    });

    it("staffs cannot restore org-scoped files", async () => {
      const allowed = await enforce(ROLES.STAFFS, ":org_file", "restore");
      expect(allowed).toBe(false);
    });

    it("clients cannot view project-scoped files", async () => {
      const allowed = await enforce(ROLES.CLIENTS, ":project_file", "view");
      expect(allowed).toBe(false);
    });

    it("clients cannot view org-scoped files", async () => {
      const allowed = await enforce(ROLES.CLIENTS, ":org_file", "view");
      expect(allowed).toBe(false);
    });

    it("members from org A cannot escalate to wildcard delete across orgs", async () => {
      const allowed = await enforce(ROLES.MEMBERS, "*:file", "delete");
      expect(allowed).toBe(false);
    });

    it("staffs cannot escalate to wildcard file access", async () => {
      const allowed = await enforce(ROLES.STAFFS, "*:file", "view");
      expect(allowed).toBe(false);
    });
  });

  describe("IDOR Prevention", () => {
    it("verifyOwnership blocks access to another user's resource", async () => {
      const mockModel = {
        findById: jest.fn().mockResolvedValue({ createdBy: "owner-1" }),
        modelName: "FileAttachment",
      };
      const middleware = verifyOwnership(mockModel as any, "createdBy");
      const req = mockReq({
        params: { id: "resource-1" },
        user: buildUser({ userId: "attacker-1", role: ROLES.STAFFS }),
      });
      await expect(middleware(req, mockRes(), mockNext())).rejects.toThrow("Forbidden");
    });

    it("verifyOwnership passes when owner matches", async () => {
      const mockModel = {
        findById: jest.fn().mockResolvedValue({ createdBy: "owner-1" }),
        modelName: "FileAttachment",
      };
      const middleware = verifyOwnership(mockModel as any, "createdBy");
      const req = mockReq({
        params: { id: "resource-1" },
        user: buildUser({ userId: "owner-1", role: ROLES.STAFFS }),
      });
      const next = mockNext();
      await middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it("verifyOwnership requires authentication", async () => {
      const mockModel = {
        findById: jest.fn(),
        modelName: "FileAttachment",
      };
      const middleware = verifyOwnership(mockModel as any, "createdBy");
      const req = mockReq({ params: { id: "resource-1" } });
      await expect(middleware(req, mockRes(), mockNext())).rejects.toThrow("Authentication required");
    });

    it("verifyOwnership rejects non-existent resources", async () => {
      const mockModel = {
        findById: jest.fn().mockResolvedValue(null),
        modelName: "FileAttachment",
      };
      const middleware = verifyOwnership(mockModel as any, "createdBy");
      const req = mockReq({
        params: { id: "nonexistent" },
        user: buildUser({ userId: "owner-1", role: ROLES.STAFFS }),
      });
      await expect(middleware(req, mockRes(), mockNext())).rejects.toThrow("not found");
    });

    it("verifyOwnership uses custom idSource when provided", async () => {
      const mockModel = {
        findById: jest.fn().mockResolvedValue({ uploaderId: "owner-1" }),
        modelName: "UploadSession",
      };
      const middleware = verifyOwnership(
        mockModel as any,
        "uploaderId",
        (req) => req.body?.sessionId,
      );
      const req = mockReq({
        body: { sessionId: "session-1" },
        user: buildUser({ userId: "owner-1", role: ROLES.STAFFS }),
      });
      const next = mockNext();
      await middleware(req, mockRes(), next);
      expect(mockModel.findById).toHaveBeenCalledWith("session-1");
      expect(next).toHaveBeenCalled();
    });
  });

  describe("Tenant Isolation", () => {
    it("resolveOrgContext sets orgId from user token when present", async () => {
      const req = mockReq({ user: buildUser({ orgId: "org-from-token" }) });
      const next = mockNext();
      await resolveOrgContext(req, mockRes(), next);
      expect(req.orgId).toBe("org-from-token");
      expect(next).toHaveBeenCalled();
    });

    it("resolveOrgContext looks up orgId from OrgMember when not in token", async () => {
      (OrgMember.findOne as jest.Mock).mockResolvedValue({ orgId: "org-from-db" });
      const req = mockReq({
        user: buildUser({ orgId: undefined }),
      });
      const next = mockNext();
      await resolveOrgContext(req, mockRes(), next);
      expect(req.orgId).toBe("org-from-db");
      expect(next).toHaveBeenCalled();
    });

    it("resolveOrgContext does not set orgId when user has no membership", async () => {
      (OrgMember.findOne as jest.Mock).mockResolvedValue(null);
      const req = mockReq({
        user: buildUser({ orgId: undefined }),
      });
      const next = mockNext();
      await resolveOrgContext(req, mockRes(), next);
      expect(req.orgId).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it("resolveOrgContext requires authentication", async () => {
      const req = mockReq();
      await expect(resolveOrgContext(req, mockRes(), mockNext())).rejects.toThrow("Authentication required");
    });

    it("requireOrgContext rejects when orgId is missing", () => {
      const req = mockReq({ user: buildUser({ orgId: undefined }) });
      expect(() => requireOrgContext(req, mockRes(), mockNext())).toThrow("not associated");
    });

    it("requireOrgContext passes when orgId is present", () => {
      const req = mockReq({
        orgId: "org-present",
        user: buildUser(),
      });
      const next = mockNext();
      requireOrgContext(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it("requireOrgContext requires authentication", () => {
      const req = mockReq();
      expect(() => requireOrgContext(req, mockRes(), mockNext())).toThrow("Authentication required");
    });
  });

  describe("Unauthorized Writes", () => {
    it("staffs cannot create org-scoped folders", async () => {
      const allowed = await enforce(ROLES.STAFFS, ":org_folder", "create");
      expect(allowed).toBe(false);
    });

    it("staffs can create project-scoped folders", async () => {
      const allowed = await enforce(ROLES.STAFFS, ":project_folder", "create");
      expect(allowed).toBe(true);
    });

    it("staffs cannot upload org-scoped files", async () => {
      const allowed = await enforce(ROLES.STAFFS, ":org_file", "upload");
      expect(allowed).toBe(false);
    });

    it("hr can upload org-scoped files", async () => {
      const allowed = await enforce(ROLES.HR, ":org_file", "upload");
      expect(allowed).toBe(true);
    });

    it("hr cannot upload project-scoped files", async () => {
      const allowed = await enforce(ROLES.HR, ":project_file", "upload");
      expect(allowed).toBe(false);
    });

    it("clients can upload client-scoped files", async () => {
      const allowed = await enforce(ROLES.CLIENTS, ":client_file", "upload");
      expect(allowed).toBe(true);
    });

    it("clients cannot upload project-scoped files", async () => {
      const allowed = await enforce(ROLES.CLIENTS, ":project_file", "upload");
      expect(allowed).toBe(false);
    });

    it("clients cannot upload org-scoped files", async () => {
      const allowed = await enforce(ROLES.CLIENTS, ":org_file", "upload");
      expect(allowed).toBe(false);
    });

    it("guests cannot upload any files", async () => {
      const guestChecks = await Promise.all([
        enforce("guest", ":shared_file", "upload"),
        enforce("guest", ":org_file", "upload"),
        enforce("guest", ":project_file", "upload"),
        enforce("guest", ":client_file", "upload"),
      ]);
      expect(guestChecks).toEqual([false, false, false, false]);
    });

    it("members can upload org-scoped files", async () => {
      const allowed = await enforce(ROLES.MEMBERS, ":org_file", "upload");
      expect(allowed).toBe(true);
    });

    it("members can create org-scoped folders", async () => {
      const allowed = await enforce(ROLES.MEMBERS, ":org_folder", "create");
      expect(allowed).toBe(true);
    });

    it("org_admin can upload org-scoped files (via members inheritance)", async () => {
      const allowed = await enforce(ROLES.ORG_ADMIN, ":org_file", "upload");
      expect(allowed).toBe(true);
    });

    it("org_admin cannot access wildcard upload resources (removed for security)", async () => {
      const allowed = await enforce(ROLES.ORG_ADMIN, "*:file", "upload");
      expect(allowed).toBe(false);
    });

    it("unknown role cannot write any resource", async () => {
      const allowed = await enforce("unknown_role", ":org_file", "upload");
      expect(allowed).toBe(false);
    });

    it("staffs cannot write to org-scoped upload sessions", async () => {
      const allowed = await enforce(ROLES.STAFFS, ":org_upload", "resume");
      expect(allowed).toBe(false);
    });

    it("members can resume org-scoped upload sessions", async () => {
      const allowed = await enforce(ROLES.MEMBERS, ":org_upload", "resume");
      expect(allowed).toBe(true);
    });
  });

  describe("Unauthorized Deletes", () => {
    it("staffs can delete project-scoped files", async () => {
      const allowed = await enforce(ROLES.STAFFS, ":project_file", "delete");
      expect(allowed).toBe(true);
    });

    it("staffs cannot delete project-scoped folders", async () => {
      const allowed = await enforce(ROLES.STAFFS, ":project_folder", "delete");
      expect(allowed).toBe(false);
    });

    it("members can delete project files", async () => {
      const allowed = await enforce(ROLES.MEMBERS, ":project_file", "delete");
      expect(allowed).toBe(true);
    });

    it("members can delete org-scoped files", async () => {
      const allowed = await enforce(ROLES.MEMBERS, ":org_file", "delete");
      expect(allowed).toBe(true);
    });

    it("members can delete org-scoped folders", async () => {
      const allowed = await enforce(ROLES.MEMBERS, ":org_folder", "delete");
      expect(allowed).toBe(true);
    });

    it("clients cannot delete any files", async () => {
      const clientChecks = await Promise.all([
        enforce(ROLES.CLIENTS, ":client_file", "delete"),
        enforce(ROLES.CLIENTS, ":project_file", "delete"),
        enforce(ROLES.CLIENTS, ":org_file", "delete"),
      ]);
      expect(clientChecks).toEqual([false, false, false]);
    });

    it("org_admin can delete org-scoped file (via members inheritance)", async () => {
      const allowed = await enforce(ROLES.ORG_ADMIN, ":org_file", "delete");
      expect(allowed).toBe(true);
    });

    it("org_admin can delete org-scoped folder (via members inheritance)", async () => {
      const allowed = await enforce(ROLES.ORG_ADMIN, ":org_folder", "delete");
      expect(allowed).toBe(true);
    });

    it("org_admin cannot access wildcard resources (removed for security)", async () => {
      const allowed = await enforce(ROLES.ORG_ADMIN, "*:file", "delete");
      expect(allowed).toBe(false);
    });

    it("hr cannot delete org-scoped files", async () => {
      const allowed = await enforce(ROLES.HR, ":org_file", "delete");
      expect(allowed).toBe(false);
    });

    it("guests cannot delete shared files", async () => {
      const allowed = await enforce("guest", ":shared_file", "delete");
      expect(allowed).toBe(false);
    });

    it("unknown role cannot delete", async () => {
      const allowed = await enforce("unknown_role", ":org_file", "delete");
      expect(allowed).toBe(false);
    });
  });

  describe("Unauthorized Approvals", () => {
    it("staffs do not have manage:approvals permission", () => {
      const perms = getEffectivePermissions(ROLES.STAFFS);
      expect(perms).not.toContain("manage:approvals");
    });

    it("members have manage:approvals permission", () => {
      const perms = getEffectivePermissions(ROLES.MEMBERS);
      expect(perms).toContain("manage:approvals");
    });

    it("org_admin has manage:approvals permission (explicit, not wildcard)", () => {
      const perms = getEffectivePermissions(ROLES.ORG_ADMIN);
      expect(perms).toContain("manage:approvals");
    });

    it("hr does not have manage:approvals permission", () => {
      const perms = getEffectivePermissions(ROLES.HR);
      expect(perms).not.toContain("manage:approvals");
    });

    it("clients do not have manage:approvals permission", () => {
      const perms = getEffectivePermissions(ROLES.CLIENTS);
      expect(perms).not.toContain("manage:approvals");
    });

    it("authorizeRole for approve endpoints rejects staffs", async () => {
      const middleware = authorizeRole(ROLES.ORG_ADMIN, ROLES.MEMBERS);
      const req = mockReq({ user: buildUser({ role: ROLES.STAFFS }) });
      await expect(middleware(req, mockRes(), mockNext())).rejects.toThrow("Forbidden");
    });

    it("authorizeRole for approve endpoints rejects hr", async () => {
      const middleware = authorizeRole(ROLES.ORG_ADMIN, ROLES.MEMBERS);
      const req = mockReq({ user: buildUser({ role: ROLES.HR }) });
      await expect(middleware(req, mockRes(), mockNext())).rejects.toThrow("Forbidden");
    });

    it("authorizeRole for approve endpoints rejects clients", async () => {
      const middleware = authorizeRole(ROLES.ORG_ADMIN, ROLES.MEMBERS);
      const req = mockReq({ user: buildUser({ role: ROLES.CLIENTS }) });
      await expect(middleware(req, mockRes(), mockNext())).rejects.toThrow("Forbidden");
    });

    it("authorizeRole for approve endpoints passes for members", async () => {
      const middleware = authorizeRole(ROLES.ORG_ADMIN, ROLES.MEMBERS);
      const req = mockReq({ user: buildUser({ role: ROLES.MEMBERS }) });
      const next = mockNext();
      await middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it("authorizeRole for approve endpoints passes for org_admin", async () => {
      const middleware = authorizeRole(ROLES.ORG_ADMIN, ROLES.MEMBERS);
      const req = mockReq({ user: buildUser({ role: ROLES.ORG_ADMIN }) });
      const next = mockNext();
      await middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("Organization Hopping", () => {
    it("staffs from org A cannot access org B's org-scoped files", async () => {
      const allowed = await enforce(ROLES.STAFFS, ":org_file", "view");
      expect(allowed).toBe(false);
    });

    it("staffs cannot access any org-level resources across organizations", async () => {
      const perms = await Promise.all([
        enforce(ROLES.STAFFS, ":org_file", "view"),
        enforce(ROLES.STAFFS, ":org_file", "upload"),
        enforce(ROLES.STAFFS, ":org_file", "edit"),
        enforce(ROLES.STAFFS, ":org_file", "delete"),
        enforce(ROLES.STAFFS, ":org_file", "share"),
        enforce(ROLES.STAFFS, ":org_file", "restore"),
        enforce(ROLES.STAFFS, ":org_file", "archive"),
      ]);
      expect(perms).toEqual([false, false, false, false, false, false, false]);
    });

    it("members from org A cannot delete wildcard files from org B", async () => {
      const allowed = await enforce(ROLES.MEMBERS, "*:file", "delete");
      expect(allowed).toBe(false);
    });

    it("members cannot access wildcard file resources across org boundaries", async () => {
      const allowed = await enforce(ROLES.MEMBERS, "*:file", "view");
      expect(allowed).toBe(false);
    });

    it("clients from org A cannot view org B's client files by manipulating scope", async () => {
      const orgFile = await enforce(ROLES.CLIENTS, ":org_file", "view");
      const projectFile = await enforce(ROLES.CLIENTS, ":project_file", "view");
      const clientFile = await enforce(ROLES.CLIENTS, ":client_file", "view");
      expect(orgFile).toBe(false);
      expect(projectFile).toBe(false);
      expect(clientFile).toBe(true);
    });

    it("hr cannot access project-scoped resources outside their org scope", async () => {
      const allowed = await enforce(ROLES.HR, ":project_file", "view");
      expect(allowed).toBe(false);
    });
  });

  describe("Client Data Leakage", () => {
    it("clients can view client-scoped files", async () => {
      const allowed = await enforce(ROLES.CLIENTS, ":client_file", "view");
      expect(allowed).toBe(true);
    });

    it("clients can upload client-scoped files", async () => {
      const allowed = await enforce(ROLES.CLIENTS, ":client_file", "upload");
      expect(allowed).toBe(true);
    });

    it("clients can download client-scoped files", async () => {
      const allowed = await enforce(ROLES.CLIENTS, ":client_file", "download");
      expect(allowed).toBe(true);
    });

    it("clients can view client-scoped folders", async () => {
      const allowed = await enforce(ROLES.CLIENTS, ":client_folder", "view");
      expect(allowed).toBe(true);
    });

    it("clients cannot view project-scoped files", async () => {
      const allowed = await enforce(ROLES.CLIENTS, ":project_file", "view");
      expect(allowed).toBe(false);
    });

    it("clients cannot view org-scoped files", async () => {
      const allowed = await enforce(ROLES.CLIENTS, ":org_file", "view");
      expect(allowed).toBe(false);
    });

    it("clients cannot view org-scoped folders", async () => {
      const allowed = await enforce(ROLES.CLIENTS, ":org_folder", "view");
      expect(allowed).toBe(false);
    });

    it("clients cannot view project-scoped folders", async () => {
      const allowed = await enforce(ROLES.CLIENTS, ":project_folder", "view");
      expect(allowed).toBe(false);
    });

    it("clients cannot edit any files", async () => {
      const allowed = await enforce(ROLES.CLIENTS, ":client_file", "edit");
      expect(allowed).toBe(false);
    });

    it("clients cannot share any files", async () => {
      const allowed = await enforce(ROLES.CLIENTS, ":client_file", "share");
      expect(allowed).toBe(false);
    });

    it("non-client roles cannot view client-scoped files", async () => {
      const checks = await Promise.all([
        enforce(ROLES.MEMBERS, ":client_file", "view"),
        enforce(ROLES.STAFFS, ":client_file", "view"),
        enforce(ROLES.HR, ":client_file", "view"),
      ]);
      expect(checks).toEqual([false, false, false]);
    });

    it("guests cannot view client-scoped files", async () => {
      const allowed = await enforce("guest", ":client_file", "view");
      expect(allowed).toBe(false);
    });

    it("clients cannot perform admin-level operations on their own scope", async () => {
      const checks = await Promise.all([
        enforce(ROLES.CLIENTS, ":client_file", "delete"),
        enforce(ROLES.CLIENTS, ":client_file", "restore"),
        enforce(ROLES.CLIENTS, ":client_file", "archive"),
        enforce(ROLES.CLIENTS, ":client_folder", "create"),
        enforce(ROLES.CLIENTS, ":client_folder", "edit"),
        enforce(ROLES.CLIENTS, ":client_folder", "delete"),
      ]);
      expect(checks).toEqual([false, false, false, false, false, false]);
    });
  });
});
