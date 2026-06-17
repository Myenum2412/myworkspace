import { db, connectToMongo } from "./index";
import { v4 as uuid } from "uuid";
import { hash } from "bcryptjs";

async function seed() {
  console.log("Seeding MongoDB...");
  await connectToMongo();

  const userId = "demo-user-id";
  const orgId = "demo-org-id";
  const teamId = "demo-team-id";
  const now = new Date();

  const password = await hash("password123", 12);

  await db.collection("users").deleteMany({});
  await db.collection("users").insertOne({
    id: userId, name: "Demo User", email: "demo@example.com",
    password, status: "online", role: "admin",
    emailVerified: true, image: "",
    createdAt: now, updatedAt: now,
  });

  await db.collection("organizations").deleteMany({});
  await db.collection("organizations").insertOne({
    id: orgId, name: "Demo Organization", slug: "demo-org",
    plan: "pro", logo: "", domain: "",
    createdAt: now, updatedAt: now,
  });

  await db.collection("org_members").deleteMany({});
  await db.collection("org_members").insertOne({
    id: uuid(), orgId, userId, role: "admin", joinedAt: now,
  });

  await db.collection("teams").deleteMany({});
  await db.collection("teams").insertOne({
    id: teamId, orgId, name: "Engineering", description: "Core engineering team",
    createdAt: now,
  });

  await db.collection("team_members").deleteMany({});
  await db.collection("team_members").insertOne({
    id: uuid(), teamId, userId, role: "lead",
  });

  const statuses = ["todo", "in_progress", "review", "done", "cancelled"] as const;
  const priorities = ["low", "medium", "high", "urgent"] as const;

  await db.collection("tasks").deleteMany({});
  const tasks = [];
  for (let i = 1; i <= 8; i++) {
    const created = new Date(now.getTime() - i * 86400000);
    tasks.push({
      id: uuid(), orgId, teamId, assigneeId: userId, creatorId: userId,
      title: `Demo Task ${i}`,
      description: `Description for demo task ${i}`,
      status: statuses[i % statuses.length],
      priority: priorities[i % priorities.length],
      dueDate: new Date(now.getTime() + i * 86400000),
      createdAt: created, updatedAt: created,
    });
  }
  await db.collection("tasks").insertMany(tasks);

  await db.collection("notifications").deleteMany({});
  await db.collection("notifications").insertOne({
    id: uuid(), userId,
    type: "task_assigned", title: "Welcome!", message: "Your account is ready.",
    read: false, link: "/dashboard", metadata: null,
    createdAt: now,
  });

  await db.collection("activity_logs").deleteMany({});
  await db.collection("activity_logs").insertOne({
    id: uuid(), orgId, userId,
    action: "user.login", entityType: "user", entityId: userId,
    description: "Demo user logged in",
    metadata: null, createdAt: now,
  });

  await db.collection("file_attachments").deleteMany({});
  const fileDocs = [];
  for (let i = 1; i <= 5; i++) {
    fileDocs.push({
      id: uuid(), orgId, uploaderId: userId,
      name: `file-${i}.txt`, originalName: `File ${i}.txt`,
      mimeType: "text/plain", size: 1024 * i,
      storagePath: `/uploads/file-${i}.txt`,
      createdAt: new Date(now.getTime() - i * 3600000),
    });
  }
  await db.collection("file_attachments").insertMany(fileDocs);

  await db.collection("time_entries").deleteMany({});
  const timeEntries = [];
  for (let i = 1; i <= 6; i++) {
    const day = new Date(now);
    day.setDate(day.getDate() - Math.floor((i - 1) / 2));
    day.setHours(9 + i, 0, 0, 0);
    const start = new Date(day);
    const end = new Date(day.getTime() + 3600000 + i * 60000);
    timeEntries.push({
      id: uuid(), userId, orgId, taskId: tasks[i % tasks.length]?.id || tasks[0].id,
      date: day, startTime: start, endTime: end,
      duration: 60 + i, description: `Work session ${i}`,
      billable: i % 2 === 0, createdAt: now, updatedAt: now,
    });
  }
  await db.collection("time_entries").insertMany(timeEntries);

  console.log("Seed complete!");
}

seed().catch(console.error);
