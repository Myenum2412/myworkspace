import { BaseTool } from "../base-tool.js";
import type { ToolDefinition, ToolExecutionResult, ToolExecutionOptions, ToolMetadata } from "../../types/tool.types.js";
import mongoose from "mongoose";

export class ProjectTool extends BaseTool {
  static metadata: ToolMetadata = {
    name: "project_manager",
    description: "Look up and list projects and their details",
    toolset: "workspace",
    emoji: "📁",
  };

  getDefinition(): ToolDefinition {
    return {
      name: "project_manager",
      description: "Look up projects, get project details, list team members, and track project status",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "get", "members"], description: "Action to perform" },
          projectId: { type: "string", description: "Project ID (required for get/members)" },
          limit: { type: "number", description: "Maximum projects to return (default 10)" },
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
          const limit = Math.min(Number(args.limit || 10), 50);
          const filter: Record<string, unknown> = {};
          if (options?.organizationId) filter.orgId = options.organizationId;

          const projects = await db.collection("projects")
            .find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();

          if (projects.length === 0) return this.success("No projects found", { action, count: 0 });

          const lines = projects.map((p: any, i: number) =>
            `${i + 1}. ${p.name}${p.status ? ` [${p.status}]` : ""}`
          );
          return this.success(`Projects (${projects.length}):\n${lines.join("\n")}`, {
            action, count: projects.length,
          });
        }

        case "get": {
          const projectId = String(args.projectId || "");
          if (!projectId) return this.error("projectId is required for get action");

          const project = await db.collection("projects").findOne({ _id: new mongoose.Types.ObjectId(projectId) });
          if (!project) return this.error(`Project ${projectId} not found`);

          return this.success(
            `Project: ${project.name}\nDescription: ${project.description || "N/A"}\nStatus: ${project.status || "active"}\nBudget: ${project.budget || "Not set"}\nStart: ${project.startDate ? new Date(project.startDate).toLocaleDateString() : "N/A"}\nEnd: ${project.endDate ? new Date(project.endDate).toLocaleDateString() : "N/A"}`,
            { action, projectId, project }
          );
        }

        case "members": {
          const projectId = String(args.projectId || "");
          if (!projectId) return this.error("projectId is required for members action");

          const members = await db.collection("team_members")
            .find({ projectId })
            .toArray();

          if (members.length === 0) return this.success("No team members found for this project", { action, projectId, count: 0 });

          const lines = members.map((m: any, i: number) =>
            `${i + 1}. ${m.name || m.email || m.userId}${m.role ? ` - ${m.role}` : ""}`
          );
          return this.success(`Team Members (${members.length}):\n${lines.join("\n")}`, {
            action, projectId, count: members.length,
          });
        }

        default:
          return this.error(`Unknown action: ${action}`);
      }
    } catch (error) {
      return this.error(`Project operation failed: ${(error as Error).message}`);
    }
  }
}
