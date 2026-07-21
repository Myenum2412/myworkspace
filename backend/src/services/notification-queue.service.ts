import { eventProducer } from "../lib/queue/producer.js";
import { registerHandler } from "../lib/queue/consumer.js";
import { EmailLog } from "../lib/db/models/EmailLog.js";
import { logger } from "../lib/logger/index.js";
import { sendEmail } from "../lib/mail/sender.js";
import { env } from "../config/env.js";

const MAX_DELIVERY_ATTEMPTS = 5;

export async function enqueueEmailNotification(
  params: {
    userId: string;
    orgId: string;
    type: string;
    title: string;
    message?: string;
    link?: string;
    category?: string;
    correlationId?: string;
    to?: string;
    html?: string;
    subject?: string;
  }
): Promise<void> {
  try {
    await eventProducer.notificationSend({
      userId: params.userId,
      orgId: params.orgId,
      type: params.type,
      title: params.title,
      message: params.message || "",
      link: params.link,
    });
  } catch (err) {
    logger.error({ err, type: params.type }, "Failed to enqueue email notification");
  }
}

export function registerEmailConsumer(): void {
  try {
    registerHandler("notification.email.send", async (_msg: any, data: any) => {
      const payload = data as Record<string, any>;
      const to = payload.userId;
      if (!to || to === "_system") return { success: true, skipped: true };

      const existingLog = await EmailLog.findOne({
        correlationId: payload.correlationId,
      }).lean();

      if (existingLog) {
        return { success: true, existing: true };
      }

      const emailLog = await EmailLog.create({
        orgId: payload.orgId || "unknown",
        userId: payload.userId,
        to: payload.email || payload.userId,
        subject: payload.subject || payload.title || "Notification",
        template: payload.type || "generic",
        status: "queued",
        provider: (env.SMTP_HOST ? "smtp" : "resend") as "smtp" | "resend",
        deliveryAttempts: 0,
        correlationId: payload.correlationId,
        notificationId: payload.notificationId,
        category: payload.category || "system",
      });

      try {
        await EmailLog.updateOne(
          { _id: emailLog._id },
          { status: "sending", deliveryAttempts: 1, lastAttemptAt: new Date() }
        );

        const html = payload.html || buildFallbackEmail(payload);
        const subject = payload.subject || payload.title || "Notification";

        await sendEmail(
          payload.email || payload.userId,
          subject,
          html,
        );

        await EmailLog.updateOne(
          { _id: emailLog._id },
          { status: "sent", deliveredAt: new Date() }
        );

        return { success: true };
      } catch (err: any) {
        const log = await EmailLog.findById(emailLog._id).lean();
        const attempts = (log?.deliveryAttempts || 0) + 1;

        if (attempts >= MAX_DELIVERY_ATTEMPTS) {
          await EmailLog.updateOne(
            { _id: emailLog._id },
            { status: "failed", error: err.message, deliveryAttempts: attempts }
          );
          return { success: false, error: err.message, deadLetter: true };
        }

        await EmailLog.updateOne(
          { _id: emailLog._id },
          { status: "queued", error: err.message, deliveryAttempts: attempts, lastAttemptAt: new Date() }
        );

        throw err;
      }
    });

    logger.info("Email consumer registered with retry/DLQ support");
  } catch (err) {
    logger.error({ err }, "Failed to register email consumer");
  }
}

function buildFallbackEmail(payload: Record<string, any>): string {
  const title = payload.title || "Notification";
  const message = payload.message || "";
  const link = payload.link;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f4f4f5;color:#18181b}
.container{max-width:600px;margin:0 auto;padding:20px}
.card{background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.header{text-align:center;padding-bottom:20px;border-bottom:1px solid #e4e4e7}
.header h1{font-size:20px;margin:0;color:#18181b}
.body{padding:20px 0;line-height:1.6;color:#3f3f46}
.button{display:inline-block;padding:12px 24px;background-color:#18181b;color:#fff;text-decoration:none;border-radius:8px;font-weight:500;margin-top:16px}
.footer{text-align:center;padding-top:20px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a}
@media(prefers-color-scheme:dark){body{background:#09090b;color:#f4f4f5}.card{background:#18181b}.header{border-color:#27272a}.body{color:#a1a1aa}.footer{border-color:#27272a;color:#71717a}.button{background-color:#f4f4f5;color:#18181b}}
</style></head><body><div class="container"><div class="card"><div class="header"><h1>${escapeHtml(title)}</h1></div><div class="body">${escapeHtml(message)}${link ? `<br><a href="${escapeHtml(link)}" class="button">View Details</a>` : ""}</div><div class="footer"><p>This is an automated notification from your workspace.</p></div></div></div></body></html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
