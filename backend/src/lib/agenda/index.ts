import { Agenda } from "agenda";
import { MongoBackend } from "@agendajs/mongo-backend";
import { env } from "../../config/env.js";
import { Session } from "../db/models/Session.js";

let agenda: Agenda | null = null;

export async function initializeAgenda() {
  const backend = new MongoBackend({
    address: env.MONGODB_URI,
    collection: "agenda_jobs",
    options: {
      tls: true,
      tlsAllowInvalidCertificates: true,
    },
  });

  agenda = new Agenda({
    backend,
    defaultConcurrency: 5,
    defaultLockLifetime: 60000,
  });

  agenda.define("close-stale-sessions", async (job: any, done: any) => {
    const staleThreshold = new Date(Date.now() - 30 * 60 * 1000);
    const staleSessions = await Session.find({
      logoutTime: { $exists: false },
      updatedAt: { $lt: staleThreshold },
      currentStatus: { $ne: "offline" },
    }).lean();

    if (staleSessions.length === 0) { done(); return; }

    const now = new Date();
    const bulkOps = staleSessions.map((session) => {
      const lastTransition = session.statusTransitions?.[session.statusTransitions.length - 1];
      const breakDuration = lastTransition?.status === "break"
        ? now.getTime() - new Date(lastTransition.timestamp).getTime()
        : 0;

      return {
        updateOne: {
          filter: { _id: session._id },
          update: {
            $push: { statusTransitions: { status: "offline" as const, timestamp: now } },
            $set: {
              logoutTime: now,
              currentStatus: "offline" as const,
              totalBreakDuration: (session.totalBreakDuration || 0) + breakDuration,
              duration: now.getTime() - new Date(session.loginTime).getTime() - ((session.totalBreakDuration || 0) + breakDuration),
            },
          },
        },
      };
    });

    await Session.bulkWrite(bulkOps);
    console.log(`✦ Agenda: closed ${staleSessions.length} stale session(s)`);
    done();
  });

  agenda.define("session-daily-report", async (job: any, done: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sessions = await Session.find({
      loginTime: { $gte: today, $lt: tomorrow },
    })
      .populate("userId", "name email")
      .lean();

    if (sessions.length > 0) {
      console.log(`✦ Agenda: daily session report - ${sessions.length} session(s) today`);
      for (const s of sessions) {
        console.log(`  - ${(s.userId as any)?.name || s.userId}: ${Math.round((s.duration || 0) / 60000)} min active`);
      }
    }
    done();
  });

  await agenda.start();

  await agenda.every("15 minutes", "close-stale-sessions");
  await agenda.every("0 0 * * *", "session-daily-report");

  console.log("✦ Agenda.js scheduler initialized");
  return agenda;
}

export function getAgenda(): Agenda | null {
  return agenda;
}
