export { notifyUserAuth } from "./notify-auth.js";
export { notifyProject } from "./notify-project.js";
export { notifyTask } from "./notify-task.js";
export { notifyFile } from "./notify-file.js";
export { notifyApproval } from "./notify-approval.js";
export { notifyPermission } from "./notify-permission.js";
export { notifyHR } from "./notify-hr.js";
export { notifyClient } from "./notify-client.js";
export { notifyCommunication } from "./notify-communication.js";
export { notifyBilling } from "./notify-billing.js";
export { notifySecurity } from "./notify-security.js";
export { notifySystem } from "./notify-system.js";
export { notifyMultiUser } from "./notify-multi-user.js";
export { broadcastNotification } from "./notify-broadcast.js";

// Legacy exports for backward compatibility
export {
  notifyTaskAssigned,
  notifyTaskUpdated,
  notifyNewEmployee,
  notifyMessage,
  notifyMention,
  notifyProjectUpdate,
  notifyTeamTaskSubmitted,
  notifyTeamTaskApproved,
  notifyTeamTaskRejected,
  notifyCommonTaskPublished,
  notifyUpcomingTaskActivated,
  notifyDraftPublished,
  notifyTaskDueSoon,
  notifyBillingReminder,
  notifyApprovalRequest,
  notifyAnnouncement,
  notifyTeamUpdate,
} from "./notify-legacy.js";
