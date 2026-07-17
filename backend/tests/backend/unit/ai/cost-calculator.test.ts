import { CostCalculator } from "../../../../src/services/ai/cost-calculator.service.js";

describe("CostCalculator", () => {
  let calc: CostCalculator;

  beforeEach(() => {
    calc = new CostCalculator();
  });

  it("calculates cost for a known model", () => {
    const cost = calc.calculateCost("gpt-4o", 1000, 500);
    expect(cost).toBeGreaterThan(0);
  });

  it("returns 0 for zero tokens", () => {
    const cost = calc.calculateCost("gpt-4o", 0, 0);
    expect(cost).toBe(0);
  });

  it("returns default pricing for unknown models", () => {
    const cost = calc.calculateCost("unknown-model", 1000, 500);
    expect(cost).toBeGreaterThan(0);
  });

  it("formats cost as currency string", () => {
    expect(calc.formatCost(0.005)).toContain("$");
  });

  it("formats very small costs in millidollars", () => {
    const formatted = calc.formatCost(0.0001);
    expect(formatted).toContain("m");
  });

  it("returns pricing info for known models", () => {
    const pricing = calc.getPricingInfo("gpt-4o");
    expect(pricing.inputCostPer1K).toBeGreaterThan(0);
    expect(pricing.outputCostPer1K).toBeGreaterThan(0);
  });

  it("returns default pricing for unknown models", () => {
    const pricing = calc.getPricingInfo("nonexistent");
    expect(pricing).toBeDefined();
  });

  it("estimates monthly cost", () => {
    const monthly = calc.estimateMonthlyCost(1000, 500, "gpt-4o");
    expect(monthly).toBeGreaterThan(0);
  });
});
