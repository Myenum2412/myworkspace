import { Notification } from "../db/models/Notification.js";
import { socketIOManager } from "../socketio/index.js";

type NotificationType = "task_assigned" | "task_updated" | "mention" | "invite" | "system" | "comment" | "status_change";

interface NotifyParams {
  userId: string;
  orgId: string;
  createdBy: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
}

export async function createNotification(params: NotifyParams) {
  const doc = await Notification.create({
    userId: params.userId,
    orgId: params.orgId,
    createdBy: params.createdBy,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link,
    read: false,
    createdAt: new Date(),
  });

  const payload = {
    id: doc._id.toString(),
    userId: doc.userId,
    type: doc.type,
    title: doc.title,
    message: doc.message,
    read: doc.read,
    link: doc.link,
    createdAt: doc.createdAt,
  };

  socketIOManager.emitToUser(params.userId, "notification", payload);
  socketIOManager.emitToOrg(params.orgId, "notification", payload);

  return payload;
}

export async function notifyNewEmployee(employee: { id: string; name: string; email: string }, orgId: string, createdBy: string, adminIds: string[]) {
  const results = [];
  for (const adminId of adminIds) {
    const n = await createNotification({
      userId: adminId,
      orgId,
      createdBy,
      type: "system",
      title: "New Employee Added",
      message: `${employee.name} (${employee.email}) has been added to the organization.`,
      link: "/employees",
    });
    results.push(n);
  }
  return results;
}

export async function notifyTaskAssigned(task: { id: string; title: string }, assigneeId: string, assignedByName: string, orgId: string) {
  return createNotification({
    userId: assigneeId,
    orgId,
    createdBy: assigneeId,
    type: "task_assigned",
    title: "Task Assigned",
    message: `${assignedByName} assigned you to "${task.title}"`,
    link: `/alltasks?id=${task.id}`,
  });
}
