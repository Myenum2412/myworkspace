import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";
import { logger } from "../logger/index.js";
import { User } from "../db/models/User.js";
import { Project } from "../db/models/Project.js";
import { Organization } from "../db/models/Organization.js";
import { Task } from "../db/models/Task.js";

export type OnboardingStep =
  | "welcome" | "create_organization" | "invite_team" | "create_project"
  | "create_first_task" | "upload_file" | "explore_dashboard" | "setup_integrations"
  | "configure_settings" | "billing_setup" | "completed";

export interface IOnboardingProgress extends Document {
  id: string;
  orgId: string;
  completedSteps: OnboardingStep[];
  currentStep: OnboardingStep;
  skippedSteps: OnboardingStep[];
  startedAt: Date;
  completedAt?: Date;
  metadata: Record<string, unknown>;
}

export interface IProductTour extends Document {
  id: string;
  orgId: string;
  tour: string;
  step: number;
  completed: boolean;
  dismissedAt?: Date;
}

export interface ICustomerHealth extends Document {
  id: string;
  orgId: string;
  score: number;
  factors: {
    adoption: number;
    engagement: number;
    performance: number;
    support: number;
    feedback: number;
  };
  risk: "low" | "medium" | "high";
  lastCalculatedAt: Date;
}

const onboardingProgressSchema = new Schema<IOnboardingProgress>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, unique: true },
  completedSteps: [{ type: String }],
  currentStep: { type: String, default: "welcome" },
  skippedSteps: [{ type: String }],
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
  metadata: { type: Schema.Types.Mixed, default: {} },
});

const productTourSchema = new Schema<IProductTour>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  tour: { type: String, required: true },
  step: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  dismissedAt: Date,
});

const customerHealthSchema = new Schema<ICustomerHealth>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, unique: true },
  score: { type: Number, default: 0 },
  factors: {
    adoption: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    performance: { type: Number, default: 0 },
    support: { type: Number, default: 0 },
    feedback: { type: Number, default: 0 },
  },
  risk: { type: String, enum: ["low", "medium", "high"], default: "low" },
  lastCalculatedAt: { type: Date, default: Date.now },
});

export const OnboardingProgress = model<IOnboardingProgress>("OnboardingProgress", onboardingProgressSchema);
export const ProductTour = model<IProductTour>("ProductTour", productTourSchema);
export const CustomerHealth = model<ICustomerHealth>("CustomerHealth", customerHealthSchema);

export class CustomerSuccessEngine {
  async startOnboarding(orgId: string): Promise<IOnboardingProgress> {
    const existing = await OnboardingProgress.findOne({ orgId }).lean();
    if (existing) return existing as any;
    return OnboardingProgress.create({
      id: uuid(), orgId,
      completedSteps: [], skippedSteps: [],
      currentStep: "welcome", startedAt: new Date(),
    });
  }

  async completeStep(orgId: string, step: OnboardingStep): Promise<IOnboardingProgress> {
    const progress = await OnboardingProgress.findOne({ orgId });
    if (!progress) throw new Error("Onboarding not started");

    if (!progress.completedSteps.includes(step)) {
      progress.completedSteps.push(step);
    }

    const stepOrder: OnboardingStep[] = [
      "welcome", "create_organization", "invite_team", "create_project",
      "create_first_task", "upload_file", "explore_dashboard",
      "setup_integrations", "configure_settings", "billing_setup",
    ];

    const nextIndex = stepOrder.indexOf(step) + 1;
    progress.currentStep = nextIndex < stepOrder.length ? stepOrder[nextIndex] : "completed";

    if (progress.currentStep === "completed") {
      progress.completedAt = new Date();
    }

    await progress.save();
    return progress;
  }

  async skipStep(orgId: string, step: OnboardingStep): Promise<IOnboardingProgress> {
    const progress = await OnboardingProgress.findOne({ orgId });
    if (!progress) throw new Error("Onboarding not started");
    if (!progress.skippedSteps.includes(step)) progress.skippedSteps.push(step);
    await progress.save();
    return progress;
  }

