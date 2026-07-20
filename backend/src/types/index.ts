import { Request } from "express";

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  permissions?: string[];
  orgId?: string;
  projectId?: string;
  clientId?: string;
  tokenVersion?: number;
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Omit<Request, "params"> {
  user?: JwtPayload;
  orgId?: string;
  params: Record<string, string>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type UserStatus = "online" | "offline" | "break";
export type UserRole = "org_admin" | "members" | "manager" | "team_leader" | "staffs" | "hr" | "finance" | "contractors" | "clients" | "guest" | "api_token" | "service_account" | "automation_bot";
export type NotificationType = "task_assigned" | "task_updated" | "mention" | "invite" | "system" | "comment" | "status_change";
export type OrgPlan = "free" | "growth" | "enterprise" | string;
