import { db, connectToMongo } from "./index";
import { v4 as uuid } from "uuid";
import { hash } from "bcryptjs";

async function seed() {
  console.log("Seeding MongoDB...");
  await connectToMongo();

  const now = new Date();
  const password = await hash("password123", 12);

  // Clean slate
  await db.collection("users").deleteMany({});
  await db.collection("organizations").deleteMany({});
  await db.collection("org_members").deleteMany({});
  await db.collection("teams").deleteMany({});
  await db.collection("team_members").deleteMany({});
  await db.collection("tasks").deleteMany({});
  await db.collection("notifications").deleteMany({});
  await db.collection("activity_logs").deleteMany({});
  await db.collection("file_attachments").deleteMany({});
  await db.collection("time_entries").deleteMany({});

  // ── Users ──
  const users = [
    { id: "super-admin-id", name: "Super Admin", email: "admin@myenum.in", role: "SUPER_ADMIN", status: "online" },
    { id: "org-admin-id", name: "Org Admin", email: "orgadmin@acme.com", role: "admin", status: "online" },
    { id: "user-1-id", name: "Alice Johnson", email: "alice@acme.com", role: "manager", status: "online" },
    { id: "user-2-id", name: "Bob Smith", email: "bob@acme.com", role: "member", status: "offline" },
    { id: "user-3-id", name: "Carol White", email: "carol@acme.com", role: "member", status: "online" },
    { id: "user-4-id", name: "David Brown", email: "david@techcorp.com", role: "admin", status: "online" },
    { id: "user-5-id", name: "Eve Davis", email: "eve@techcorp.com", role: "member", status: "break" },
    { id: "user-6-id", name: "Frank Miller", email: "frank@startup.io", role: "admin", status: "online" },
    { id: "user-7-id", name: "Grace Lee", email: "grace@startup.io", role: "manager", status: "online" },
    { id: "user-8-id", name: "Henry Wilson", email: "henry@startup.io", role: "member", status: "offline" },
  ];

  for (const u of users) {
    await db.collection("users").insertOne({
      ...u, password, emailVerified: true, image: "",
      createdAt: now, updatedAt: now,
    });
  }

  // ── Organizations ──
  const orgs = [
    { id: "org-acme-id", name: "Acme Corporation", slug: "acme-corp", plan: "enterprise", domain: "acme.com" },
    { id: "org-techcorp-id", name: "TechCorp Inc", slug: "techcorp", plan: "pro", domain: "techcorp.com" },
    { id: "org-startup-id", name: "StartupIO", slug: "startup-io", plan: "starter", domain: "" },
  ];

  for (const o of orgs) {
    await db.collection("organizations").insertOne({
      ...o, logo: "", createdAt: now, updatedAt: now,
    });
  }

  // ── Org Members ──
  const members = [
    { orgId: "org-acme-id", userId: "org-admin-id", role: "admin" },
    { orgId: "org-acme-id", userId: "user-1-id", role: "manager" },
    { orgId: "org-acme-id", userId: "user-2-id", role: "member" },
    { orgId: "org-acme-id", userId: "user-3-id", role: "member" },
    { orgId: "org-techcorp-id", userId: "user-4-id", role: "admin" },
    { orgId: "org-techcorp-id", userId: "user-5-id", role: "member" },
    { orgId: "org-startup-id", userId: "user-6-id", role: "admin" },
    { orgId: "org-startup-id", userId: "user-7-id", role: "manager" },
    { orgId: "org-startup-id", userId: "user-8-id", role: "member" },
  ];

  for (const m of members) {
    await db.collection("org_members").insertOne({
      id: uuid(), ...m, joinedAt: new Date(now.getTime() - Math.random() * 30 * 86400000),
    });
  }

  // ── Teams ──
  const teams = [
    { id: "team-eng-id", orgId: "org-acme-id", name: "Engineering", description: "Core engineering team" },
    { id: "team-design-id", orgId: "org-acme-id", name: "Design", description: "Product design team" },
    { id: "team-backend-id", orgId: "org-techcorp-id", name: "Backend", description: "Backend services" },
    { id: "team-product-id", orgId: "org-startup-id", name: "Product", description: "Product team" },
  ];

  for (const t of teams) {
    await db.collection("teams").insertOne({ ...t, createdAt: now });
  }

  // ── Tasks ──
  const statuses = ["todo", "in_progress", "review", "done", "cancelled"] as const;
  const priorities = ["low", "medium", "high", "urgent"] as const;
  const taskTemplates = [
    "Implement user authentication", "Design landing page", "Setup CI/CD pipeline",
    "Write API documentation", "Fix login bug", "Add dark mode", "Optimize database queries",
    "Create onboarding flow", "Setup monitoring", "Implement file upload",
    "Add search functionality", "Refactor auth module", "Update dependencies",
    "Write unit tests", "Design notification system", "Implement billing integration",
    "Create admin dashboard", "Add export feature", "Setup email templates",
    "Performance audit", "Security review", "Mobile responsive fixes",
    "Add analytics tracking", "Implement SSO", "Create API endpoints",
  ];

  const allTasks = [];
  for (let i = 0; i < taskTemplates.length; i++) {
    const org = orgs[i % orgs.length];
    const creator = members.find((m) => m.orgId === org.id)!;
    const assignee = members.filter((m) => m.orgId === org.id)[Math.min(i % 3 + 1, members.filter((m) => m.orgId === org.id).length - 1)];
    const created = new Date(now.getTime() - (i + 1) * 86400000);
    allTasks.push({
      id: uuid(), orgId: org.id, teamId: teams.find((t) => t.orgId === org.id)?.id || teams[0].id,
      assigneeId: assignee.userId, creatorId: creator.userId,
      title: taskTemplates[i],
      description: `Description for: ${taskTemplates[i]}`,
      status: statuses[i % statuses.length],
      priority: priorities[i % priorities.length],
      dueDate: new Date(now.getTime() + (i + 1) * 43200000),
      createdAt: created, updatedAt: created,
    });
  }
  await db.collection("tasks").insertMany(allTasks);

  // ── Activity Logs ──
  const actions = [
    { action: "user.login", description: "User logged in" },
    { action: "task.created", description: "Created a new task" },
    { action: "task.completed", description: "Completed a task" },
    { action: "member.invited", description: "Invited a new member" },
    { action: "file.uploaded", description: "Uploaded a file" },
    { action: "settings.updated", description: "Updated organization settings" },
    { action: "task.assigned", description: "Assigned task to member" },
    { action: "member.role_changed", description: "Changed member role" },
  ];

  const allLogs = [];
  for (let i = 0; i < 30; i++) {
    const org = orgs[i % orgs.length];
    const member = members.find((m) => m.orgId === org.id)!;
    const act = actions[i % actions.length];
    allLogs.push({
      id: uuid(), orgId: org.id, userId: member.userId,
      action: act.action, entityType: "user", entityId: member.userId,
      description: `${users.find((u) => u.id === member.userId)?.name} ${act.description}`,
      metadata: null,
      createdAt: new Date(now.getTime() - i * 3600000 * (i % 12 + 1)),
    });
  }
  await db.collection("activity_logs").insertMany(allLogs);

  // ── Notifications ──
  for (let i = 0; i < 8; i++) {
    const user = users[i % users.length];
    await db.collection("notifications").insertOne({
      id: uuid(), userId: user.id,
      type: ["task_assigned", "member_joined", "task_completed", "mention"][i % 4],
      title: ["Task assigned", "New member", "Task done", "You were mentioned"][i % 4],
      message: `Notification ${i + 1} for ${user.name}`,
      read: i % 3 === 0, link: "/dashboard", metadata: null,
      createdAt: new Date(now.getTime() - i * 3600000),
    });
  }

  // ── File Attachments ──
  const fileNames = ["requirements.pdf", "design-mockup.png", "api-spec.yaml", "report-q1.xlsx", "architecture.png", "meeting-notes.txt", "budget-2026.xlsx", "roadmap.pdf"];
  for (let i = 0; i < fileNames.length; i++) {
    const org = orgs[i % orgs.length];
    const uploader = members.find((m) => m.orgId === org.id)!;
    await db.collection("file_attachments").insertOne({
      id: uuid(), orgId: org.id, uploaderId: uploader.userId,
      name: fileNames[i], originalName: fileNames[i],
      mimeType: fileNames[i].endsWith(".pdf") ? "application/pdf" : fileNames[i].endsWith(".png") ? "image/png" : "application/octet-stream",
      size: 1024 * (i + 1) * 50,
      storagePath: `/uploads/${fileNames[i]}`,
      createdAt: new Date(now.getTime() - i * 3600000),
    });
  }

  // ── Time Entries ──
  for (let i = 0; i < 12; i++) {
    const org = orgs[i % orgs.length];
    const member = members.find((m) => m.orgId === org.id)!;
    const day = new Date(now);
    day.setDate(day.getDate() - Math.floor(i / 2));
    day.setHours(9 + (i % 4), 0, 0, 0);
    const start = new Date(day);
    const end = new Date(day.getTime() + 3600000 * (1 + (i % 3)));
    await db.collection("time_entries").insertOne({
      id: uuid(), userId: member.userId, orgId: org.id,
      taskId: allTasks[i % allTasks.length]?.id || allTasks[0].id,
      date: day, startTime: start, endTime: end,
      duration: Math.round((end.getTime() - start.getTime()) / 60000),
      description: `Work session ${i + 1}`,
      billable: i % 2 === 0, createdAt: now, updatedAt: now,
    });
  }

  console.log("Seed complete!");
  console.log(`  Users: ${users.length}`);
  console.log(`  Orgs: ${orgs.length}`);
  console.log(`  Members: ${members.length}`);
  console.log(`  Tasks: ${allTasks.length}`);
  console.log(`  Activities: ${allLogs.length}`);
}

seed().catch(console.error);
