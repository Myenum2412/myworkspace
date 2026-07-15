import { OrgMember } from "../../lib/db/models/OrgMember.js";
import { Organization } from "../../lib/db/models/Organization.js";
import { User } from "../../lib/db/models/User.js";
import { Task } from "../../lib/db/models/Task.js";
import { Project } from "../../lib/db/models/Project.js";
import { Client } from "../../lib/db/models/Client.js";
import { Team } from "../../lib/db/models/Team.js";
import { TeamMember } from "../../lib/db/models/TeamMember.js";
import mongoose from "mongoose";

export interface ContextData {
  workspace?: {
    name: string;
    companyName: string;
    plan: string;
  };
  user: {
    name: string;
    email: string;
    role: string;
  };
  currentPage?: string;
  projects?: Array<{ _id: string; name: string; status: string }>;
  tasks?: Array<{ _id: string; title: string; status: string; priority: string }>;
  clients?: Array<{ _id: string; name: string }>;
  teams?: Array<{ _id: string; name: string }>;
  permissions: string[];
}

export class ContextManager {
  async buildContext(params: {
    orgId: string;
    userId: string;
    context: "workspace" | "staff";
    workspaceContext?: Record<string, unknown>;
  }): Promise<ContextData> {
    const [org, orgMember, user] = await Promise.all([
      Organization.findOne({ id: params.orgId }).lean(),
      OrgMember.findOne({ userId: params.userId, orgId: params.orgId }).lean(),
      User.findOne({ id: params.userId }).lean(),
    ]);

    let projects: any[] = [];
    let tasks: any[] = [];
    let clients: any[] = [];
    let teams: any[] = [];

    if (params.context === "workspace") {
      [projects, tasks, clients, teams] = await Promise.all([
        Project.find({ orgId: params.orgId }).select("name status").limit(10).lean(),
        Task.find({ orgId: params.orgId }).select("title status priority").limit(10).lean(),
        Client.find({ orgId: params.orgId }).select("name").limit(10).lean(),
        Team.find({ orgId: params.orgId }).select("name").limit(10).lean(),
      ]);
    } else {
      const myTeams = await TeamMember.find({ userId: params.userId }).lean();
      const teamIds = myTeams.map(t => t.teamId);

      [tasks, teams] = await Promise.all([
        Task.find({ orgId: params.orgId, assigneeId: params.userId })
          .select("title status priority").limit(10).lean(),
        Team.find({ _id: { $in: teamIds } }).select("name").limit(10).lean(),
      ]);
    }

    const workspaceContext = params.workspaceContext || {};

    return {
      workspace: org ? {
        name: (org as any).name || "",
        companyName: (org as any).companyName || "",
        plan: (org as any).plan || "",
      } : undefined,
      user: {
        name: `${(user as any)?.firstName || ""} ${(user as any)?.lastName || ""}`.trim() || (user as any)?.email || "",
        email: user?.email || "",
        role: orgMember?.role || "member",
      },
      currentPage: (workspaceContext as any).currentPage || "",
      projects: projects as any,
      tasks: tasks as any,
      clients: clients as any,
      teams: teams as any,
      permissions: (orgMember as any)?.permissions || [],
    };
  }
}
