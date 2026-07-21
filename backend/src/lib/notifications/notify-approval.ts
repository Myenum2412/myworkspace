import { createNotification } from "../../services/notification.service.js";

export const notifyApproval = {
  async requested(userId: string, orgId: string, createdBy: string, itemName: string, itemType: string, link?: string) {
    return createNotification({
      userId, orgId, createdBy,
      type: "approval_requested", category: "approvals", priority: "high",
      title: "Approval Requested",
      message: `${createdBy} requests approval for ${itemType}: "${itemName}"`,
      link: link || "/approvals",
      actions: [
        { label: "Approve", action: "approve", url: link || "/approvals", primary: true },
        { label: "Reject", action: "reject", url: link || "/approvals" },
        { label: "Review", action: "view", url: link || "/approvals" },
      ],
      metadata: { itemName, itemType },
    });
  },

  async pending(userId: string, orgId: string, itemName: string, itemType: string, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "approval_pending", category: "approvals", priority: "high",
      title: "Approval Pending",
      message: `${itemType} "${itemName}" is pending your approval`,
      link: link || "/approvals",
      actions: [
        { label: "Review Now", action: "view", url: link || "/approvals", primary: true },
      ],
      metadata: { itemName, itemType },
    });
  },

  async approved(userId: string, orgId: string, approvedBy: string, itemName: string, itemType: string, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "approval_approved", category: "approvals",
      title: "Approval Granted",
      message: `${approvedBy} approved "${itemName}" (${itemType})`,
      link: link || "/approvals",
      actions: [{ label: "View Details", action: "view", url: link || "/approvals", primary: true }],
      metadata: { itemName, itemType, approvedBy },
    });
  },

  async rejected(userId: string, orgId: string, rejectedBy: string, itemName: string, itemType: string, reason?: string, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "approval_rejected", category: "approvals", priority: "high",
      title: "Approval Rejected",
      message: `${rejectedBy} rejected "${itemName}"${reason ? `: ${reason}` : ""}`,
      link: link || "/approvals",
      actions: [{ label: "View Details", action: "view", url: link || "/approvals", primary: true }],
      metadata: { itemName, itemType, reason },
    });
  },

  async cancelled(userId: string, orgId: string, cancelledBy: string, itemName: string, itemType: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "approval_cancelled", category: "approvals",
      title: "Approval Cancelled",
      message: `${cancelledBy} cancelled approval request for "${itemName}"`,
      metadata: { itemName, itemType },
    });
  },

  async escalated(userId: string, orgId: string, escalatedBy: string, itemName: string, itemType: string, level: number, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "approval_escalated", category: "approvals", priority: "high",
      title: "Approval Escalated",
      message: `${escalatedBy} escalated "${itemName}" to level ${level}`,
      link: link || "/approvals",
      actions: [{ label: "Review", action: "view", url: link || "/approvals", primary: true }],
      metadata: { itemName, itemType, level },
    });
  },

  async overdue(userId: string, orgId: string, itemName: string, itemType: string, daysPending: number, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "approval_overdue", category: "approvals", priority: "high",
      title: "Approval Overdue",
      message: `${itemType} "${itemName}" has been pending for ${daysPending} days`,
      link: link || "/approvals",
      actions: [{ label: "Review Now", action: "view", url: link || "/approvals", primary: true }],
      metadata: { itemName, itemType, daysPending },
    });
  },

  async levelProgressed(userId: string, orgId: string, itemName: string, itemType: string, currentLevel: number, totalLevels: number, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "approval_level_progressed", category: "approvals",
      title: "Approval Level Progressed",
      message: `"${itemName}" moved to approval level ${currentLevel}/${totalLevels}`,
      link: link || "/approvals",
      metadata: { itemName, itemType, currentLevel, totalLevels },
    });
  },
};
