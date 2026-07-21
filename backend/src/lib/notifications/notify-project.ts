import { createNotification } from "../../services/notification.service.js";

export const notifyProject = {
  async created(userId: string, orgId: string, createdBy: string, projectName: string, projectId: string) {
    return createNotification({
      userId, orgId, createdBy,
      type: "project_created", category: "projects",
      title: "Project Created",
      message: `Project "${projectName}" has been created.`,
      link: `/projects?id=${projectId}`,
      actions: [{ label: "View Project", action: "view", url: `/projects?id=${projectId}`, primary: true }],
      metadata: { projectId, projectName },
    });
  },

  async updated(userId: string, orgId: string, updatedBy: string, projectName: string, projectId: string, changes?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "project_updated", category: "projects",
      title: "Project Updated",
      message: `${updatedBy} updated "${projectName}"${changes ? `: ${changes}` : ""}`,
      link: `/projects?id=${projectId}`,
      actions: [{ label: "View Project", action: "view", url: `/projects?id=${projectId}`, primary: true }],
      metadata: { projectId, changes },
    });
  },

  async archived(userId: string, orgId: string, archivedBy: string, projectName: string, projectId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "project_archived", category: "projects",
      title: "Project Archived",
      message: `${archivedBy} archived "${projectName}"`,
      link: `/projects?id=${projectId}`,
      metadata: { projectId },
    });
  },

  async restored(userId: string, orgId: string, restoredBy: string, projectName: string, projectId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "project_restored", category: "projects",
      title: "Project Restored",
      message: `${restoredBy} restored "${projectName}"`,
      link: `/projects?id=${projectId}`,
      metadata: { projectId },
    });
  },

  async deleted(userId: string, orgId: string, deletedBy: string, projectName: string, projectId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "project_deleted", category: "projects",
      title: "Project Deleted",
      message: `"${projectName}" has been deleted by ${deletedBy}`,
      metadata: { projectId },
    });
  },

  async assigned(userId: string, orgId: string, assignedBy: string, projectName: string, projectId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "project_assigned", category: "projects",
      title: "Project Assigned",
      message: `${assignedBy} assigned you to "${projectName}"`,
      link: `/projects?id=${projectId}`,
      actions: [{ label: "View Project", action: "view", url: `/projects?id=${projectId}`, primary: true }],
      metadata: { projectId },
    });
  },

  async ownershipTransferred(userId: string, orgId: string, transferredBy: string, projectName: string, projectId: string, newOwnerName: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "project_ownership_transferred", category: "projects",
      title: "Project Ownership Transferred",
      message: `${transferredBy} transferred ownership of "${projectName}" to ${newOwnerName}`,
      link: `/projects?id=${projectId}`,
      metadata: { projectId, newOwner: newOwnerName },
    });
  },

  async deadlineChanged(userId: string, orgId: string, changedBy: string, projectName: string, projectId: string, oldDeadline: string, newDeadline: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "project_deadline_changed", category: "projects",
      title: "Deadline Changed",
      message: `${changedBy} changed deadline for "${projectName}" from ${oldDeadline} to ${newDeadline}`,
      link: `/projects?id=${projectId}`,
      metadata: { projectId, oldDeadline, newDeadline },
    });
  },

  async statusChanged(userId: string, orgId: string, changedBy: string, projectName: string, projectId: string, oldStatus: string, newStatus: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "project_status_changed", category: "projects",
      title: "Project Status Changed",
      message: `${changedBy} changed status of "${projectName}" from ${oldStatus} to ${newStatus}`,
      link: `/projects?id=${projectId}`,
      metadata: { projectId, oldStatus, newStatus },
    });
  },

  async completed(userId: string, orgId: string, completedBy: string, projectName: string, projectId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "project_completed", category: "projects",
      title: "Project Completed",
      message: `"${projectName}" has been completed!`,
      link: `/projects?id=${projectId}`,
      actions: [{ label: "View Project", action: "view", url: `/projects?id=${projectId}`, primary: true }],
      metadata: { projectId },
    });
  },

  async reopened(userId: string, orgId: string, reopenedBy: string, projectName: string, projectId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "project_reopened", category: "projects",
      title: "Project Reopened",
      message: `${reopenedBy} reopened "${projectName}"`,
      link: `/projects?id=${projectId}`,
      metadata: { projectId },
    });
  },

  async budgetUpdated(userId: string, orgId: string, updatedBy: string, projectName: string, projectId: string, amount: number) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "project_budget_updated", category: "projects",
      title: "Budget Updated",
      message: `${updatedBy} updated budget for "${projectName}" to $${amount}`,
      link: `/projects?id=${projectId}`,
      metadata: { projectId, amount },
    });
  },

  async milestoneCreated(userId: string, orgId: string, createdBy: string, projectName: string, projectId: string, milestoneName: string) {
    return createNotification({
      userId, orgId, createdBy,
      type: "milestone_created", category: "projects",
      title: "Milestone Created",
      message: `Milestone "${milestoneName}" added to "${projectName}"`,
      link: `/projects?id=${projectId}`,
      metadata: { projectId, milestoneName },
    });
  },

  async milestoneUpdated(userId: string, orgId: string, updatedBy: string, projectName: string, projectId: string, milestoneName: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "milestone_updated", category: "projects",
      title: "Milestone Updated",
      message: `${updatedBy} updated milestone "${milestoneName}" for "${projectName}"`,
      link: `/projects?id=${projectId}`,
      metadata: { projectId, milestoneName },
    });
  },

  async milestoneCompleted(userId: string, orgId: string, completedBy: string, projectName: string, projectId: string, milestoneName: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "milestone_completed", category: "projects",
      title: "Milestone Completed",
      message: `Milestone "${milestoneName}" completed in "${projectName}"!`,
      link: `/projects?id=${projectId}`,
      actions: [{ label: "View Project", action: "view", url: `/projects?id=${projectId}`, primary: true }],
      metadata: { projectId, milestoneName },
    });
  },

  async milestoneDelayed(userId: string, orgId: string, projectName: string, projectId: string, milestoneName: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "milestone_delayed", category: "projects", priority: "high",
      title: "Milestone Delayed",
      message: `Milestone "${milestoneName}" in "${projectName}" is behind schedule`,
      link: `/projects?id=${projectId}`,
      actions: [{ label: "View Project", action: "view", url: `/projects?id=${projectId}`, primary: true }],
      metadata: { projectId, milestoneName },
    });
  },

  async healthAtRisk(userId: string, orgId: string, projectName: string, projectId: string, reason: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "project_health_at_risk", category: "projects", priority: "high",
      title: "Project Health at Risk",
      message: `"${projectName}" health is at risk: ${reason}`,
      link: `/projects?id=${projectId}`,
      actions: [{ label: "View Project", action: "view", url: `/projects?id=${projectId}`, primary: true }],
      metadata: { projectId, reason },
    });
  },
};
