export type Task = {
  id: string;
  task: string;
  description: string;
  project?: string;
  priority: string;
  status: string;
  assignedTo: string;
  delegatedBy: string;
  dueDate?: string;
  finalStatus: string;
  orgId?: string;
  createdAt?: string;
  updatedAt?: string;
  isSaved?: boolean;
  isActive?: boolean;
};

export const taskService = {
  async getAllTasks(orgId?: string): Promise<Task[]> {
    const url = orgId ? `/api/tasks?orgId=${orgId}` : "/api/tasks";
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch tasks");
    const data = await res.json();
    return data.data || data || [];
  },

  async createTask(task: Partial<Task>): Promise<Task> {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(task),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to create task" }));
      throw new Error(err.error === "Validation failed" ? "Please fill in all required fields." : (err.error || "Failed to create task"));
    }
    const data = await res.json();
    return data.data || data;
  },
};
