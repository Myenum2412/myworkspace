import { connectDb, mongoose } from "./index.js";
import { User } from "./models/User.js";
import { Organization } from "./models/Organization.js";
import { OrgMember } from "./models/OrgMember.js";
import { Team } from "./models/Team.js";
import { TeamMember } from "./models/TeamMember.js";
import { Task } from "./models/Task.js";
import { Notification } from "./models/Notification.js";
import { ActivityLog } from "./models/ActivityLog.js";
import bcrypt from "bcryptjs";

async function seed() {
  await connectDb();

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Organization.deleteMany({}),
    OrgMember.deleteMany({}),
    Team.deleteMany({}),
    TeamMember.deleteMany({}),
    Task.deleteMany({}),
    Notification.deleteMany({}),
    ActivityLog.deleteMany({}),
    mongoose.model("Session").deleteMany({}),
    mongoose.model("Message").deleteMany({}),
    mongoose.model("ApiKey").deleteMany({}),
    mongoose.model("SsoConfig").deleteMany({}),
  ]);

  const hashedPassword = await bcrypt.hash("password123", 10);

  const demoUser = await User.create({
    name: "Demo User",
    email: "demo@myworkspace.io",
    emailVerified: true,
    password: hashedPassword,
    status: "offline",
    role: "admin",
  });

  const org = await Organization.create({
    name: "Demo Organization",
    slug: "demo-org",
    plan: "pro",
  });

  await OrgMember.create({
    orgId: org._id,
    userId: demoUser._id,
    role: "admin",
    joinedAt: new Date("2026-01-15"),
  });

  const team = await Team.create({
    orgId: org._id,
    name: "Engineering",
    description: "Product engineering team",
  });

  await TeamMember.create({
    teamId: team._id,
    userId: demoUser._id,
    role: "lead",
  });

  const tasks = await Task.insertMany([
    { orgId: org._id, teamId: team._id, creatorId: demoUser._id, title: "Set up CI/CD pipeline", status: "in_progress", priority: "high", dueDate: new Date("2026-06-20"), createdAt: new Date("2026-06-10") },
    { orgId: org._id, teamId: team._id, creatorId: demoUser._id, assigneeId: demoUser._id, title: "Design system migration", status: "todo", priority: "medium", dueDate: new Date("2026-06-25"), createdAt: new Date("2026-06-11") },
    { orgId: org._id, teamId: team._id, creatorId: demoUser._id, title: "API rate limiting", status: "review", priority: "urgent", dueDate: new Date("2026-06-18"), createdAt: new Date("2026-06-09") },
    { orgId: org._id, teamId: team._id, creatorId: demoUser._id, assigneeId: demoUser._id, title: "Unit test coverage for auth module", status: "done", priority: "medium", dueDate: new Date("2026-06-15"), createdAt: new Date("2026-06-05") },
    { orgId: org._id, teamId: team._id, creatorId: demoUser._id, title: "Database indexing optimization", status: "todo", priority: "low", dueDate: new Date("2026-07-01"), createdAt: new Date("2026-06-12") },
    { orgId: org._id, teamId: team._id, creatorId: demoUser._id, assigneeId: demoUser._id, title: "User dashboard redesign", status: "in_progress", priority: "high", dueDate: new Date("2026-06-22"), createdAt: new Date("2026-06-08") },
    { orgId: org._id, teamId: team._id, creatorId: demoUser._id, title: "WebSocket notification system", status: "cancelled", priority: "medium", dueDate: new Date("2026-06-12"), createdAt: new Date("2026-06-01") },
    { orgId: org._id, teamId: team._id, creatorId: demoUser._id, assigneeId: demoUser._id, title: "Performance audit", status: "review", priority: "high", dueDate: new Date("2026-06-19"), createdAt: new Date("2026-06-07") },
  ]);

  await Notification.insertMany([
    { userId: demoUser._id, type: "task_assigned", title: "New task assigned", message: "You've been assigned 'API rate limiting'", read: false, link: "/tasks", createdAt: new Date("2026-06-09") },
    { userId: demoUser._id, type: "task_updated", title: "Task status changed", message: "'Set up CI/CD pipeline' moved to In Progress", read: false, link: "/tasks", createdAt: new Date("2026-06-10") },
    { userId: demoUser._id, type: "mention", title: "You were mentioned", message: "Demo User mentioned you in 'Design system migration'", read: true, link: "/tasks", createdAt: new Date("2026-06-11") },
    { userId: demoUser._id, type: "system", title: "Welcome to MyWorkSpace", message: "Your account has been created successfully", read: true, createdAt: new Date("2026-06-01") },
    { userId: demoUser._id, type: "status_change", title: "Task completed", message: "'Unit test coverage for auth module' is now Done", read: false, link: "/tasks", createdAt: new Date("2026-06-15") },
  ]);

  await ActivityLog.insertMany([
    { orgId: org._id, userId: demoUser._id, action: "create", entityType: "task", entityId: tasks[0]._id.toString(), description: "Created task 'Set up CI/CD pipeline'", createdAt: new Date("2026-06-10") },
    { orgId: org._id, userId: demoUser._id, action: "update", entityType: "task", entityId: tasks[0]._id.toString(), description: "Updated task 'Set up CI/CD pipeline' status to in_progress", createdAt: new Date("2026-06-10") },
    { orgId: org._id, userId: demoUser._id, action: "create", entityType: "task", entityId: tasks[1]._id.toString(), description: "Created task 'Design system migration'", createdAt: new Date("2026-06-11") },
    { orgId: org._id, userId: demoUser._id, action: "create", entityType: "task", entityId: tasks[3]._id.toString(), description: "Created task 'Unit test coverage for auth module'", createdAt: new Date("2026-06-05") },
    { orgId: org._id, userId: demoUser._id, action: "complete", entityType: "task", entityId: tasks[3]._id.toString(), description: "Completed task 'Unit test coverage for auth module'", createdAt: new Date("2026-06-15") },
  ]);

  console.log("Seed complete!");
  console.log("Demo credentials: demo@myworkspace.io / password123");
  console.log(`User ID: ${demoUser._id}`);
  console.log(`Org ID: ${org._id}`);
  console.log(`Team ID: ${team._id}`);

  await mongoose.disconnect();
}

seed().catch(console.error);
