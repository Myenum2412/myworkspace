import { db } from "./index";
import * as schema from "./schema";
import { v4 as uuid } from "uuid";

async function migrate() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sqlite = (db as any).session.client;
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      email_verified INTEGER DEFAULT 0,
      image TEXT,
      password TEXT,
      status TEXT DEFAULT 'offline',
      role TEXT DEFAULT 'member',
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      logo TEXT,
      domain TEXT,
      plan TEXT DEFAULT 'starter',
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS org_members (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'member',
      joined_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'member'
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      team_id TEXT REFERENCES teams(id),
      assignee_id TEXT REFERENCES users(id),
      creator_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'medium',
      due_date INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      read INTEGER DEFAULT 0,
      link TEXT,
      metadata TEXT,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      description TEXT,
      metadata TEXT,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id),
      team_id TEXT REFERENCES teams(id),
      content TEXT NOT NULL,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      key TEXT NOT NULL UNIQUE,
      last_used_at INTEGER,
      expires_at INTEGER,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS file_attachments (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      uploader_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS file_shares (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL REFERENCES file_attachments(id) ON DELETE CASCADE,
      shared_by_user_id TEXT NOT NULL REFERENCES users(id),
      shared_with_user_id TEXT REFERENCES users(id),
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS sso_configs (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      issuer TEXT,
      client_id TEXT,
      client_secret TEXT,
      metadata_url TEXT,
      enabled INTEGER DEFAULT 0,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS time_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      task_id TEXT REFERENCES tasks(id),
      date INTEGER NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      duration INTEGER,
      description TEXT,
      billable INTEGER DEFAULT 1,
      created_at INTEGER,
      updated_at INTEGER
    );
  `);
}

async function seed() {
  try {
    const existing = db.select().from(schema.users).all();
    if (existing.length > 0) {
      console.log("Database already seeded, skipping");
      return;
    }
  } catch {
    // Table might not exist yet, that's okay
  }

  const bcryptjs = await import("bcryptjs");
  const hashedPassword = await bcryptjs.hash("password123", 12);

  const userId = "demo-user-id";
  const orgId = "demo-org-id";
  const teamId = "demo-team-id";

  db.insert(schema.users).values({
    id: userId,
    name: "Demo User",
    email: "demo@myworkspace.io",
    password: hashedPassword,
    status: "online",
    role: "admin",
  }).run();

  db.insert(schema.organizations).values({
    id: orgId,
    name: "Acme Inc",
    slug: "acme-inc",
    plan: "enterprise",
  }).run();

  db.insert(schema.orgMembers).values({
    id: uuid(),
    orgId,
    userId,
    role: "admin",
  }).run();

  db.insert(schema.teams).values({
    id: teamId,
    orgId,
    name: "Engineering",
    description: "Core engineering team",
  }).run();

  db.insert(schema.teamMembers).values({
    id: uuid(),
    teamId,
    userId,
    role: "lead",
  }).run();

  const taskData = [
    { title: "Design new dashboard layout", priority: "high" as const, status: "in_progress" as const },
    { title: "Implement WebSocket integration", priority: "urgent" as const, status: "todo" as const },
    { title: "Write API documentation", priority: "medium" as const, status: "review" as const },
    { title: "Fix login page styling", priority: "low" as const, status: "done" as const },
    { title: "Set up CI/CD pipeline", priority: "high" as const, status: "todo" as const },
    { title: "Database optimization", priority: "medium" as const, status: "in_progress" as const },
    { title: "User onboarding flow", priority: "high" as const, status: "todo" as const },
    { title: "Security audit preparation", priority: "urgent" as const, status: "todo" as const },
  ];

  for (const task of taskData) {
    db.insert(schema.tasks).values({
      id: uuid(),
      orgId,
      teamId,
      assigneeId: userId,
      creatorId: userId,
      title: task.title,
      status: task.status,
      priority: task.priority,
    }).run();
  }

  db.insert(schema.notifications).values({
    id: uuid(),
    userId,
    type: "task_assigned",
    title: "New task assigned",
    message: "You've been assigned 'Implement WebSocket integration'",
    link: "/overview",
  }).run();

  db.insert(schema.activityLogs).values({
    id: uuid(),
    orgId,
    userId,
    action: "user.login",
    entityType: "user",
    entityId: userId,
    description: "Demo User logged in",
  }).run();

  const sampleFiles = [
    { name: "Project_Proposal.pdf", mime: "application/pdf", size: 2516582, originalName: "Project_Proposal.pdf" },
    { name: "Team_Photo.png", mime: "image/png", size: 4299161, originalName: "Team_Photo.png" },
    { name: "Budget_2026.xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 1258291, originalName: "Budget_2026.xlsx" },
    { name: "Meeting_Notes.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 876544, originalName: "Meeting_Notes.docx" },
    { name: "Logo_v2.svg", mime: "image/svg+xml", size: 126976, originalName: "Logo_v2.svg" },
  ];

  for (const file of sampleFiles) {
    const fileId = uuid();
    db.insert(schema.fileAttachments).values({
      id: fileId,
      orgId,
      uploaderId: userId,
      name: file.name,
      originalName: file.originalName,
      mimeType: file.mime,
      size: file.size,
      storagePath: `seed/${file.name}`,
    }).run();
  }

  const taskIds = db.select({ id: schema.tasks.id }).from(schema.tasks).all();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayMs = 86400000;

  const timeEntryData = [
    { dateOffset: 0, startHour: 9, duration: 120, desc: "Working on dashboard layout", taskIdx: 0 },
    { dateOffset: 0, startHour: 13, duration: 90, desc: "WebSocket integration", taskIdx: 1 },
    { dateOffset: -1, startHour: 10, duration: 180, desc: "API documentation", taskIdx: 2 },
    { dateOffset: -1, startHour: 14, duration: 60, desc: "Login page styling fixes", taskIdx: 3 },
    { dateOffset: -2, startHour: 8, duration: 240, desc: "Database optimization", taskIdx: 5 },
    { dateOffset: -3, startHour: 9, duration: 150, desc: "CI/CD pipeline setup", taskIdx: 4 },
  ];

  for (const entry of timeEntryData) {
    const entryDate = new Date(today.getTime() + entry.dateOffset * dayMs);
    const start = new Date(entryDate.getTime() + entry.startHour * 3600000);
    const end = new Date(start.getTime() + entry.duration * 60000);
    db.insert(schema.timeEntries).values({
      id: uuid(),
      userId,
      orgId,
      taskId: taskIds[entry.taskIdx]?.id,
      date: entryDate,
      startTime: start,
      endTime: end,
      duration: entry.duration,
      description: entry.desc,
      billable: true,
    }).run();
  }

  console.log("Database seeded successfully");
  console.log("Demo credentials: demo@myworkspace.io / password123");
}

async function main() {
  await migrate();
  await seed();
}

main().catch(console.error);
