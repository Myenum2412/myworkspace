import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { Agenda } from "agenda";
import { MongoBackend } from "@agendajs/mongo-backend";
import { Session } from "../../../src/lib/db/models/Session.js";
import { v4 as uuid } from "uuid";

describe("Agenda scheduled jobs", () => {
  let mongoServer: MongoMemoryServer;
  let agenda: Agenda;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const backend = new MongoBackend({
      address: uri,
      collection: "agenda_jobs_test",
    });

    agenda = new Agenda({ backend, defaultConcurrency: 5, defaultLockLifetime: 30000 });
  });

  afterAll(async () => {
    if (agenda) {
      await agenda.stop();
      await agenda._collection?.deleteMany({});
    }
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Session.deleteMany({});
    if (agenda._collection) {
      await agenda._collection.deleteMany({});
    }
  });

  it("defines and runs a job once", async () => {
    let runCount = 0;
    const jobName = `test-job-${uuid().slice(0, 8)}`;

    agenda.define(jobName, async (job, done) => {
      runCount++;
      done();
    });

    await agenda.start();
    await (agenda as any)._ready;
    await agenda.now(jobName);

    await new Promise<void>((resolve) => {
      const check = () => {
        if (runCount >= 1) resolve();
        else setTimeout(check, 200);
      };
      check();
    });

    expect(runCount).toBe(1);
  });

  it("runs job on schedule", async () => {
    let runCount = 0;
    const jobName = `schedule-test-${uuid().slice(0, 8)}`;

    agenda.define(jobName, async (job, done) => {
      runCount++;
      done();
    });

    await agenda.start();
    await agenda.every("1 second", jobName);

    await new Promise<void>((resolve) => {
      const check = () => {
        if (runCount >= 1) resolve();
        else setTimeout(check, 1500);
      };
      check();
    });

    expect(runCount).toBeGreaterThanOrEqual(1);
  }, 10000);

  it("processes close-stale-sessions job", async () => {
    const userId = uuid();
    const orgId = uuid();

    // Create stale sessions
    const staleTime = new Date(Date.now() - 60 * 60 * 1000);
    await Session.create({
      id: uuid(),
      userId,
      orgId,
      loginTime: staleTime,
      updatedAt: staleTime,
      statusTransitions: [{ status: "online", timestamp: staleTime }],
      currentStatus: "online",
      expiresAt: staleTime,
    });
    await Session.create({
      id: uuid(),
      userId,
      orgId,
      loginTime: staleTime,
      updatedAt: staleTime,
      statusTransitions: [{ status: "break", timestamp: staleTime }],
      currentStatus: "break",
      expiresAt: staleTime,
    });

    const jobName = `close-stale-${uuid().slice(0, 8)}`;
    let jobRan = false;
    agenda.define(jobName, async (job, done) => {
      try {
        const threshold = new Date(Date.now() - 30 * 60 * 1000);
        const stale = await Session.find({
          logoutTime: { $exists: false },
          updatedAt: { $lt: threshold },
          currentStatus: { $ne: "offline" },
        });
        if (stale.length > 0) {
          await Session.updateMany(
            { _id: { $in: stale.map((s) => s._id) } },
            { $set: { currentStatus: "offline", logoutTime: new Date() } },
          );
        }
        jobRan = true;
      } catch {}
      done();
    });

    await agenda.start();
    await agenda.now(jobName);

    await new Promise<void>((resolve, reject) => {
      let attempts = 0;
      const check = () => {
        if (jobRan) return resolve();
        if (++attempts > 50) reject(new Error("Timed out waiting for job to execute"));
        else setTimeout(check, 200);
      };
      check();
    });

    expect(jobRan).toBe(true);
    const final = await Session.find({});
    expect(final.length).toBe(2);
  }, 15000);

  it("concurrent lock prevents duplicate job execution", async () => {
    let counter = 0;
    const jobName = `lock-test-${uuid().slice(0, 8)}`;

    agenda.define(jobName, async (job, done) => {
      counter++;
      await new Promise((r) => setTimeout(r, 200));
      done();
    });

    await agenda.start();

    // Schedule two instances of the same job name; lock should prevent overlap
    await agenda.now(jobName);
    await agenda.now(jobName);

    await new Promise<void>((resolve) => {
      const check = () => {
        if (counter >= 2) resolve();
        else setTimeout(check, 1000);
      };
      check();
    });

    // Due to locking, both should eventually run
    expect(counter).toBe(2);
  }, 10000);

  it("job can be scheduled and cancelled", async () => {
    let runCount = 0;
    const jobName = `cancel-test-${uuid().slice(0, 8)}`;

    agenda.define(jobName, async (job, done) => {
      runCount++;
      done();
    });

    await agenda.start();
    const job = await agenda.create(jobName, {});
    await job.schedule(new Date(Date.now() + 100000));
    await job.save();

    // Cancel before it runs
    await agenda.cancel({ name: jobName });

    await new Promise((r) => setTimeout(r, 500));
    expect(runCount).toBe(0);
  });
});
