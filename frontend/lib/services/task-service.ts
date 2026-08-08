import { ensureCsrfToken } from "@/lib/api/client";

async function csrfHeaders(): Promise<Record<string, string>> {
  const token = await ensureCsrfToken();
  return token ? { "x-csrf-token": token } : {};
}

export type TaskType = "individual" | "team" | "common" | "upcoming";

export type Task = {
  id: string;
  _id: string;
  task?: string;
  title: string;
  description: string;
  project?: string;
  type: TaskType;
  priority: string;
  status: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  creatorId?: string;
  creatorName?: string;
  teamId?: string;
  teamName?: string;
  selectedUserIds?: string[];
  dueDate?: string | null;
  startDate?: string | null;
  scheduledDate?: string | null;
  activatedAt?: string | null;
  submittedAt?: string | null;
  approvedBy?: string;
  approverName?: string;
  approvedAt?: string | null;
  approvalNote?: string;
  rejectedBy?: string;
  rejectedAt?: string | null;
  rejectionReason?: string;
  orgId?: string;
  createdAt?: string;
  updatedAt?: string;
  isSaved?: boolean;
  isActive?: boolean;
};

export const taskService = {
  async getAllTasks(orgId?: string, params?: Record<string, string>): Promise<Task[]> {
    const searchParams = new URLSearchParams();
    if (orgId) searchParams.set("orgId", orgId);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v) searchParams.set(k, v);
      });
    }
    const qs = searchParams.toString();
    const url = qs ? `/api/tasks?${qs}` : "/api/tasks";
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("Could not load tasks");
    const data = await res.json();
    return data.data || data || [];
  },

  async createTask(task: Partial<Task>): Promise<Task> {
    const attempt = async () => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await csrfHeaders()) },
        credentials: "include",
        body: JSON.stringify(task),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to create task" }));
        throw new Error(
          err.error === "Validation failed"
            ? "Please fill in all required fields."
            : err.error || "Failed to create task",
        );
      }
      const data = await res.json();
      return data.data || data;
    };
    try {
      return await attempt();
    } catch (error) {
      // A 403 "CSRF token missing" response sets the csrf cookie, so the
      // retry will carry the header. Not a validation/session failure.
      const msg = (error as Error).message;
      if (msg === "CSRF token missing" || msg === "CSRF token mismatch") {
        return await attempt();
      }
      throw error;
    }
  },

  async assignTask(taskId: string, assigneeId: string): Promise<void> {
    const res = await fetch(`/api/tasks/${taskId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await csrfHeaders()) },
      credentials: "include",
      body: JSON.stringify({ assigneeId }),
    });
    if (!res.ok) throw new Error("Failed to assign task");
  },

  async submitForVerification(taskId: string): Promise<void> {
    const res = await fetch(`/api/tasks/${taskId}/submit-verification`, {
      method: "POST",
      headers: await csrfHeaders(),
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to submit for verification");
  },

  async approveTask(taskId: string, note?: string): Promise<void> {
    const res = await fetch(`/api/tasks/${taskId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await csrfHeaders()) },
      credentials: "include",
      body: JSON.stringify({ note }),
    });
    if (!res.ok) throw new Error("Failed to approve task");
  },

  async rejectTask(taskId: string, reason: string): Promise<void> {
    const res = await fetch(`/api/tasks/${taskId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await csrfHeaders()) },
      credentials: "include",
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error("Failed to reject task");
  },

  async publishCommonTask(taskId: string): Promise<void> {
    const res = await fetch(`/api/tasks/${taskId}/publish`, {
      method: "POST",
      headers: await csrfHeaders(),
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to publish task");
  },

  async activateUpcomingTask(taskId: string): Promise<void> {
    const res = await fetch(`/api/tasks/${taskId}/activate`, {
      method: "POST",
      headers: await csrfHeaders(),
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to activate task");
  },
};
