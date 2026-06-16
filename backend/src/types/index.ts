import { Request } from "express";

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
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
export type UserRole = "admin" | "manager" | "member";
export type NotificationType = "task_assigned" | "task_updated" | "mention" | "invite" | "system" | "comment" | "status_change";
export type OrgPlan = "starter" | "pro" | "enterprise";
