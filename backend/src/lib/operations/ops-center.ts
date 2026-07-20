import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";
import { logger } from "../logger/index.js";
import { metricsRegistry } from "../monitoring/index.js";

export interface IServiceHealth extends Document {
  id: string;
  service: string;
  status: "healthy" | "degraded" | "down" | "maintenance";
  metrics: { uptime: number; latency: number; errorRate: number; throughput: number };
  lastChecked: Date;
  region: string;
  version: string;
}

export interface IIncident extends Document {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  service: string;
  title: string;
  description: string;
  status: "detected" | "investigating" | "mitigated" | "resolved" | "monitoring";
  affectedOrgs: string[];
  detectedAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  rootCause?: string;
  resolution?: string;
}

export interface IAlertRule extends Document {
  id: string;
  name: string;
  metric: string;
  condition: "gt" | "lt" | "eq" | "change_percent";
  threshold: number;
  cooldownMinutes: number;
  channels: ("email" | "webhook" | "slack" | "pagerduty")[];
  isActive: boolean;
  lastTriggeredAt?: Date;
}

const serviceHealthSchema = new Schema<IServiceHealth>({
  id: { type: String, required: true, unique: true },
  service: { type: String, required: true },
  status: { type: String, enum: ["healthy", "degraded", "down", "maintenance"], default: "healthy" },
  metrics: {
    uptime: { type: Number, default: 99.9 },
    latency: { type: Number, default: 0 },
    errorRate: { type: Number, default: 0 },
    throughput: { type: Number, default: 0 },
  },
  lastChecked: { type: Date, default: Date.now },
  region: { type: String, default: "us-east" },
  version: { type: String, default: "1.0.0" },
});

const incidentSchema = new Schema<IIncident>({
  id: { type: String, required: true, unique: true },
  severity: { type: String, enum: ["critical", "high", "medium", "low"], required: true },
  service: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  status: { type: String, enum: ["detected", "investigating", "mitigated", "resolved", "monitoring"], default: "detected" },
  affectedOrgs: [String],
  detectedAt: { type: Date, default: Date.now },
  acknowledgedAt: Date, resolvedAt: Date,
  rootCause: String, resolution: String,
});

const alertRuleSchema = new Schema<IAlertRule>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  metric: { type: String, required: true },
  condition: { type: String, enum: ["gt", "lt", "eq", "change_percent"], required: true },
  threshold: { type: Number, required: true },
  cooldownMinutes: { type: Number, default: 60 },
  channels: [{ type: String, enum: ["email", "webhook", "slack", "pagerduty"] }],
  isActive: { type: Boolean, default: true },
  lastTriggeredAt: Date,
});

export const ServiceHealth = model<IServiceHealth>("ServiceHealth", serviceHealthSchema);
export const Incident = model<IIncident>("Incident", incidentSchema);
export const AlertRule = model<IAlertRule>("AlertRule", alertRuleSchema);

export class OperationsCenter {
  async recordHealthCheck(service: string, status: "healthy" | "degraded" | "down", metrics: Partial<IServiceHealth["metrics"]>): Promise<void> {
    await ServiceHealth.findOneAndUpdate(
      { service }, {
        $set: {
          status, lastChecked: new Date(),
          "metrics.uptime": metrics.uptime ?? 99.9,
          "metrics.latency": metrics.latency ?? 0,
          "metrics.errorRate": metrics.errorRate ?? 0,
          "metrics.throughput": metrics.throughput ?? 0,
          version: "1.0.0",
        },
        $setOnInsert: { id: uuid(), region: "us-east" },
      },
      { upsert: true },
    );
  }

  async getServiceDashboard(): Promise<{
    services: IServiceHealth[];
    overallStatus: "healthy" | "degraded" | "down";
    avgLatency: number; avgErrorRate: number;
  }> {
    const services = await ServiceHealth.find({}).lean() as unknown as IServiceHealth[];
    const overallStatus = services.some(s => s.status === "down") ? "down"
      : services.some(s => s.status === "degraded") ? "degraded" : "healthy";
    const avgLatency = services.length > 0 ? Math.round(services.reduce((s, svc) => s + svc.metrics.latency, 0) / services.length) : 0;
    const avgErrorRate = services.length > 0 ? Math.round((services.reduce((s, svc) => s + svc.metrics.errorRate, 0) / services.length) * 100) / 100 : 0;
    return { services, overallStatus, avgLatency, avgErrorRate };
  }

  async reportIncident(params: {
    severity: IIncident["severity"]; service: string;
    title: string; description?: string;
  }): Promise<IIncident> {
    const incident = await Incident.create({
      id: uuid(), ...params, status: "detected",
      detectedAt: new Date(), affectedOrgs: [],
    });
    logger.error({ incidentId: incident.id, service: params.service, severity: params.severity }, "Incident reported");
    return incident;
  }

  async updateIncidentStatus(incidentId: string, status: IIncident["status"], resolution?: string): Promise<void> {
    const update: Record<string, unknown> = { status };
    if (status === "investigating") update.acknowledgedAt = new Date();
    if (status === "resolved") { update.resolvedAt = new Date(); update.resolution = resolution; }
    await Incident.updateOne({ id: incidentId }, { $set: update });
  }

  async getActiveIncidents(): Promise<IIncident[]> {
    return Incident.find({ status: { $in: ["detected", "investigating", "mitigated", "monitoring"] } })
      .sort({ detectedAt: -1 }).lean() as any;
  }

  async createAlertRule(params: {
    name: string; metric: string; condition: IAlertRule["condition"];
    threshold: number; channels: IAlertRule["channels"];
  }): Promise<IAlertRule> {
    return AlertRule.create({ id: uuid(), ...params, cooldownMinutes: 60, isActive: true });
  }

  async evaluateAlertRules(metrics: Record<string, number>): Promise<string[]> {
    const rules = await AlertRule.find({ isActive: true }).lean();
    const triggered: string[] = [];
    for (const rule of rules) {
      const currentValue = metrics[rule.metric];
      if (currentValue === undefined) continue;
      let breached = false;
      switch (rule.condition) {
        case "gt": breached = currentValue > rule.threshold; break;
        case "lt": breached = currentValue < rule.threshold; break;
        case "eq": breached = currentValue === rule.threshold; break;
      }
      if (breached) {
        triggered.push(rule.name);
        await AlertRule.updateOne({ id: rule.id }, { $set: { lastTriggeredAt: new Date() } });
      }
    }
    return triggered;
  }

  async getOpsSummary(): Promise<{
    totalServices: number; healthy: number; degraded: number; down: number;
    activeIncidents: number; totalAlerts: number;
    avgUptime: number;
  }> {
    const [services, activeIncidents, totalAlerts] = await Promise.all([
      ServiceHealth.find({}).lean(),
      Incident.countDocuments({ status: { $in: ["detected", "investigating", "mitigated"] } }),
      AlertRule.countDocuments({ isActive: true }),
    ]);
    return {
      totalServices: services.length,
      healthy: services.filter(s => s.status === "healthy").length,
      degraded: services.filter(s => s.status === "degraded").length,
      down: services.filter(s => s.status === "down").length,
      activeIncidents, totalAlerts,
      avgUptime: services.length > 0 ? Math.round(services.reduce((s, svc) => s + svc.metrics.uptime, 0) / services.length * 10) / 10 : 0,
    };
  }
}

export const opsCenter = new OperationsCenter();
