import { BaseTool } from "../base-tool.js";
import type { ToolDefinition, ToolExecutionResult, ToolExecutionOptions, ToolMetadata } from "../../types/tool.types.js";
import mongoose from "mongoose";

export class TaskTool extends BaseTool {
  static metadata: ToolMetadata = {
    name: "task_manager",
    description: "Create, read, update, and list tasks in the workspace",
    toolset: "workspace",
    emoji: "📋",
  };

  getDefinition(): ToolDefinition {
    return {
      name: "task_manager",
      description: "Manage tasks - create new tasks, list existing ones, update status, or get task details by ID",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "get", "create", "update"], description: "Action to perform on tasks" },
          taskId: { type: "string", description: "Task ID (required for get/update)" },
          title: { type: "string", description: "Task title (required for create)" },
          description: { type: "string", description: "Task description" },
          status: { type: "string", enum: ["todo", "in_progress", "review", "done", "cancelled"], description: "Task status" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Task priority" },
          assigneeId: { type: "string", description: "User ID to assign the task to" },
          limit: { type: "number", description: "Maximum tasks to return (default 20)" },
        },
        required: ["action"],
      },
    };
  }

  async execute(args: Record<string, unknown>, options?: ToolExecutionOptions): Promise<ToolExecutionResult> {
    const action = String(args.action || "");
    const db = mongoose.connection.db;
    if (!db) return this.error("Database not connected");

    try {
      switch (action) {
        case "list": {
          const limit = Math.min(Number(args.limit || 20), 100);
          const filter: Record<string, unknown> = {};
          if (options?.organizationId) filter.orgId = options.organizationId;
          if (args.status) filter.status = String(args.status);

          const tasks = await db.collection("tasks")
            .find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();

          if (tasks.length === 0) return this.success("No tasks found", { action, count: 0 });

          const lines = tasks.map((t: any, i: number) =>
            `${i + 1}. ${t.title} [${t.status || "todo"}]${t.priority ? ` (${t.priority})` : ""}`
          );
          return this.success(`Tasks (${tasks.length}):\n${lines.join("\n")}`, {
            action, count: tasks.length, tasks: tasks.map((t: any) => ({ id: t._id.toString(), title: t.title, status: t.status })),
          });
        }

        case "get": {
          const taskId = String(args.taskId || "");
          if (!taskId) return this.error("taskId is required for get action");

          const task = await db.collection("tasks").findOne({ _id: new mongoose.Types.ObjectId(taskId) });
          if (!task) return this.error(`Task ${taskId} not found`);

          return this.success(
            `Task: ${task.title}\nStatus: ${task.status || "todo"}\nPriority: ${task.priority || "medium"}\nDescription: ${task.description || "No description"}\nAssignee: ${task.assigneeId || "Unassigned"}`,
            { action, taskId, task }
          );
        }

        case "create": {
          const title = String(args.title || "");
          if (!title) return this.error("title is required for create action");

          const taskDoc = {
            title,
            description: String(args.description || ""),
            status: "todo",
            priority: String(args.priority || "medium"),
            assigneeId: String(args.assigneeId || options?.userId || ""),
            orgId: options?.organizationId || "",
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const result = await db.collection("tasks").insertOne(taskDoc);
          return this.success(`Task "${title}" created successfully with ID: ${result.insertedId}`, {
            action, taskId: result.insertedId.toString(), title,
          });
        }

        case "update": {
          const taskId = String(args.taskId || "");
          if (!taskId) return this.error("taskId is required for update action");

          const update: Record<string, unknown> = { updatedAt: new Date() };
          if (args.status) update.status = String(args.status);
          if (args.priority) update.priority = String(args.priority);
          if (args.title) update.title = String(args.title);
          if (args.description !== undefined) update.description = String(args.description);
          if (args.assigneeId) update.assigneeId = String(args.assigneeId);

          const result = await db.collection("tasks").updateOne(
            { _id: new mongoose.Types.ObjectId(taskId) },
            { $set: update }
          );

          if (result.matchedCount === 0) return this.error(`Task ${taskId} not found`);
          return this.success(`Task ${taskId} updated successfully`, {
            action, taskId, updates: Object.keys(update).filter((k) => k !== "updatedAt"),
          });
        }

        default:
          return this.error(`Unknown action: ${action}`);
      }
    } catch (error) {
      return this.error(`Task operation failed: ${(error as Error).message}`);
    }
  }
}
