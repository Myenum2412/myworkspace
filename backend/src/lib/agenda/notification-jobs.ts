import type { Agenda } from "agenda";
import { registerNotificationJobs, scheduleNotificationJobs } from "../../services/notification-scheduler.service.js";

export function setupNotificationJobs(agenda: Agenda): void {
  registerNotificationJobs(agenda);
  scheduleNotificationJobs(agenda);
}
