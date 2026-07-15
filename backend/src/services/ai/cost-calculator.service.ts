interface PricingTier {
  inputCostPer1K: number;
  outputCostPer1K: number;
}

const PRICING: Record<string, PricingTier> = {
  "gpt-4o": { inputCostPer1K: 0.005, outputCostPer1K: 0.015 },
  "gpt-4o-mini": { inputCostPer1K: 0.00015, outputCostPer1K: 0.0006 },
  "claude-3-opus-20240229": { inputCostPer1K: 0.015, outputCostPer1K: 0.075 },
  "claude-3-sonnet-20240229": { inputCostPer1K: 0.003, outputCostPer1K: 0.015 },
  "claude-3-haiku-20240307": { inputCostPer1K: 0.00025, outputCostPer1K: 0.00125 },
};

export class CostCalculator {
  calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = PRICING[model] || { inputCostPer1K: 0.001, outputCostPer1K: 0.002 };
    const inputCost = (promptTokens / 1000) * pricing.inputCostPer1K;
    const outputCost = (completionTokens / 1000) * pricing.outputCostPer1K;
    return inputCost + outputCost;
  }

  formatCost(cost: number): string {
    if (cost < 0.001) return `$${(cost * 1000).toFixed(4)}m`;
    if (cost < 0.01) return `$${cost.toFixed(5)}`;
    return `$${cost.toFixed(4)}`;
  }

  getPricingInfo(model: string): PricingTier {
    return PRICING[model] || { inputCostPer1K: 0.001, outputCostPer1K: 0.002 };
  }

  estimateMonthlyCost(dailyRequests: number, avgTokensPerRequest: number, model: string): number {
    const pricing = this.getPricingInfo(model);
    const avgCostPerRequest = ((avgTokensPerRequest / 1000) * (pricing.inputCostPer1K + pricing.outputCostPer1K)) / 2;
    return dailyRequests * avgCostPerRequest * 30;
  }
}
