import { createNotification } from "../../services/notification.service.js";

export const notifyPermission = {
  async granted(userId: string, orgId: string, grantedBy: string, permission: string, resource: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "permission_granted", category: "permissions",
      title: "Permission Granted",
      message: `${grantedBy} granted you "${permission}" on ${resource}`,
      metadata: { permission, resource },
    });
  },

  async revoked(userId: string, orgId: string, revokedBy: string, permission: string, resource: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "permission_revoked", category: "permissions",
      title: "Permission Revoked",
      message: `${revokedBy} revoked "${permission}" on ${resource}`,
      metadata: { permission, resource },
    });
  },

  async roleUpdated(userId: string, orgId: string, updatedBy: string, roleName: string, changes: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "role_updated", category: "permissions",
      title: "Role Updated",
      message: `${updatedBy} updated "${roleName}" role: ${changes}`,
      metadata: { roleName, changes },
    });
  },

  async departmentAccessChanged(userId: string, orgId: string, changedBy: string, departmentName: string, access: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "department_access_changed", category: "permissions",
      title: "Department Access Changed",
      message: `${changedBy} ${access} your access to "${departmentName}" department`,
      link: "/settings/departments",
      metadata: { departmentName, access },
    });
  },

  async workspaceAccessChanged(userId: string, orgId: string, changedBy: string, access: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "workspace_access_changed", category: "permissions",
      title: "Workspace Access Changed",
      message: `${changedBy} ${access} your workspace access`,
      metadata: { access },
    });
  },

  async clientPortalAccessGranted(userId: string, orgId: string, grantedBy: string, clientName: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "client_portal_access_granted", category: "permissions",
      title: "Client Portal Access",
      message: `${grantedBy} granted you access to ${clientName}'s portal`,
      link: "/clients",
      metadata: { clientName },
    });
  },

  async apiKeyGenerated(userId: string, orgId: string, keyName: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "api_key_generated", category: "permissions",
      title: "API Key Generated",
      message: `API key "${keyName}" was generated`,
      link: "/settings/developer",
      metadata: { keyName },
    });
  },

  async apiKeyRevoked(userId: string, orgId: string, keyName: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "api_key_revoked", category: "permissions",
      title: "API Key Revoked",
      message: `API key "${keyName}" was revoked`,
      link: "/settings/developer",
      metadata: { keyName },
    });
  },

  async suspiciousPermissionChange(userId: string, orgId: string, details: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "suspicious_permission_change", category: "permissions", priority: "critical",
      title: "Suspicious Permission Change",
      message: `Detected: ${details}`,
      link: "/admin/security",
      actions: [{ label: "Review Security", action: "view", url: "/admin/security", primary: true }],
      metadata: { details },
    });
  },
};
