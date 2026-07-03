import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { requireOrgMembershipFromRequest } from "../lib/org-utils.js";
import { requireString, requireEmail, requireEnum, optionalString } from "../lib/validate.js";
import { Workflow } from "../lib/db/models/Workflow.js";
import { WorkflowExecution } from "../lib/db/models/WorkflowExecution.js";
import { Lead } from "../lib/db/models/Lead.js";
import { FollowUp } from "../lib/db/models/FollowUp.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

router.use(authenticate);

function pagination(req: AuthRequest): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export async function executeWorkflowSteps(workflow: any, execution: any): Promise<void> {
  const steps = workflow.steps || [];
  for (const step of steps) {
    const stepRecord = execution.steps.find((s: any) => s.stepId === step.id);
    if (!stepRecord) continue;

    stepRecord.status = "running";
    stepRecord.startedAt = new Date();
    await execution.save();

    try {
      const result = await processStep(step, execution);
      stepRecord.status = "completed";
      stepRecord.output = result;
      stepRecord.completedAt = new Date();
    } catch (err: any) {
      stepRecord.status = "failed";
      stepRecord.error = err.message;
      stepRecord.completedAt = new Date();
      execution.status = "failed";
      execution.error = `Step "${step.label}" failed: ${err.message}`;
      execution.completedAt = new Date();
      await execution.save();
      return;
    }
    await execution.save();
  }

  execution.status = "completed";
  execution.completedAt = new Date();
  await execution.save();
}

async function processStep(step: any, execution: any): Promise<any> {
  switch (step.type) {
    case "delay": {
      const ms = parseInt(step.config.duration || "0");
      if (ms > 0) await new Promise(resolve => setTimeout(resolve, ms));
      return { slept: ms };
    }
    case "log": {
      const message = step.config.message || "Step executed";
      return { logged: message };
    }
    case "update_lead": {
      const leadId = step.config.leadId;
      if (!leadId) throw new Error("leadId required for update_lead step");
      const updates = step.config.updates || {};
      if (updates.status === "converted" && !updates.convertedAt) {
        updates.convertedAt = new Date();
      }
      const lead = await Lead.findOneAndUpdate(
        { id: leadId, orgId: execution.orgId },
        { $set: updates },
        { new: true }
      ).lean();
      if (!lead) throw new Error(`Lead ${leadId} not found`);
      return lead;
    }
    case "create_followup": {
      const followUp = await FollowUp.create({
        id: uuidv4(),
        orgId: execution.orgId,
        leadId: step.config.leadId,
        type: step.config.type || "task",
        subject: step.config.subject || "",
        message: step.config.message || "",
        status: "pending",
        priority: step.config.priority || "medium",
        assignedTo: step.config.assignedTo,
        dueAt: step.config.dueAt ? new Date(step.config.dueAt) : undefined,
      });
      return { followUpId: followUp.id };
    }
    default:
      return { handled: false, type: step.type };
  }
}

router.get("/workflows", async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembershipFromRequest(req);
  const { page, limit, skip } = pagination(req);
  const filter: any = { orgId };
  if (req.query.status) filter.status = req.query.status;

  const [data, total] = await Promise.all([
    Workflow.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Workflow.countDocuments(filter),
  ]);

  res.json({ success: true, data, pagination: { page, limit, total } });
});

router.post("/workflows", async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembershipFromRequest(req);
  const name = requireString(req.body.name, "name", { min: 1, max: 200 });

  const workflow = await Workflow.create({
    id: uuidv4(),
    orgId,
    name,
    description: req.body.description || "",
    status: req.body.status || "draft",
    steps: req.body.steps || [],
    triggers: req.body.triggers || [],
    tags: req.body.tags || [],
  });

  res.status(201).json({ success: true, data: workflow.toObject() });
});

router.get("/workflows/:id", async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembershipFromRequest(req);
  const workflow = await Workflow.findOne({ id: req.params.id, orgId }).lean();
  if (!workflow) throw new AppError(404, "Workflow not found");
  res.json({ success: true, data: workflow });
});

router.patch("/workflows/:id", async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembershipFromRequest(req);
  const allowed = ["name", "description", "status", "steps", "triggers", "tags"];
  const updates: any = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const workflow = await Workflow.findOneAndUpdate(
    { id: req.params.id, orgId },
    { $set: updates },
    { new: true }
  ).lean();
  if (!workflow) throw new AppError(404, "Workflow not found");
  res.json({ success: true, data: workflow });
});

router.delete("/workflows/:id", async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembershipFromRequest(req);
  const workflow = await Workflow.findOneAndDelete({ id: req.params.id, orgId }).lean();
  if (!workflow) throw new AppError(404, "Workflow not found");
  res.json({ success: true, message: "Workflow deleted" });
});

router.post("/workflows/:id/execute", async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembershipFromRequest(req);
  const workflow = await Workflow.findOne({ id: req.params.id, orgId }).lean();
  if (!workflow) throw new AppError(404, "Workflow not found");
  if (workflow.status !== "active") throw new AppError(400, "Workflow must be active to execute");

  const stepRecords = (workflow.steps || []).map((s: any) => ({
    stepId: s.id,
    type: s.type,
    status: "pending" as const,
    input: s.config,
  }));

  const execution = await WorkflowExecution.create({
    id: uuidv4(),
    workflowId: workflow.id,
    orgId,
    triggeredBy: req.user!.userId,
    status: "running",
    startedAt: new Date(),
    steps: stepRecords,
  });

  executeWorkflowSteps(workflow, execution).catch(() => {});

  res.status(202).json({ success: true, data: { executionId: execution.id } });
});

