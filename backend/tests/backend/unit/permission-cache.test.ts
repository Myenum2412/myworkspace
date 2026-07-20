import { permissionCache, resolvePermissions, onRoleChanged, onOrgPolicyChanged } from "../../../src/lib/permission-cache.js";
import { ROLES } from "../../../src/lib/rbac/index.js";

describe("PermissionCache", () => {
  beforeEach(() => {
    permissionCache.invalidateAll();
  });

  describe("getPermissions / setPermissions", () => {
    it("returns null for cache miss", () => {
      const result = permissionCache.getPermissions("user1", ROLES.STAFFS, "org1");
      expect(result).toBeNull();
    });

    it("returns cached permissions on hit", () => {
      const perms = ["access:tasks", "access:files"];
      permissionCache.setPermissions("user1", ROLES.STAFFS, "org1", perms);

      const result = permissionCache.getPermissions("user1", ROLES.STAFFS, "org1");
      expect(result).toEqual(perms);
    });

    it("returns null when role changes", () => {
      permissionCache.setPermissions("user1", ROLES.STAFFS, "org1", ["access:tasks"]);

      // Role changed, cache should be invalidated
      permissionCache.invalidateUser("user1");
      const result = permissionCache.getPermissions("user1", ROLES.MEMBERS, "org1");
      expect(result).toBeNull();
    });

    it("returns null when org changes", () => {
      permissionCache.setPermissions("user1", ROLES.STAFFS, "org1", ["access:tasks"]);

      // Different org, should be a miss
      const result = permissionCache.getPermissions("user1", ROLES.STAFFS, "org2");
      expect(result).toBeNull();
    });
  });

  describe("getRolePermissions / setRolePermissions", () => {
    it("returns null for cache miss", () => {
      const result = permissionCache.getRolePermissions(ROLES.STAFFS);
      expect(result).toBeNull();
    });

    it("returns cached role permissions on hit", () => {
      const perms = ["access:tasks", "access:files"];
      permissionCache.setRolePermissions(ROLES.STAFFS, perms);

      const result = permissionCache.getRolePermissions(ROLES.STAFFS);
      expect(result).toEqual(perms);
    });

    it("different roles have separate caches", () => {
      permissionCache.setRolePermissions(ROLES.STAFFS, ["access:tasks"]);
      permissionCache.setRolePermissions(ROLES.HR, ["manage:employees"]);

      expect(permissionCache.getRolePermissions(ROLES.STAFFS)).toEqual(["access:tasks"]);
      expect(permissionCache.getRolePermissions(ROLES.HR)).toEqual(["manage:employees"]);
    });
  });

  describe("resolvePermissions", () => {
    it("computes and caches permissions on miss", () => {
      const result = permissionCache.resolvePermissions("user1", ROLES.STAFFS, "org1");

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Should now be cached
      const cached = permissionCache.getPermissions("user1", ROLES.STAFFS, "org1");
      expect(cached).toEqual(result);
    });

    it("returns cached permissions on hit", () => {
      const result1 = permissionCache.resolvePermissions("user1", ROLES.STAFFS, "org1");
      const result2 = permissionCache.resolvePermissions("user1", ROLES.STAFFS, "org1");

      expect(result1).toEqual(result2);
    });

    it("returns different permissions for different roles", () => {
      const staffsPerms = permissionCache.resolvePermissions("user1", ROLES.STAFFS, "org1");
      const hrPerms = permissionCache.resolvePermissions("user2", ROLES.HR, "org1");

      expect(staffsPerms).not.toEqual(hrPerms);
    });
  });

  describe("invalidateUser", () => {
    it("invalidates all cached permissions for a user", () => {
      permissionCache.setPermissions("user1", ROLES.STAFFS, "org1", ["access:tasks"]);
      permissionCache.setPermissions("user1", ROLES.STAFFS, "org2", ["access:files"]);

      const count = permissionCache.invalidateUser("user1");

      expect(count).toBe(2);
      expect(permissionCache.getPermissions("user1", ROLES.STAFFS, "org1")).toBeNull();
      expect(permissionCache.getPermissions("user1", ROLES.STAFFS, "org2")).toBeNull();
    });

    it("does not affect other users", () => {
      permissionCache.setPermissions("user1", ROLES.STAFFS, "org1", ["access:tasks"]);
      permissionCache.setPermissions("user2", ROLES.STAFFS, "org1", ["access:files"]);

      permissionCache.invalidateUser("user1");

      expect(permissionCache.getPermissions("user2", ROLES.STAFFS, "org1")).toEqual(["access:files"]);
    });
  });

  describe("invalidateOrg", () => {
    it("invalidates all cached permissions for an org", () => {
      permissionCache.setPermissions("user1", ROLES.STAFFS, "org1", ["access:tasks"]);
      permissionCache.setPermissions("user2", ROLES.STAFFS, "org1", ["access:files"]);

      const count = permissionCache.invalidateOrg("org1");

      expect(count).toBe(2);
      expect(permissionCache.getPermissions("user1", ROLES.STAFFS, "org1")).toBeNull();
      expect(permissionCache.getPermissions("user2", ROLES.STAFFS, "org1")).toBeNull();
    });

    it("does not affect other orgs", () => {
      permissionCache.setPermissions("user1", ROLES.STAFFS, "org1", ["access:tasks"]);
      permissionCache.setPermissions("user1", ROLES.STAFFS, "org2", ["access:files"]);

      permissionCache.invalidateOrg("org1");

      expect(permissionCache.getPermissions("user1", ROLES.STAFFS, "org2")).toEqual(["access:files"]);
    });
  });

  describe("invalidateAll", () => {
    it("clears all caches", () => {
      permissionCache.setPermissions("user1", ROLES.STAFFS, "org1", ["access:tasks"]);
      permissionCache.setRolePermissions(ROLES.STAFFS, ["access:tasks"]);

      permissionCache.invalidateAll();

      expect(permissionCache.getPermissions("user1", ROLES.STAFFS, "org1")).toBeNull();
      expect(permissionCache.getRolePermissions(ROLES.STAFFS)).toBeNull();
    });
  });

  describe("getStats", () => {
    it("tracks hits and misses", () => {
      permissionCache.getPermissions("user1", ROLES.STAFFS, "org1"); // miss
      permissionCache.setPermissions("user1", ROLES.STAFFS, "org1", ["access:tasks"]);
      permissionCache.getPermissions("user1", ROLES.STAFFS, "org1"); // hit

      const stats = permissionCache.getStats();
      expect(stats.misses).toBeGreaterThanOrEqual(1);
      expect(stats.hits).toBeGreaterThanOrEqual(1);
    });

    it("calculates hit rate", () => {
      permissionCache.setPermissions("user1", ROLES.STAFFS, "org1", ["access:tasks"]);
      permissionCache.getPermissions("user1", ROLES.STAFFS, "org1"); // hit
      permissionCache.getPermissions("user1", ROLES.STAFFS, "org1"); // hit

      const stats = permissionCache.getStats();
      expect(stats.hitRate).toBeGreaterThan(0);
    });
  });
});

