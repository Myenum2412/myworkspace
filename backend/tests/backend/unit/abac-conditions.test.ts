import { evaluateCondition, buildConditionString, type RequestContext } from "../../../src/lib/casbin/condition-evaluator.js";

describe("ABAC Condition Evaluator", () => {
  const baseContext: RequestContext = {
    timestamp: new Date("2024-01-15T10:30:00Z"), // 10:30 AM
    ipAddress: "192.168.1.1",
    country: "US",
    riskScore: 20,
    role: "staffs",
    department: "engineering",
    clearance: "standard",
    trustedDevice: true,
    mfaCompleted: true,
    method: "GET",
    path: "/api/tasks",
  };

  describe("basic conditions", () => {
    it("returns true for empty condition", () => {
      expect(evaluateCondition("", baseContext)).toBe(true);
    });

    it("returns true for 'true' condition", () => {
      expect(evaluateCondition("true", baseContext)).toBe(true);
    });

    it("returns false for 'false' condition", () => {
      expect(evaluateCondition("false", baseContext)).toBe(false);
    });
  });

  describe("time-based conditions", () => {
    it("time_between matches within range", () => {
      const timestamp = new Date();
      timestamp.setHours(14, 30, 0, 0); // 2:30 PM local
      const context: RequestContext = { ...baseContext, timestamp };
      expect(evaluateCondition('time_between("09:00", "18:00")', context)).toBe(true);
    });

    it("time_between rejects outside range", () => {
      const timestamp = new Date();
      timestamp.setHours(20, 30, 0, 0); // 8:30 PM local
      const context: RequestContext = { ...baseContext, timestamp };
      expect(evaluateCondition('time_between("09:00", "18:00")', context)).toBe(false);
    });

    it("time_after matches after time", () => {
      // Use a timestamp that's definitely after noon in any timezone
      const timestamp = new Date();
      timestamp.setHours(14, 30, 0, 0); // 2:30 PM local
      const context: RequestContext = { ...baseContext, timestamp };
      expect(evaluateCondition('time_after("12:00")', context)).toBe(true);
    });

    it("time_after rejects before time", () => {
      // Use a timestamp that's definitely before noon in any timezone
      const timestamp = new Date();
      timestamp.setHours(8, 30, 0, 0); // 8:30 AM local
      const context: RequestContext = { ...baseContext, timestamp };
      expect(evaluateCondition('time_after("12:00")', context)).toBe(false);
    });

    it("time_before matches before time", () => {
      // Use a timestamp that's definitely before noon in any timezone
      const timestamp = new Date();
      timestamp.setHours(8, 30, 0, 0); // 8:30 AM local
      const context: RequestContext = { ...baseContext, timestamp };
      expect(evaluateCondition('time_before("12:00")', context)).toBe(true);
    });

    it("time_before rejects after time", () => {
      // Use a timestamp that's definitely after noon in any timezone
      const timestamp = new Date();
      timestamp.setHours(14, 30, 0, 0); // 2:30 PM local
      const context: RequestContext = { ...baseContext, timestamp };
      expect(evaluateCondition('time_before("12:00")', context)).toBe(false);
    });
  });

  describe("risk-based conditions", () => {
    it("risk_score < matches low risk", () => {
      const context: RequestContext = { ...baseContext, riskScore: 30 };
      expect(evaluateCondition("risk_score < 50", context)).toBe(true);
    });

    it("risk_score < rejects high risk", () => {
      const context: RequestContext = { ...baseContext, riskScore: 70 };
      expect(evaluateCondition("risk_score < 50", context)).toBe(false);
    });

    it("risk_score >= matches high risk", () => {
      const context: RequestContext = { ...baseContext, riskScore: 70 };
      expect(evaluateCondition("risk_score >= 50", context)).toBe(true);
    });

    it("risk_score >= rejects low risk", () => {
      const context: RequestContext = { ...baseContext, riskScore: 30 };
      expect(evaluateCondition("risk_score >= 50", context)).toBe(false);
    });

    it("defaults riskScore to 0 if not provided", () => {
      const context: RequestContext = { ...baseContext, riskScore: undefined };
      expect(evaluateCondition("risk_score < 50", context)).toBe(true);
    });
  });

  describe("device trust conditions", () => {
    it("trusted_device matches when trusted", () => {
      const context: RequestContext = { ...baseContext, trustedDevice: true };
      expect(evaluateCondition("trusted_device", context)).toBe(true);
    });

    it("trusted_device rejects when not trusted", () => {
      const context: RequestContext = { ...baseContext, trustedDevice: false };
      expect(evaluateCondition("trusted_device", context)).toBe(false);
    });

    it("mfa_completed matches when completed", () => {
      const context: RequestContext = { ...baseContext, mfaCompleted: true };
      expect(evaluateCondition("mfa_completed", context)).toBe(true);
    });

    it("mfa_completed rejects when not completed", () => {
      const context: RequestContext = { ...baseContext, mfaCompleted: false };
      expect(evaluateCondition("mfa_completed", context)).toBe(false);
    });
  });

  describe("country conditions", () => {
    it("country == matches exact country", () => {
      const context: RequestContext = { ...baseContext, country: "US" };
      expect(evaluateCondition('country == "US"', context)).toBe(true);
    });

    it("country == rejects different country", () => {
      const context: RequestContext = { ...baseContext, country: "UK" };
      expect(evaluateCondition('country == "US"', context)).toBe(false);
    });

    it("country != rejects matching country", () => {
      const context: RequestContext = { ...baseContext, country: "US" };
      expect(evaluateCondition('country != "US"', context)).toBe(false);
    });

    it("country != accepts different country", () => {
      const context: RequestContext = { ...baseContext, country: "UK" };
      expect(evaluateCondition('country != "US"', context)).toBe(true);
    });

    it("country in matches country in list", () => {
      const context: RequestContext = { ...baseContext, country: "US" };
      expect(evaluateCondition('country in ["US", "CA", "UK"]', context)).toBe(true);
    });

    it("country in rejects country not in list", () => {
      const context: RequestContext = { ...baseContext, country: "DE" };
      expect(evaluateCondition('country in ["US", "CA", "UK"]', context)).toBe(false);
    });

    it("country not_in rejects country in list", () => {
      const context: RequestContext = { ...baseContext, country: "US" };
      expect(evaluateCondition('country not_in ["US", "CA"]', context)).toBe(false);
    });

    it("country not_in accepts country not in list", () => {
      const context: RequestContext = { ...baseContext, country: "DE" };
      expect(evaluateCondition('country not_in ["US", "CA"]', context)).toBe(true);
    });
  });

  describe("role conditions", () => {
    it("role == matches exact role", () => {
      const context: RequestContext = { ...baseContext, role: "staffs" };
      expect(evaluateCondition('role == "staffs"', context)).toBe(true);
    });

    it("role == rejects different role", () => {
      const context: RequestContext = { ...baseContext, role: "hr" };
      expect(evaluateCondition('role == "staffs"', context)).toBe(false);
    });

    it("role in matches role in list", () => {
      const context: RequestContext = { ...baseContext, role: "staffs" };
      expect(evaluateCondition('role in ["staffs", "hr"]', context)).toBe(true);
    });

    it("role in rejects role not in list", () => {
      const context: RequestContext = { ...baseContext, role: "clients" };
      expect(evaluateCondition('role in ["staffs", "hr"]', context)).toBe(false);
    });
  });

  describe("compound conditions", () => {
    it("AND condition matches all", () => {
      const context: RequestContext = {
        ...baseContext,
        role: "staffs",
        riskScore: 20,
      };
      expect(evaluateCondition('role == "staffs" AND risk_score < 50', context)).toBe(true);
    });

    it("AND condition rejects if any fails", () => {
      const context: RequestContext = {
        ...baseContext,
        role: "staffs",
        riskScore: 70,
      };
      expect(evaluateCondition('role == "staffs" AND risk_score < 50', context)).toBe(false);
    });

    it("OR condition matches if any matches", () => {
      const context: RequestContext = {
        ...baseContext,
        role: "hr",
        riskScore: 20,
      };
      expect(evaluateCondition('role == "staffs" OR risk_score < 50', context)).toBe(true);
    });

    it("OR condition rejects if none matches", () => {
      const context: RequestContext = {
        ...baseContext,
        role: "hr",
        riskScore: 70,
      };
      expect(evaluateCondition('role == "staffs" OR risk_score < 50', context)).toBe(false);
    });
  });

  describe("buildConditionString", () => {
    it("builds time between condition", () => {
      const result = buildConditionString({ timeBetween: ["09:00", "18:00"] });
      expect(result).toContain('time_between("09:00", "18:00")');
    });

    it("builds risk score condition", () => {
      const result = buildConditionString({ maxRiskScore: 50 });
      expect(result).toContain("risk_score < 50");
    });

    it("builds country condition", () => {
      const result = buildConditionString({ countries: ["US", "CA"] });
      expect(result).toContain('country in ["US", "CA"]');
    });

    it("builds single country condition", () => {
      const result = buildConditionString({ countries: ["US"] });
      expect(result).toContain('country == "US"');
    });

    it("builds role condition", () => {
      const result = buildConditionString({ roles: ["admin", "manager"] });
      expect(result).toContain('role in ["admin", "manager"]');
    });

    it("builds compound condition", () => {
      const result = buildConditionString({
        timeBetween: ["09:00", "18:00"],
        maxRiskScore: 50,
        requireTrustedDevice: true,
      });
      expect(result).toContain('time_between("09:00", "18:00")');
      expect(result).toContain("risk_score < 50");
      expect(result).toContain("trusted_device");
      expect(result).toContain(" AND ");
    });

    it("returns 'true' for empty conditions", () => {
      const result = buildConditionString({});
      expect(result).toBe("true");
    });
  });
});
