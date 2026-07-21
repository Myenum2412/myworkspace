import { createNotification } from "../../services/notification.service.js";

export const notifySystem = {
  async scheduledMaintenance(userId: string, orgId: string, startTime: string, duration: string, description: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "scheduled_maintenance", category: "system", priority: "high",
      title: "Scheduled Maintenance",
      message: `System maintenance scheduled for ${startTime} (${duration}): ${description}`,
      link: "/status",
      metadata: { startTime, duration, description },
    });
  },

  async systemOutage(userId: string, orgId: string, affectedServices: string, estimatedRecovery: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "system_outage", category: "system", priority: "critical",
      title: "System Outage",
      message: `Experiencing outage affecting: ${affectedServices}. Estimated recovery: ${estimatedRecovery}`,
      link: "/status",
      metadata: { affectedServices, estimatedRecovery },
    });
  },

  async serviceRestored(userId: string, orgId: string, services: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "service_restored", category: "system",
      title: "Service Restored",
      message: `Services restored: ${services}. Everything is operational.`,
      link: "/status",
      metadata: { services },
    });
  },

  async backupCompleted(userId: string, orgId: string, backupName: string, size: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "backup_completed", category: "system",
      title: "Backup Completed",
      message: `Backup "${backupName}" (${size}) completed successfully`,
      link: "/admin/backups",
      metadata: { backupName, size },
    });
  },

  async backupFailed(userId: string, orgId: string, backupName: string, error: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "backup_failed", category: "system", priority: "high",
      title: "Backup Failed",
      message: `Backup "${backupName}" failed: ${error}`,
      link: "/admin/backups",
      actions: [{ label: "View Details", action: "view", url: "/admin/backups", primary: true }],
      metadata: { backupName, error },
    });
  },

  async databaseMaintenance(userId: string, orgId: string, startTime: string, duration: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "database_maintenance", category: "system",
      title: "Database Maintenance",
      message: `Database maintenance scheduled for ${startTime} (${duration})`,
      link: "/status",
      metadata: { startTime, duration },
    });
  },

  async newFeatureAnnouncement(userId: string, orgId: string, featureName: string, description: string, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "new_feature_announcement", category: "system",
      title: `New Feature: ${featureName}`,
      message: description,
      link: link || "/changelog",
      actions: [{ label: "Learn More", action: "view", url: link || "/changelog", primary: true }],
      metadata: { featureName },
    });
  },

  async platformUpdate(userId: string, orgId: string, version: string, changes: string, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "platform_update", category: "system",
      title: `Platform Update v${version}`,
      message: changes,
      link: link || "/changelog",
      actions: [{ label: "See What's New", action: "view", url: link || "/changelog", primary: true }],
      metadata: { version },
    });
  },

  async versionRelease(userId: string, orgId: string, version: string, highlights: string, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "version_release", category: "system",
      title: `Version ${version} Released`,
      message: highlights,
      link: link || "/changelog",
      actions: [{ label: "Release Notes", action: "view", url: link || "/changelog", primary: true }],
      metadata: { version },
    });
  },
};
