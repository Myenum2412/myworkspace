import { createNotification } from "../../services/notification.service.js";

export const notifyTask = {
  async created(userId: string, orgId: string, createdBy: string, taskTitle: string, taskId: string, projectName?: string) {
    return createNotification({
      userId, orgId, createdBy,
      type: "task_created", category: "tasks", priority: "high",
      title: "Task Created",
      message: `New task "${taskTitle}"${projectName ? ` in ${projectName}` : ""}`,
      link: `/alltasks?id=${taskId}`,
      actions: [{ label: "View Task", action: "view", url: `/alltasks?id=${taskId}`, primary: true }],
      metadata: { taskId, taskTitle, projectName },
    });
  },

  async assigned(userId: string, orgId: string, assignedBy: string, taskTitle: string, taskId: string, projectName?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "task_assigned", category: "tasks", priority: "high",
      title: "Task Assigned",
      message: `${assignedBy} assigned you to "${taskTitle}"${projectName ? ` in ${projectName}` : ""}`,
      link: `/alltasks?id=${taskId}`,
      actions: [
        { label: "Accept", action: "accept", url: `/api/tasks/${taskId}/accept` },
        { label: "Decline", action: "decline", url: `/api/tasks/${taskId}/decline` },
        { label: "View Task", action: "view", url: `/alltasks?id=${taskId}`, primary: true },
      ],
      metadata: { taskId, taskTitle, assignedBy },
    });
  },

  async reassigned(userId: string, orgId: string, reassignedBy: string, taskTitle: string, taskId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "task_reassigned", category: "tasks", priority: "high",
      title: "Task Reassigned",
      message: `${reassignedBy} reassigned "${taskTitle}" to you`,
      link: `/alltasks?id=${taskId}`,
      actions: [{ label: "View Task", action: "view", url: `/alltasks?id=${taskId}`, primary: true }],
      metadata: { taskId },
    });
  },

  async accepted(userId: string, orgId: string, acceptedBy: string, taskTitle: string, taskId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "task_accepted", category: "tasks",
      title: "Task Accepted",
      message: `${acceptedBy} accepted "${taskTitle}"`,
      link: `/alltasks?id=${taskId}`,
      metadata: { taskId },
    });
  },

  async declined(userId: string, orgId: string, declinedBy: string, taskTitle: string, taskId: string, reason?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "task_declined", category: "tasks", priority: "high",
      title: "Task Declined",
      message: `${declinedBy} declined "${taskTitle}"${reason ? `: ${reason}` : ""}`,
      link: `/alltasks?id=${taskId}`,
      metadata: { taskId, reason },
    });
  },

  async started(userId: string, orgId: string, startedBy: string, taskTitle: string, taskId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "task_started", category: "tasks",
      title: "Task Started",
      message: `${startedBy} started working on "${taskTitle}"`,
      link: `/alltasks?id=${taskId}`,
      metadata: { taskId },
    });
  },

  async paused(userId: string, orgId: string, pausedBy: string, taskTitle: string, taskId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "task_paused", category: "tasks",
      title: "Task Paused",
      message: `${pausedBy} paused "${taskTitle}"`,
      link: `/alltasks?id=${taskId}`,
      metadata: { taskId },
    });
  },

  async resumed(userId: string, orgId: string, resumedBy: string, taskTitle: string, taskId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "task_resumed", category: "tasks",
      title: "Task Resumed",
      message: `${resumedBy} resumed "${taskTitle}"`,
      link: `/alltasks?id=${taskId}`,
      metadata: { taskId },
    });
  },

  async onHold(userId: string, orgId: string, heldBy: string, taskTitle: string, taskId: string, reason?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "task_on_hold", category: "tasks", priority: "high",
      title: "Task On Hold",
      message: `"${taskTitle}" has been put on hold by ${heldBy}${reason ? `: ${reason}` : ""}`,
      link: `/alltasks?id=${taskId}`,
      metadata: { taskId, reason },
    });
  },

  async overdue(userId: string, orgId: string, taskTitle: string, taskId: string, dueDate: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "task_overdue", category: "tasks", priority: "high",
      title: "Task Overdue",
      message: `"${taskTitle}" is overdue (was due ${dueDate})`,
      link: `/alltasks?id=${taskId}`,
      actions: [{ label: "View Task", action: "view", url: `/alltasks?id=${taskId}`, primary: true }],
      metadata: { taskId, dueDate },
    });
  },

  async dueToday(userId: string, orgId: string, taskTitle: string, taskId: string, dueDate: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "task_due_today", category: "tasks", priority: "high",
      title: "Task Due Today",
      message: `"${taskTitle}" is due today (${dueDate})`,
      link: `/alltasks?id=${taskId}`,
      actions: [{ label: "View Task", action: "view", url: `/alltasks?id=${taskId}`, primary: true }],
      metadata: { taskId, dueDate },
    });
  },

  async dueTomorrow(userId: string, orgId: string, taskTitle: string, taskId: string, dueDate: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "task_due_tomorrow", category: "tasks",
      title: "Task Due Tomorrow",
      message: `"${taskTitle}" is due tomorrow (${dueDate})`,
      link: `/alltasks?id=${taskId}`,
      actions: [{ label: "View Task", action: "view", url: `/alltasks?id=${taskId}`, primary: true }],
      metadata: { taskId, dueDate },
    });
  },

  async completed(userId: string, orgId: string, completedBy: string, taskTitle: string, taskId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "task_completed", category: "tasks",
      title: "Task Completed",
      message: `${completedBy} completed "${taskTitle}"`,
      link: `/alltasks?id=${taskId}`,
      actions: [{ label: "View Task", action: "view", url: `/alltasks?id=${taskId}`, primary: true }],
      metadata: { taskId, completedBy },
    });
  },

  async reopened(userId: string, orgId: string, reopenedBy: string, taskTitle: string, taskId: string, reason?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "task_reopened", category: "tasks",
      title: "Task Reopened",
      message: `${reopenedBy} reopened "${taskTitle}"${reason ? `: ${reason}` : ""}`,
      link: `/alltasks?id=${taskId}`,
      metadata: { taskId, reason },
    });
  },

  async rejected(userId: string, orgId: string, rejectedBy: string, taskTitle: string, taskId: string, reason: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "task_rejected", category: "tasks", priority: "high",
      title: "Task Rejected",
      message: `${rejectedBy} rejected "${taskTitle}": ${reason}`,
      link: `/alltasks?id=${taskId}`,
      actions: [{ label: "View Task", action: "view", url: `/alltasks?id=${taskId}`, primary: true }],
      metadata: { taskId, rejectionReason: reason },
    });
  },

  async approved(userId: string, orgId: string, approvedBy: string, taskTitle: string, taskId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "task_approved", category: "tasks",
      title: "Task Approved",
      message: `${approvedBy} approved "${taskTitle}"`,
      link: `/alltasks?id=${taskId}`,
      actions: [{ label: "View Task", action: "view", url: `/alltasks?id=${taskId}`, primary: true }],
      metadata: { taskId },
    });
  },

  async priorityChanged(userId: string, orgId: string, changedBy: string, taskTitle: string, taskId: string, oldPriority: string, newPriority: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "task_priority_changed", category: "tasks",
      title: "Priority Changed",
      message: `${changedBy} changed priority of "${taskTitle}" from ${oldPriority} to ${newPriority}`,
      link: `/alltasks?id=${taskId}`,
      metadata: { taskId, oldPriority, newPriority },
    });
  },

  async dependenciesCompleted(userId: string, orgId: string, taskTitle: string, taskId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "task_dependencies_completed", category: "tasks",
      title: "Dependencies Completed",
      message: `All dependencies for "${taskTitle}" have been completed`,
      link: `/alltasks?id=${taskId}`,
      actions: [{ label: "View Task", action: "view", url: `/alltasks?id=${taskId}`, primary: true }],
      metadata: { taskId },
    });
  },

  async checklistUpdated(userId: string, orgId: string, updatedBy: string, taskTitle: string, taskId: string, checklistName: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "task_checklist_updated", category: "tasks",
      title: "Checklist Updated",
      message: `${updatedBy} updated checklist "${checklistName}" for "${taskTitle}"`,
      link: `/alltasks?id=${taskId}`,
      metadata: { taskId, checklistName },
    });
  },

  async commentAdded(userId: string, orgId: string, commentAuthor: string, taskTitle: string, taskId: string, commentText: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "task_comment_added", category: "tasks",
      title: "New Comment",
      message: `${commentAuthor} commented on "${taskTitle}": ${commentText.substring(0, 200)}`,
      link: `/alltasks?id=${taskId}`,
      actions: [{ label: "View Comment", action: "view", url: `/alltasks?id=${taskId}`, primary: true }],
      metadata: { taskId, commentAuthor },
    });
  },

  async attachmentAdded(userId: string, orgId: string, addedBy: string, taskTitle: string, taskId: string, fileName: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "task_attachment_added", category: "tasks",
      title: "Attachment Added",
      message: `${addedBy} added "${fileName}" to "${taskTitle}"`,
      link: `/alltasks?id=${taskId}`,
      metadata: { taskId, fileName },
    });
  },

  async estimatedHoursUpdated(userId: string, orgId: string, updatedBy: string, taskTitle: string, taskId: string, hours: number) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "task_estimated_hours_updated", category: "tasks",
      title: "Estimated Hours Updated",
      message: `${updatedBy} updated estimated hours for "${taskTitle}" to ${hours}h`,
      link: `/alltasks?id=${taskId}`,
      metadata: { taskId, hours },
    });
  },

  async actualHoursSubmitted(userId: string, orgId: string, submittedBy: string, taskTitle: string, taskId: string, hours: number) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "task_actual_hours_submitted", category: "tasks",
      title: "Hours Logged",
      message: `${submittedBy} logged ${hours}h on "${taskTitle}"`,
      link: `/alltasks?id=${taskId}`,
      metadata: { taskId, hours },
    });
  },

  async updated(userId: string, orgId: string, updatedBy: string, taskTitle: string, taskId: string, changes?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "task_updated", category: "tasks",
      title: "Task Updated",
      message: `${updatedBy} updated "${taskTitle}"${changes ? `: ${changes}` : ""}`,
      link: `/alltasks?id=${taskId}`,
      actions: [{ label: "View Task", action: "view", url: `/alltasks?id=${taskId}`, primary: true }],
      metadata: { taskId, changes },
    });
  },
};
