import { mongoose } from "./index.js";

const db = mongoose.connection.db!;

const c = (name: string) => db.collection(name);

export async function createIndexes(): Promise<void> {
  console.log("Creating MongoDB indexes...");

  // Users
  await c("users").createIndex({ email: 1 }, { unique: true, name: "idx_users_email" });
  await c("users").createIndex({ id: 1 }, { unique: true, name: "idx_users_id" });
  await c("users").createIndex({ orgId: 1 }, { name: "idx_users_org" });
  await c("users").createIndex({ createdBy: 1 }, { name: "idx_users_createdby" });
  await c("users").createIndex({ status: 1 }, { name: "idx_users_status" });

  // Organizations
  await c("organizations").createIndex({ slug: 1 }, { unique: true, name: "idx_orgs_slug" });
  await c("organizations").createIndex({ id: 1 }, { unique: true, name: "idx_orgs_id" });
  await c("organizations").createIndex({ ownerId: 1 }, { name: "idx_orgs_owner" });

  // Org Members
  await c("orgmembers").createIndex({ userId: 1, orgId: 1 }, { unique: true, name: "idx_orgmembers_user_org" });
  await c("orgmembers").createIndex({ orgId: 1 }, { name: "idx_orgmembers_org" });
  await c("orgmembers").createIndex({ userId: 1 }, { name: "idx_orgmembers_user" });

  // Tasks
  await c("tasks").createIndex({ orgId: 1, createdAt: -1 }, { name: "idx_tasks_org_created" });
  await c("tasks").createIndex({ orgId: 1, status: 1, createdAt: -1 }, { name: "idx_tasks_org_status_created" });
  await c("tasks").createIndex({ orgId: 1, priority: 1 }, { name: "idx_tasks_org_priority" });
  await c("tasks").createIndex({ orgId: 1, assigneeId: 1 }, { name: "idx_tasks_org_assignee" });
  await c("tasks").createIndex({ orgId: 1, dueDate: 1 }, { name: "idx_tasks_org_duedate" });
  await c("tasks").createIndex({ orgId: 1, createdBy: 1 }, { name: "idx_tasks_org_createdby" });
  await c("tasks").createIndex({ orgId: 1, status: 1, assigneeId: 1, createdAt: -1 }, { name: "idx_tasks_org_status_assignee_created" });
  await c("tasks").createIndex({ id: 1 }, { unique: true, name: "idx_tasks_id" });

  // Teams
  await c("teams").createIndex({ orgId: 1, createdAt: -1 }, { name: "idx_teams_org_created" });
  await c("teams").createIndex({ orgId: 1, createdBy: 1 }, { name: "idx_teams_org_createdby" });
  await c("teams").createIndex({ id: 1 }, { unique: true, name: "idx_teams_id" });

  // Team Members
  await c("teammembers").createIndex({ orgId: 1, teamId: 1, userId: 1 }, { unique: true, name: "idx_teammembers_org_team_user" });
  await c("teammembers").createIndex({ orgId: 1, userId: 1 }, { name: "idx_teammembers_org_user" });
  await c("teammembers").createIndex({ orgId: 1, createdBy: 1 }, { name: "idx_teammembers_org_createdby" });

  // Time Entries
  await c("timeentries").createIndex({ orgId: 1, date: -1 }, { name: "idx_timeentries_org_date" });
  await c("timeentries").createIndex({ orgId: 1, userId: 1, date: -1 }, { name: "idx_timeentries_org_user_date" });
  await c("timeentries").createIndex({ orgId: 1, status: 1 }, { name: "idx_timeentries_org_status" });
  await c("timeentries").createIndex({ orgId: 1, createdBy: 1 }, { name: "idx_timeentries_org_createdby" });

  // Upload Sessions
  await c("uploadsessions").createIndex({ updatedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60, name: "idx_uploadsessions_ttl" });

  // Activity Logs
  await c("activitylogs").createIndex({ orgId: 1, createdAt: -1 }, { name: "idx_activity_org_created" });
  await c("activitylogs").createIndex({ orgId: 1, userId: 1 }, { name: "idx_activity_org_user" });
  await c("activitylogs").createIndex({ orgId: 1, createdBy: 1 }, { name: "idx_activity_org_createdby" });
  await c("activitylogs").createIndex({ entityType: 1, entityId: 1 }, { name: "idx_activity_entity" });
  await c("activitylogs").createIndex({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60, name: "idx_activitylogs_ttl" });

  // Sessions
  await c("sessions").createIndex({ userId: 1, loginTime: -1 }, { name: "idx_sessions_user_login" });
  await c("sessions").createIndex({ orgId: 1, userId: 1 }, { name: "idx_sessions_org_user" });
  await c("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "idx_sessions_expires" });

  // Notifications
  await c("notifications").createIndex({ userId: 1, read: 1, createdAt: -1 }, { name: "idx_notifications_user_read_created" });
  await c("notifications").createIndex({ orgId: 1, userId: 1 }, { name: "idx_notifications_org_user" });
  await c("notifications").createIndex({ orgId: 1, createdBy: 1 }, { name: "idx_notifications_org_createdby" });
  await c("notifications").createIndex({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60, name: "idx_notifications_ttl" });

  // Files
  await c("files").createIndex({ orgId: 1, createdAt: -1 }, { name: "idx_files_org_created" });
  await c("files").createIndex({ orgId: 1, uploaderId: 1 }, { name: "idx_files_org_uploader" });
  await c("files").createIndex({ orgId: 1, createdBy: 1 }, { name: "idx_files_org_createdby" });
  await c("files").createIndex({ checksum: 1, orgId: 1, folderId: 1 }, { unique: true, partialFilterExpression: { deletedAt: null }, name: "idx_files_checksum_org_folder_dedup" });
  await c("files").createIndex({ id: 1 }, { unique: true, name: "idx_files_id" });

  // File Versions
  await c("fileversions").createIndex({ orgId: 1, fileId: 1, versionNumber: -1 }, { name: "idx_fileversions_org_file_version" });
  await c("fileversions").createIndex({ orgId: 1, uploadedBy: 1 }, { name: "idx_fileversions_org_uploadedby" });
  await c("fileversions").createIndex({ id: 1 }, { unique: true, name: "idx_fileversions_id" });

  // Folders
  await c("folders").createIndex({ orgId: 1, parentId: 1 }, { name: "idx_folders_org_parent" });
  await c("folders").createIndex({ orgId: 1, clientId: 1, path: 1 }, { unique: true, name: "idx_folders_org_client_path" });
  await c("folders").createIndex({ orgId: 1, createdBy: 1 }, { name: "idx_folders_org_createdby" });
  await c("folders").createIndex({ id: 1 }, { unique: true, name: "idx_folders_id" });

  // Share Links
  await c("sharelinks").createIndex({ token: 1 }, { unique: true, name: "idx_sharelinks_token" });
  await c("sharelinks").createIndex({ orgId: 1, fileId: 1 }, { name: "idx_sharelinks_org_file" });
  await c("sharelinks").createIndex({ orgId: 1, createdBy: 1 }, { name: "idx_sharelinks_org_createdby" });
  await c("sharelinks").createIndex({ id: 1 }, { unique: true, name: "idx_sharelinks_id" });

  // File Shares
  await c("fileshares").createIndex({ orgId: 1, fileId: 1 }, { name: "idx_fileshares_org_file" });
  await c("fileshares").createIndex({ orgId: 1, sharedByUserId: 1 }, { name: "idx_fileshares_org_sharer" });
  await c("fileshares").createIndex({ orgId: 1, createdBy: 1 }, { name: "idx_fileshares_org_createdby" });
  await c("fileshares").createIndex({ id: 1 }, { unique: true, name: "idx_fileshares_id" });

  // Projects
  await c("projects").createIndex({ orgId: 1, createdAt: -1 }, { name: "idx_projects_org_created" });
  await c("projects").createIndex({ orgId: 1, createdBy: 1 }, { name: "idx_projects_org_createdby" });
  await c("projects").createIndex({ id: 1 }, { unique: true, name: "idx_projects_id" });

  // Clients
  await c("clients").createIndex({ orgId: 1, createdAt: -1 }, { name: "idx_clients_org_created" });
  await c("clients").createIndex({ orgId: 1, createdBy: 1 }, { name: "idx_clients_org_createdby" });
  await c("clients").createIndex({ id: 1 }, { unique: true, name: "idx_clients_id" });

  // Client Workspaces
  await c("clientworkspaces").createIndex({ orgId: 1, clientId: 1 }, { unique: true, name: "idx_clientworkspaces_org_client" });
  await c("clientworkspaces").createIndex({ id: 1 }, { unique: true, name: "idx_clientworkspaces_id" });

  // Client Users
  await c("clientusers").createIndex({ email: 1 }, { unique: true, name: "idx_clientusers_email" });
  await c("clientusers").createIndex({ id: 1 }, { unique: true, name: "idx_clientusers_id" });
  await c("clientusers").createIndex({ orgId: 1 }, { name: "idx_clientusers_org" });
  await c("clientusers").createIndex({ orgId: 1, createdBy: 1 }, { name: "idx_clientusers_org_createdby" });
  await c("clientusers").createIndex({ clientId: 1 }, { name: "idx_clientusers_client" });
  await c("clientusers").createIndex({ createdByAdminId: 1 }, { name: "idx_clientusers_admin" });

  // Client Audit Logs
  await c("clientauditlogs").createIndex({ orgId: 1, createdAt: -1 }, { name: "idx_clientaudit_org_created" });
  await c("clientauditlogs").createIndex({ orgId: 1, createdBy: 1 }, { name: "idx_clientaudit_org_createdby" });
  await c("clientauditlogs").createIndex({ clientId: 1 }, { name: "idx_clientaudit_client" });
  await c("clientauditlogs").createIndex({ clientUserId: 1 }, { name: "idx_clientaudit_user" });
  await c("clientauditlogs").createIndex({ action: 1 }, { name: "idx_clientaudit_action" });

  // Messages
  await c("messages").createIndex({ orgId: 1, createdAt: -1 }, { name: "idx_messages_org_created" });
  await c("messages").createIndex({ orgId: 1, senderId: 1 }, { name: "idx_messages_org_sender" });
  await c("messages").createIndex({ orgId: 1, createdBy: 1 }, { name: "idx_messages_org_createdby" });

  // API Keys
  await c("apikeys").createIndex({ key: 1 }, { unique: true, name: "idx_apikeys_key" });
  await c("apikeys").createIndex({ orgId: 1 }, { name: "idx_apikeys_org" });

  // SSO Configs
  await c("ssoconfigs").createIndex({ orgId: 1 }, { unique: true, name: "idx_ssoconfigs_org" });

  console.log("All MongoDB indexes created successfully!");
}
