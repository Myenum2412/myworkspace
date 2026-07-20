const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:4000/api";

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || body.message || `API error: ${res.status}`);
  }
  return res.json();
}

export interface HealthScore {
  overall: number;
  categories: Record<string, number>;
  breakdown: Record<string, { score: number; max: number; label: string }>;
}

export interface Insight {
  type: string; severity: string; category: string;
  title: string; description: string; metric: string;
  currentValue: number; threshold: number; recommendation: string;
}

export interface Prediction {
  metric: string; predictedValue: number; confidence: number;
  timeframe: string; model: string;
}

export interface Recommendation {
  id: string; title: string; description: string;
  impact: string; effort: string; category: string; action: string;
}

export interface BIWidgetData {
  value: number; trend?: number[]; labels?: string[];
}

export interface OrgSummary {
  organization: any;
  usage: { users: number; projects: number; tasks: number; files: number; storageGB: number };
  health: { score: number; status: string };
  config: any;
}

export interface OnboardingStatus {
  progress: number; currentStep: string;
  completedSteps: string[]; skippedSteps: string[];
  isComplete: boolean;
}

export interface CustomerHealth {
  score: number; factors: Record<string, number>;
  risk: "low" | "medium" | "high";
}

export interface BillingSummary {
  plan: string; status: string; interval: string;
  seats: number; amount: number; nextBillingDate: string;
  paymentMethods: any[]; recentInvoices: any[];
}

export interface OpsSummary {
  totalServices: number; healthy: number; degraded: number; down: number;
  activeIncidents: number; totalAlerts: number; avgUptime: number;
}

export interface ServiceHealthItem {
  id: string; service: string; status: string;
  metrics: { uptime: number; latency: number; errorRate: number; throughput: number };
  lastChecked: string; region: string; version: string;
}

export interface ActivityFeedItem {
  id: string; orgId: string; actorId: string; action: string;
  entityType: string; entityId: string; summary: string;
  createdAt: string;
}

export interface UsageAnalytics {
  snapshots: any[]; trends: Record<string, any>;
  forecast: Record<string, number>;
}

export interface AnomalyResult {
  anomalies: { metric: string; currentValue: number; expectedValue: number; deviation: number; severity: string }[];
}

export interface RevenueReport {
  totalRevenue: number; monthlyRecurring: number;
  activeSubscriptions: number; byPlan: Record<string, number>;
  conversionRate: number;
}

export interface ComplianceReport {
  summary: { total: number; compliant: number; nonCompliant: number; pending: number };
  byFramework: Record<string, any>;
  recentFindings: any[];
}

export interface ServiceHealth {
  totalServices: number; healthy: number; degraded: number; down: number;
  activeIncidents: number; totalAlerts: number; avgUptime: number;
}

export class EnterpriseAPI {
  private orgId: string;

  constructor(orgId: string) {
    this.orgId = orgId;
  }

  async getBISummary(): Promise<{ healthScore: HealthScore; insights: Insight[]; predictions: Prediction[]; recommendations?: Recommendation[] }> {
    return fetchAPI(`/ai/analyze?orgId=${this.orgId}`);
  }

  async getBTWidgetData(metric: string, period: string): Promise<BIWidgetData> {
    return fetchAPI(`/analytics/widget?orgId=${this.orgId}&metric=${metric}&period=${period}`);
  }

  async getOrgSummary(): Promise<OrgSummary> {
    return fetchAPI(`/organizations/${this.orgId}/summary`);
  }

  async getOnboardingStatus(): Promise<OnboardingStatus> {
    return fetchAPI(`/success/onboarding?orgId=${this.orgId}`);
  }

  async getCustomerHealth(): Promise<CustomerHealth> {
    return fetchAPI(`/success/health?orgId=${this.orgId}`);
  }

  async getBillingSummary(): Promise<BillingSummary> {
    return fetchAPI(`/billing/summary?orgId=${this.orgId}`);
  }

  async getOpsSummary(): Promise<OpsSummary> {
    return fetchAPI(`/operations/summary?orgId=${this.orgId}`);
  }

  async getServiceHealth(): Promise<ServiceHealthItem[]> {
    return fetchAPI("/operations/services");
  }

  async getActivityFeed(limit = 20, offset = 0): Promise<{ items: ActivityFeedItem[]; total: number }> {
    return fetchAPI(`/collaboration/activity?orgId=${this.orgId}&limit=${limit}&offset=${offset}`);
  }

  async getUsageAnalytics(period = "day", limit = 30): Promise<UsageAnalytics> {
    return fetchAPI(`/admin/usage?orgId=${this.orgId}&period=${period}&limit=${limit}`);
  }

  async getAnomalies(): Promise<AnomalyResult> {
    return fetchAPI(`/admin/anomalies?orgId=${this.orgId}`);
  }

  async getRevenueReport(): Promise<RevenueReport> {
    return fetchAPI("/billing/revenue");
  }

  async getComplianceReport(): Promise<ComplianceReport> {
    return fetchAPI(`/governance/compliance?orgId=${this.orgId}`);
  }

  async getSystemWideStats(): Promise<any> {
    return fetchAPI("/admin/system-stats");
  }

  async getLifecycleOverview(): Promise<any> {
    return fetchAPI("/admin/lifecycle-overview");
  }

  async getRetentionReport(): Promise<any> {
    return fetchAPI(`/governance/retention?orgId=${this.orgId}`);
  }

  async getLegalHoldReport(): Promise<any> {
    return fetchAPI(`/governance/legal-holds?orgId=${this.orgId}`);
  }

  async getKPITrends(metric: string, period: string, limit = 30): Promise<any> {
    return fetchAPI(`/analytics/kpi-trends?orgId=${this.orgId}&metric=${metric}&period=${period}&limit=${limit}`);
  }

  async getExecutiveReport(): Promise<any> {
    return fetchAPI(`/analytics/executive-report?orgId=${this.orgId}`);
  }

  async getWorkflowStats(): Promise<any> {
    return fetchAPI(`/workflow/stats?orgId=${this.orgId}`);
  }

  async getSLAReport(): Promise<any> {
    return fetchAPI(`/sla/report?orgId=${this.orgId}`);
  }

  async getMarketplaceIntegrations(category?: string, query?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (query) params.set("query", query);
    return fetchAPI(`/marketplace/integrations?${params}`);
  }

  async getOrgInstallations(): Promise<any[]> {
    return fetchAPI(`/marketplace/installations?orgId=${this.orgId}`);
  }

  async getGraphSummary(): Promise<any> {
    return fetchAPI(`/knowledge/graph-summary?orgId=${this.orgId}`);
  }

  async getClassificationBreakdown(): Promise<any> {
    return fetchAPI(`/knowledge/classification-breakdown?orgId=${this.orgId}`);
  }

  async getDeveloperDashboard(): Promise<any> {
    return fetchAPI(`/developer/dashboard?orgId=${this.orgId}`);
  }

  async getGovernanceScore(): Promise<any> {
    return fetchAPI(`/governance/score?orgId=${this.orgId}`);
  }

  async getCollaborationPresence(): Promise<any[]> {
    return fetchAPI(`/collaboration/presence?orgId=${this.orgId}`);
  }

  async getCustomerSuccessSummary(): Promise<any> {
    return fetchAPI(`/success/summary`);
  }
}

export function createEnterpriseAPI(orgId: string): EnterpriseAPI {
  return new EnterpriseAPI(orgId);
}
