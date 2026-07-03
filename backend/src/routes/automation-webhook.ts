import { Router, Request, Response } from "express";
import { AppError } from "../middleware/error.js";
import { Workflow } from "../lib/db/models/Workflow.js";
import { WorkflowExecution } from "../lib/db/models/WorkflowExecution.js";
import { executeWorkflowSteps } from "./automation.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const triggerId = req.query.trigger as string;
    if (!triggerId) throw new AppError(400, "trigger query parameter is required");

    const workflow = await Workflow.findOne({
      "triggers.id": triggerId,
      status: "active",
    }).lean();

    if (!workflow) {
      res.status(404).json({ success: false, error: "No active workflow found for this trigger" });
      return;
    }

    const stepRecords = (workflow.steps || []).map((s: any) => ({
      stepId: s.id,
      type: s.type,
      status: "pending" as const,
      input: { ...s.config, webhookPayload: req.body },
    }));

    const execution = await WorkflowExecution.create({
      id: uuidv4(),
      workflowId: workflow.id,
      orgId: workflow.orgId,
      triggeredBy: `webhook:${triggerId}`,
      status: "running",
      startedAt: new Date(),
      steps: stepRecords,
    });

    executeWorkflowSteps(workflow, execution).catch(() => {});

    res.status(202).json({ success: true, data: { executionId: execution.id } });
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ success: false, error: err.message });
      return;
    }
    res.status(500).json({ success: false, error: err.message || "Webhook processing failed" });
  }
});

export default router;
