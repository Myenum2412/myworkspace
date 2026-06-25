import { connectDb, mongoose } from "./index.js";
import { v4 as uuid } from "uuid";
import { User } from "./models/User.js";
import { Organization } from "./models/Organization.js";
import { OrgMember } from "./models/OrgMember.js";
import { Team } from "./models/Team.js";
import { TeamMember } from "./models/TeamMember.js";
import { Task } from "./models/Task.js";
import { Notification } from "./models/Notification.js";
import { ActivityLog } from "./models/ActivityLog.js";
import { Counter } from "./models/Counter.js";
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
    Counter.deleteMany({}),
  ]);

  const hashedPassword = await bcrypt.hash("password123", 10);
  const userId = uuid();
  const orgId = uuid();

  const session = await mongoose.startSession();
  let demoUser: any;
  let org: any;

  try {
    await session.withTransaction(async () => {
      const [createdUser] = await User.create([{
        id: userId,
        userNumber: 1,
        orgId,
        name: "Demo User",
        email: "demo@myworkspace.io",
        emailVerified: true,
        password: hashedPassword,
        status: "offline",
        role: "admin",
      }], { session });
      demoUser = createdUser;

      const [createdOrg] = await Organization.create([{
        id: orgId,
        name: "Demo Organization",
        slug: "demo-org",
        plan: "pro",
        ownerId: userId,
      }], { session });
      org = createdOrg;

      await OrgMember.create([{
        orgId,
        userId,
        role: "admin",
        joinedAt: new Date("2026-01-15"),
      }], { session });
    }, {
      readPreference: "primary",
      readConcern: { level: "local" },
      writeConcern: { w: "majority" },
    });
  } finally {
    await session.endSession();
  }

  await Counter.create({ name: "userNumber", seq: 1 });

  const team = await Team.create({
    orgId,
    name: "Engineering",
    description: "Product engineering team",
  });

  await TeamMember.create({
    orgId,
    teamId: team._id,
    userId,
    role: "lead",
  });

  const tasks = await Task.insertMany([
    { orgId, teamId: team._id, creatorId: userId, title: "Set up CI/CD pipeline", status: "in_progress", priority: "high", dueDate: new Date("2026-06-20"), createdAt: new Date("2026-06-10") },
    { orgId, teamId: team._id, creatorId: userId, assigneeId: userId, title: "Design system migration", status: "todo", priority: "medium", dueDate: new Date("2026-06-25"), createdAt: new Date("2026-06-11") },
    { orgId, teamId: team._id, creatorId: userId, title: "API rate limiting", status: "review", priority: "urgent", dueDate: new Date("2026-06-18"), createdAt: new Date("2026-06-09") },
    { orgId, teamId: team._id, creatorId: userId, assigneeId: userId, title: "Unit test coverage for auth module", status: "done", priority: "medium", dueDate: new Date("2026-06-15"), createdAt: new Date("2026-06-05") },
    { orgId, teamId: team._id, creatorId: userId, title: "Database indexing optimization", status: "todo", priority: "low", dueDate: new Date("2026-07-01"), createdAt: new Date("2026-06-12") },
    { orgId, teamId: team._id, creatorId: userId, assigneeId: userId, title: "User dashboard redesign", status: "in_progress", priority: "high", dueDate: new Date("2026-06-22"), createdAt: new Date("2026-06-08") },
    { orgId, teamId: team._id, creatorId: userId, title: "WebSocket notification system", status: "cancelled", priority: "medium", dueDate: new Date("2026-06-12"), createdAt: new Date("2026-06-01") },
    { orgId, teamId: team._id, creatorId: userId, assigneeId: userId, title: "Performance audit", status: "review", priority: "high", dueDate: new Date("2026-06-19"), createdAt: new Date("2026-06-07") },
  ]);

  await Notification.insertMany([
    { userId, orgId, createdBy: userId, type: "task_assigned", title: "New task assigned", message: "You've been assigned 'API rate limiting'", read: false, link: "/tasks", createdAt: new Date("2026-06-09") },
    { userId, orgId, createdBy: userId, type: "task_updated", title: "Task status changed", message: "'Set up CI/CD pipeline' moved to In Progress", read: false, link: "/tasks", createdAt: new Date("2026-06-10") },
    { userId, orgId, createdBy: userId, type: "mention", title: "You were mentioned", message: "Demo User mentioned you in 'Design system migration'", read: true, link: "/tasks", createdAt: new Date("2026-06-11") },
    { userId, orgId, createdBy: userId, type: "system", title: "Welcome to MyWorkSpace", message: "Your account has been created successfully", read: true, createdAt: new Date("2026-06-01") },
    { userId, orgId, createdBy: userId, type: "status_change", title: "Task completed", message: "'Unit test coverage for auth module' is now Done", read: false, link: "/tasks", createdAt: new Date("2026-06-15") },
  ]);

  await ActivityLog.insertMany([
    { orgId, userId, createdBy: userId, action: "create", entityType: "task", entityId: tasks[0]._id.toString(), description: "Created task 'Set up CI/CD pipeline'", createdAt: new Date("2026-06-10") },
    { orgId, userId, createdBy: userId, action: "update", entityType: "task", entityId: tasks[0]._id.toString(), description: "Updated task 'Set up CI/CD pipeline' status to in_progress", createdAt: new Date("2026-06-10") },
    { orgId, userId, createdBy: userId, action: "create", entityType: "task", entityId: tasks[1]._id.toString(), description: "Created task 'Design system migration'", createdAt: new Date("2026-06-11") },
    { orgId, userId, createdBy: userId, action: "create", entityType: "task", entityId: tasks[3]._id.toString(), description: "Created task 'Unit test coverage for auth module'", createdAt: new Date("2026-06-05") },
    { orgId, userId, createdBy: userId, action: "complete", entityType: "task", entityId: tasks[3]._id.toString(), description: "Completed task 'Unit test coverage for auth module'", createdAt: new Date("2026-06-15") },
  ]);

  console.log("Seed complete!");
  console.log("Demo credentials: demo@myworkspace.io / password123");
  console.log(`User ID: ${userId}`);
  console.log(`Org ID: ${orgId}`);
  console.log(`Team ID: ${team._id}`);

  await mongoose.disconnect();
}

seed().catch(console.error);
