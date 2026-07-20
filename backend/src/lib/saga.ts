import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";
import { logger } from "./logger/index.js";

export interface ISagaStep<TContext = Record<string, unknown>> {
  name: string;
  execute: (context: TContext) => Promise<void>;
  compensate?: (context: TContext) => Promise<void>;
}

export interface ISagaExecution extends Document {
  sagaId: string;
  sagaType: string;
  context: Record<string, unknown>;
  status: "running" | "completed" | "compensating" | "compensated" | "failed";
  currentStep: string;
  completedSteps: string[];
  failedStep?: string;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

const sagaSchema = new Schema<ISagaExecution>({
  sagaId: { type: String, required: true, unique: true },
  sagaType: { type: String, required: true, index: true },
  context: { type: Schema.Types.Mixed, default: {} },
  status: {
    type: String, enum: ["running", "completed", "compensating", "compensated", "failed"],
    default: "running", index: true,
  },
  currentStep: { type: String, default: "" },
  completedSteps: { type: [String], default: [] },
  failedStep: { type: String },
  error: { type: String },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
});

export const SagaExecution = model<ISagaExecution>("SagaExecution", sagaSchema);

export class SagaOrchestrator<TContext = Record<string, unknown>> {
  private steps: ISagaStep<TContext>[] = [];

  constructor(
    private readonly sagaType: string,
  ) {}

  addStep(step: ISagaStep<TContext>): this {
    this.steps.push(step);
    return this;
  }

  async execute(initialContext: TContext): Promise<ISagaExecution> {
    const sagaId = uuid();
    const context = { ...initialContext } as Record<string, unknown>;

    const execution = await SagaExecution.create({
      sagaId,
      sagaType: this.sagaType,
      context,
      status: "running",
      completedSteps: [],
      startedAt: new Date(),
    });

    for (const step of this.steps) {
      execution.currentStep = step.name;
      await execution.save();

      try {
        await step.execute(context as TContext);
        execution.completedSteps.push(step.name);
        execution.context = { ...context };
        await execution.save();
        logger.debug({ sagaId, step: step.name }, "Saga step completed");
      } catch (err) {
        const errorMsg = (err as Error).message;
        execution.status = "compensating";
        execution.failedStep = step.name;
        execution.error = errorMsg;
        await execution.save();

        logger.error({ sagaId, step: step.name, error: errorMsg }, "Saga step failed, starting compensation");

        const compensatedSteps = [...execution.completedSteps].reverse();
        for (const completedStep of compensatedSteps) {
          const stepDef = this.steps.find(s => s.name === completedStep);
          if (stepDef?.compensate) {
            try {
              await stepDef.compensate(context as TContext);
              logger.debug({ sagaId, step: completedStep }, "Compensation step completed");
            } catch (compErr) {
              logger.error({ sagaId, step: completedStep, error: (compErr as Error).message }, "Compensation step failed");
            }
          }
        }

        execution.status = "compensated";
        execution.completedAt = new Date();
        await execution.save();
        return execution;
      }
    }

    execution.status = "completed";
    execution.completedAt = new Date();
    await execution.save();
    logger.info({ sagaId, steps: this.steps.length }, "Saga completed successfully");
    return execution;
  }

  async getStatus(sagaId: string): Promise<any | null> {
    return SagaExecution.findOne({ sagaId }).lean();
  }
}

export function createSaga<T>(sagaType: string): SagaOrchestrator<T> {
  return new SagaOrchestrator<T>(sagaType);
}
