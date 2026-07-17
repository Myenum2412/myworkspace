import { mongoose } from "./lib/db/index.js";
import { collections } from "./lib/db/collections.js";

const db = () => mongoose.connection.db!;
const c = (name: string) => db().collection(name);

export async function createIndexes(): Promise<void> {
  // ── Tasks ──
  // Note: user-requested fields mapped to actual model field names:
  //   assignedTo → assigneeId, createdBy → creatorId, displayId → id
  await c(collections.tasks).createIndex({ status: 1, dueDate: 1 }, { name: "idx_tasks_status_duedate" });
  await c(collections.tasks).createIndex({ assigneeId: 1, status: 1 }, { name: "idx_tasks_assignee_status" });
  await c(collections.tasks).createIndex({ createdBy: 1, createdAt: -1 }, { name: "idx_tasks_createdby_created" });
  await c(collections.tasks).createIndex({ id: 1 }, { unique: true, name: "idx_tasks_displayid", sparse: true });
  await c(collections.tasks).createIndex({ isSaved: 1 }, { name: "idx_tasks_issaved" });

  // ── Users ──
  // displayId → id
  await c(collections.users).createIndex({ id: 1 }, { unique: true, name: "idx_users_displayid", sparse: true });
  await c(collections.users).createIndex({ email: 1 }, { unique: true, name: "idx_users_email" });
  await c(collections.users).createIndex({ role: 1, status: 1 }, { name: "idx_users_role_status" });
  await c(collections.users).createIndex({ department: 1 }, { name: "idx_users_department" });

  // ── Time Entries ──
  await c("timeentries").createIndex({ userId: 1, date: -1 }, { name: "idx_timeentries_user_date" });
  await c("timeentries").createIndex({ date: -1 }, { name: "idx_timeentries_date" });

  // ── Attendances ──
  // NOTE: No attendance model/collection exists yet in the codebase. Skipping.

  // ── Org Members ──
  // organizationId → orgId
  await c(collections.orgMembers).createIndex({ userId: 1 }, { name: "idx_orgmembers_user" });
  await c(collections.orgMembers).createIndex({ orgId: 1 }, { name: "idx_orgmembers_org" });

  // ── Projects ──
  // clientEmail → client (string name field), dueDate → deadline
  await c(collections.projects).createIndex({ client: 1 }, { name: "idx_projects_client" });
  await c(collections.projects).createIndex({ status: 1, deadline: 1 }, { name: "idx_projects_status_deadline" });

  // ── Bills (invoices) ──
  // clientId → customerId
  await c(collections.invoices).createIndex({ customerId: 1, createdAt: -1 }, { name: "idx_invoices_customer_created" });

  // ── Receipts ──
  // clientEmail → customerEmail, date → createdAt
  await c("receipts").createIndex({ customerEmail: 1, createdAt: -1 }, { name: "idx_receipts_customeremail_created" });
}