router.get("/workflows/:id/executions", async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembershipFromRequest(req);
  const workflow = await Workflow.findOne({ id: req.params.id, orgId }).lean();
  if (!workflow) throw new AppError(404, "Workflow not found");

  const { page, limit, skip } = pagination(req);
  const filter: any = { workflowId: req.params.id, orgId };
  if (req.query.status) filter.status = req.query.status;

  const [data, total] = await Promise.all([
    WorkflowExecution.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    WorkflowExecution.countDocuments(filter),
  ]);

  res.json({ success: true, data, pagination: { page, limit, total } });
});

router.get("/leads", async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembershipFromRequest(req);
  const { page, limit, skip } = pagination(req);
  const filter: any = { orgId };

  if (req.query.search) {
    const search = req.query.search as string;
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { company: { $regex: search, $options: "i" } },
    ];
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.source) filter.source = req.query.source;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

  const [data, total] = await Promise.all([
    Lead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Lead.countDocuments(filter),
  ]);

  res.json({ success: true, data, pagination: { page, limit, total } });
});

router.post("/leads", async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembershipFromRequest(req);
  const name = requireString(req.body.name, "name", { min: 1, max: 200 });
  const email = requireEmail(req.body.email);

  const existing = await Lead.findOne({ orgId, email }).lean();
  if (existing) throw new AppError(409, "A lead with this email already exists");

  const lead = await Lead.create({
    id: uuidv4(),
    orgId,
    name,
    email,
    company: req.body.company || "",
    phone: req.body.phone || "",
    source: req.body.source || "other",
    status: req.body.status || "new",
    score: typeof req.body.score === "number" ? req.body.score : 0,
    assignedTo: req.body.assignedTo || "",
    tags: req.body.tags || [],
    notes: req.body.notes || "",
  });

  res.status(201).json({ success: true, data: lead.toObject() });
});

router.get("/leads/:id", async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembershipFromRequest(req);
  const lead = await Lead.findOne({ id: req.params.id, orgId }).lean();
  if (!lead) throw new AppError(404, "Lead not found");
  res.json({ success: true, data: lead });
});

router.patch("/leads/:id", async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembershipFromRequest(req);
  const allowed = ["name", "email", "company", "phone", "source", "status", "score", "assignedTo", "tags", "notes"];
  const updates: any = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (updates.status === "converted" && !updates.convertedAt) {
    updates.convertedAt = new Date();
  }

  const lead = await Lead.findOneAndUpdate(
    { id: req.params.id, orgId },
    { $set: updates },
    { new: true }
  ).lean();
  if (!lead) throw new AppError(404, "Lead not found");
  res.json({ success: true, data: lead });
});

router.delete("/leads/:id", async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembershipFromRequest(req);
  const lead = await Lead.findOneAndDelete({ id: req.params.id, orgId }).lean();
  if (!lead) throw new AppError(404, "Lead not found");
  res.json({ success: true, message: "Lead deleted" });
});

router.get("/followups", async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembershipFromRequest(req);
  const { page, limit, skip } = pagination(req);
  const filter: any = { orgId };

  if (req.query.leadId) filter.leadId = req.query.leadId;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

  const [data, total] = await Promise.all([
    FollowUp.find(filter).sort({ dueAt: 1 }).skip(skip).limit(limit).lean(),
    FollowUp.countDocuments(filter),
  ]);

  res.json({ success: true, data, pagination: { page, limit, total } });
});

router.post("/followups", async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembershipFromRequest(req);
  const type = requireEnum(req.body.type, ["email", "call", "meeting", "sms", "task", "linkedin_message"] as const, "type");
  const leadId = requireString(req.body.leadId, "leadId");

  const lead = await Lead.findOne({ id: leadId, orgId }).lean();
  if (!lead) throw new AppError(404, "Lead not found");

  const followUp = await FollowUp.create({
    id: uuidv4(),
    orgId,
    leadId,
    type,
    subject: req.body.subject || "",
    message: req.body.message || "",
    status: req.body.status || "pending",
    priority: req.body.priority || "medium",
    channel: req.body.channel || "",
    assignedTo: req.body.assignedTo || "",
    dueAt: req.body.dueAt ? new Date(req.body.dueAt) : undefined,
  });

  res.status(201).json({ success: true, data: followUp.toObject() });
});

router.patch("/followups/:id", async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembershipFromRequest(req);
  const allowed = ["type", "subject", "message", "status", "priority", "channel", "assignedTo", "dueAt", "leadId"];
  const updates: any = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (updates.dueAt) updates.dueAt = new Date(updates.dueAt);
  if (updates.status === "completed" && !updates.completedAt) {
    updates.completedAt = new Date();
  }

  const followUp = await FollowUp.findOneAndUpdate(
    { id: req.params.id, orgId },
    { $set: updates },
    { new: true }
  ).lean();
  if (!followUp) throw new AppError(404, "Follow-up not found");
  res.json({ success: true, data: followUp });
});

router.delete("/followups/:id", async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembershipFromRequest(req);
  const followUp = await FollowUp.findOneAndDelete({ id: req.params.id, orgId }).lean();
  if (!followUp) throw new AppError(404, "Follow-up not found");
  res.json({ success: true, message: "Follow-up deleted" });
});

export default router;