describe("resolvePermissions helper", () => {
  beforeEach(() => {
    permissionCache.invalidateAll();
  });

  it("returns permissions array", () => {
    const result = resolvePermissions("user1", ROLES.STAFFS, "org1");
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns different permissions for admin role", () => {
    const staffsPerms = resolvePermissions("user1", ROLES.STAFFS, "org1");
    const orgAdminPerms = resolvePermissions("user2", ROLES.ORG_ADMIN, "org1");
    expect(orgAdminPerms.length).toBeGreaterThan(staffsPerms.length);
  });
});

describe("onRoleChanged / onOrgPolicyChanged", () => {
  beforeEach(() => {
    permissionCache.invalidateAll();
  });

  it("onRoleChanged invalidates user permissions", () => {
    permissionCache.setPermissions("user1", ROLES.STAFFS, "org1", ["access:tasks"]);
    onRoleChanged("user1");
    expect(permissionCache.getPermissions("user1", ROLES.STAFFS, "org1")).toBeNull();
  });

  it("onOrgPolicyChanged invalidates org permissions", () => {
    permissionCache.setPermissions("user1", ROLES.STAFFS, "org1", ["access:tasks"]);
    permissionCache.setPermissions("user2", ROLES.STAFFS, "org1", ["access:files"]);
    onOrgPolicyChanged("org1");
    expect(permissionCache.getPermissions("user1", ROLES.STAFFS, "org1")).toBeNull();
    expect(permissionCache.getPermissions("user2", ROLES.STAFFS, "org1")).toBeNull();
  });
});
