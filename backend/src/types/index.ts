import { Request } from "express";

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  permissions?: string[];
  orgId?: string;
  projectId?: string;
  clientId?: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
  orgId?: string;
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
export type UserRole = "admin" | "manager" | "member" | "ORG_MENU_ADMIN";
export type AdminPermission =
  | "VIEW_ORGMENU"
  | "MANAGE_USERS"
  | "MANAGE_WORKSPACES"
  | "MANAGE_COMPANIES"
  | "MANAGE_BILLING"
  | "VIEW_SYSTEM_LOGS"
  | "MANAGE_ROLES"
  | "MANAGE_SETTINGS"
  | "MANAGE_SUBSCRIPTIONS";
export type NotificationType = "task_assigned" | "task_updated" | "mention" | "invite" | "system" | "comment" | "status_change";
export type OrgPlan = "free" | "growth" | "enterprise" | string;