  async getOnboardingStatus(orgId: string): Promise<{
    progress: number; currentStep: OnboardingStep;
    completedSteps: OnboardingStep[]; skippedSteps: OnboardingStep[];
    isComplete: boolean;
  }> {
    const progress = await OnboardingProgress.findOne({ orgId }).lean();
    if (!progress) return { progress: 0, currentStep: "welcome", completedSteps: [], skippedSteps: [], isComplete: false };
    const total = 10;
    const done = progress.completedSteps.length;
    return {
      progress: Math.round((done / total) * 100),
      currentStep: progress.currentStep as OnboardingStep,
      completedSteps: progress.completedSteps as OnboardingStep[],
      skippedSteps: progress.skippedSteps as OnboardingStep[],
      isComplete: progress.currentStep === "completed",
    };
  }

  async recordTourProgress(orgId: string, tour: string, step: number): Promise<void> {
    await ProductTour.findOneAndUpdate(
      { orgId, tour },
      { $set: { step }, $setOnInsert: { id: uuid() } },
      { upsert: true },
    );
  }

  async completeTour(orgId: string, tour: string): Promise<void> {
    await ProductTour.findOneAndUpdate(
      { orgId, tour },
      { $set: { completed: true, step: 999 } },
    );
  }

  async calculateCustomerHealth(orgId: string): Promise<ICustomerHealth> {
    const [users, tasks, projects, onboarding] = await Promise.all([
      User.find({ orgId }).lean(),
      Task.find({ orgId }).lean(),
      Project.find({ orgId }).lean(),
      OnboardingProgress.findOne({ orgId }).lean(),
    ]);

    const adoption = Math.min(100, users.length * 20);
    const engagement = tasks.length > 0 ? Math.min(100, Math.round((tasks.filter(t => t.status === "completed").length / tasks.length) * 100)) : 0;
    const performance = projects.length > 0 ? Math.min(100, projects.length * 25) : 0;
    const onboardingScore = onboarding ? Math.round((onboarding.completedSteps.length / 10) * 100) : 0;
    const support = 85;

    const score = Math.round((adoption + engagement + performance + onboardingScore + support) / 5);
    const risk: "low" | "medium" | "high" = score >= 70 ? "low" : score >= 40 ? "medium" : "high";

    const health = await CustomerHealth.findOneAndUpdate(
      { orgId },
      {
        $set: {
          score,
          factors: { adoption, engagement, performance, support, feedback: onboardingScore },
          risk, lastCalculatedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );
    return health;
  }

  async getAtRiskOrgs(threshold = 40): Promise<ICustomerHealth[]> {
    return CustomerHealth.find({ score: { $lt: threshold }, risk: { $ne: "low" } })
      .sort({ score: 1 })
      .limit(20)
      .lean() as any;
  }

  async getCustomerSuccessSummary(): Promise<{
    totalOrgs: number; avgHealth: number;
    atRisk: number; healthy: number;
    completedOnboarding: number;
  }> {
    const [total, avgAgg, atRisk, healthy, onboardingComplete] = await Promise.all([
      CustomerHealth.countDocuments({}),
      CustomerHealth.aggregate([{ $group: { _id: null, avg: { $avg: "$score" } } }]),
      CustomerHealth.countDocuments({ risk: { $ne: "low" } }),
      CustomerHealth.countDocuments({ risk: "low" }),
      OnboardingProgress.countDocuments({ currentStep: "completed" }),
    ]);
    return {
      totalOrgs: total,
      avgHealth: avgAgg[0] ? Math.round(avgAgg[0].avg) : 0,
      atRisk, healthy,
      completedOnboarding: onboardingComplete,
    };
  }
}

export const customerSuccess = new CustomerSuccessEngine();
