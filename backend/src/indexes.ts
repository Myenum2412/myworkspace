import { mongoose } from "./lib/db/index.js";
import { collections } from "./lib/db/collections.js";
import { logger } from "./lib/logger/index.js";

const db = () => mongoose.connection.db!;
const c = (name: string) => db().collection(name);

async function withRetry<T>(fn: () => Promise<T>, label: string, retries = 3): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      if (err?.code === 85) {
        logger.info({ label }, "Index already exists with different name — skipping");
        return undefined as T;
      }
      if (attempt === retries) throw err;
      logger.warn({ err, attempt, label }, "Index creation attempt failed, retrying...");
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
  throw new Error("unreachable");
}

export async function createIndexes(): Promise<void> {
  const idx = (name: string) => name;

  // ── Tasks ──
  await withRetry(() => c(collections.tasks).createIndex({ status: 1, dueDate: 1 }, { name: idx("idx_tasks_status_duedate") }), "tasks_status_duedate");
  await withRetry(() => c(collections.tasks).createIndex({ assigneeId: 1, status: 1 }, { name: idx("idx_tasks_assignee_status") }), "tasks_assignee_status");
  await withRetry(() => c(collections.tasks).createIndex({ createdBy: 1, createdAt: -1 }, { name: idx("idx_tasks_createdby_created") }), "tasks_createdby_created");
  await withRetry(() => c(collections.tasks).createIndex({ id: 1 }, { unique: true, name: idx("idx_tasks_displayid"), sparse: true }), "tasks_displayid");
  await withRetry(() => c(collections.tasks).createIndex({ isSaved: 1 }, { name: idx("idx_tasks_issaved") }), "tasks_issaved");
  await withRetry(() => c(collections.tasks).createIndex({ orgId: 1, status: 1, dueDate: 1 }, { name: idx("idx_tasks_org_status_duedate") }), "tasks_org_status_duedate");
  await withRetry(() => c(collections.tasks).createIndex({ orgId: 1, createdAt: -1 }, { name: idx("idx_tasks_org_created") }), "tasks_org_created");

  // ── Users ──
  await withRetry(() => c(collections.users).createIndex({ role: 1, status: 1 }, { name: idx("idx_users_role_status") }), "users_role_status");
  await withRetry(() => c(collections.users).createIndex({ department: 1 }, { name: idx("idx_users_department") }), "users_department");
  await withRetry(() => c(collections.users).createIndex({ id: 1, orgId: 1 }, { name: idx("idx_users_id_org") }), "users_id_org");
  await withRetry(() => c(collections.users).createIndex({ email: 1 }, { name: idx("idx_users_email") }), "users_email");

  // ── Time Entries ──
  await withRetry(() => c("timeentries").createIndex({ userId: 1, date: -1 }, { name: idx("idx_timeentries_user_date") }), "timeentries_user_date");
  await withRetry(() => c("timeentries").createIndex({ date: -1 }, { name: idx("idx_timeentries_date") }), "timeentries_date");
  await withRetry(() => c("timeentries").createIndex({ orgId: 1, userId: 1, date: -1 }, { name: idx("idx_timeentries_org_user_date") }), "timeentries_org_user_date");

  // ── Org Members ──
  await withRetry(() => c(collections.orgMembers).createIndex({ userId: 1, orgId: 1 }, { name: idx("idx_orgmembers_user_org") }), "orgmembers_user_org");
  await withRetry(() => c(collections.orgMembers).createIndex({ orgId: 1, role: 1 }, { name: idx("idx_orgmembers_org_role") }), "orgmembers_org_role");

  // ── Projects ──
  await withRetry(() => c(collections.projects).createIndex({ client: 1 }, { name: idx("idx_projects_client") }), "projects_client");
  await withRetry(() => c(collections.projects).createIndex({ status: 1, deadline: 1 }, { name: idx("idx_projects_status_deadline") }), "projects_status_deadline");
  await withRetry(() => c(collections.projects).createIndex({ orgId: 1, createdAt: -1 }, { name: idx("idx_projects_org_created") }), "projects_org_created");
  await withRetry(() => c(collections.projects).createIndex({ orgId: 1, status: 1 }, { name: idx("idx_projects_org_status") }), "projects_org_status");

  // ── Clients ──
  await withRetry(() => c(collections.clients).createIndex({ orgId: 1, createdAt: -1 }, { name: idx("idx_clients_org_created") }), "clients_org_created");
  await withRetry(() => c(collections.clients).createIndex({ orgId: 1, status: 1 }, { name: idx("idx_clients_org_status") }), "clients_org_status");

  // ── Invoices (bills) ──
  await withRetry(() => c(collections.invoices).createIndex({ customerId: 1, createdAt: -1 }, { name: idx("idx_invoices_customer_created") }), "invoices_customer_created");
  await withRetry(() => c(collections.invoices).createIndex({ orgId: 1, status: 1, createdAt: -1 }, { name: idx("idx_invoices_org_status_created") }), "invoices_org_status_created");

  // ── Receipts ──
  await withRetry(() => c("receipts").createIndex({ customerEmail: 1, createdAt: -1 }, { name: idx("idx_receipts_customeremail_created") }), "receipts_customeremail_created");
  await withRetry(() => c("receipts").createIndex({ orgId: 1, createdAt: -1 }, { name: idx("idx_receipts_org_created") }), "receipts_org_created");

  // ── Sessions ──
  await withRetry(() => c("sessions").createIndex({ userId: 1, loginTime: -1 }, { name: idx("idx_sessions_user_login") }), "sessions_user_login");
  await withRetry(() => c("sessions").createIndex({ orgId: 1, loginTime: -1 }, { name: idx("idx_sessions_org_login") }), "sessions_org_login");

  // ── Notifications ──
  await withRetry(() => c(collections.notifications).createIndex({ userId: 1, read: 1, createdAt: -1 }, { name: idx("idx_notifications_user_read") }), "notifications_user_read");
  await withRetry(() => c(collections.notifications).createIndex({ orgId: 1, read: 1 }, { name: idx("idx_notifications_org_read") }), "notifications_org_read");

  // ── File Attachments ──
  await withRetry(() => c("fileattachments").createIndex({ orgId: 1, size: 1 }, { name: idx("idx_fileattach_org_size") }), "fileattach_org_size");
  await withRetry(() => c("fileattachments").createIndex({ orgId: 1, category: 1, createdAt: -1 }, { name: idx("idx_fileattach_org_cat_created") }), "fileattach_org_cat_created");

  // ── Activity Logs ──
  await withRetry(() => c(collections.activity).createIndex({ orgId: 1, createdAt: -1 }, { name: idx("idx_activity_org_created") }), "activity_org_created");
  await withRetry(() => c(collections.activity).createIndex({ userId: 1, createdAt: -1 }, { name: idx("idx_activity_user_created") }), "activity_user_created");

  logger.info("All MongoDB indexes created successfully");
}
