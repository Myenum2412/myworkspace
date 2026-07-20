import { getCurrentVersion, getVersionHistory, getRecentChanges, getPolicyStats } from "../../../src/lib/casbin/policy-manager.js";

describe("Policy Manager", () => {
  describe("getCurrentVersion", () => {
    it("returns a number", () => {
      const version = getCurrentVersion();
      expect(typeof version).toBe("number");
      expect(version).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getVersionHistory", () => {
    it("returns an array", () => {
      const history = getVersionHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it("respects limit parameter", () => {
      const history = getVersionHistory(5);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  describe("getRecentChanges", () => {
    it("returns an array", () => {
      const changes = getRecentChanges();
      expect(Array.isArray(changes)).toBe(true);
    });

    it("respects limit parameter", () => {
      const changes = getRecentChanges(10);
      expect(changes.length).toBeLessThanOrEqual(10);
    });
  });

  describe("getPolicyStats", () => {
    it("returns policy statistics", async () => {
      const stats = await getPolicyStats();

      expect(stats).toHaveProperty("totalPolicies");
      expect(stats).toHaveProperty("totalRoles");
      expect(stats).toHaveProperty("version");
      expect(stats).toHaveProperty("lastReload");
      expect(stats).toHaveProperty("changesCount");

      expect(typeof stats.totalPolicies).toBe("number");
      expect(typeof stats.totalRoles).toBe("number");
      expect(typeof stats.version).toBe("number");
      expect(stats.lastReload).toBeInstanceOf(Date);
      expect(typeof stats.changesCount).toBe("number");
    });
  });
});
