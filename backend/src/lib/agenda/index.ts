import { Agenda } from "agenda";
import { MongoBackend } from "@agendajs/mongo-backend";
import { env } from "../../config/env.js";
import { Session } from "../db/models/Session.js";

let agenda: Agenda | null = null;

export async function initializeAgenda() {
  const backend = new MongoBackend({
    address: env.MONGODB_URI,
    collection: "agenda_jobs",
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
    });

    for (const session of staleSessions) {
      const lastTransition = session.statusTransitions.length > 0
        ? session.statusTransitions[session.statusTransitions.length - 1]
        : null;

      session.statusTransitions.push({
        status: "offline",
        timestamp: new Date(),
      });

      if (lastTransition && lastTransition.status === "break") {
        session.totalBreakDuration += Date.now() - lastTransition.timestamp.getTime();
      }

      session.logoutTime = new Date();
      session.currentStatus = "offline";
      session.duration = session.logoutTime.getTime() - session.loginTime.getTime() - session.totalBreakDuration;
      await session.save();
    }

    if (staleSessions.length > 0) {
      console.log(`✦ Agenda: closed ${staleSessions.length} stale session(s)`);
    }
    done();
  });

  agenda.define("session-daily-report", async (job: any, done: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sessions = await Session.find({
      loginTime: { $gte: today, $lt: tomorrow },
    }).populate("userId", "name email");

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
