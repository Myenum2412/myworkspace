import { Resend } from "resend";
import { env } from "../../config/env.js";
import nodemailer from "nodemailer";
import { logger } from "../logger/index.js";

let resend: Resend | null = null;

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  : null;

const RESEND_TEST_SENDER = "onboarding@resend.dev";

if (!transporter && env.MAIL_FROM === RESEND_TEST_SENDER) {
  logger.warn("[mail] Using Resend test sender");
}

export async function sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: env.MAIL_FROM,
        to,
        subject,
        html: htmlBody,
      });
      logger.info({ to, messageId: info.messageId }, "Email sent via SMTP");
      return;
    } catch (error: any) {
      logger.error({ err: error, to }, "Failed to send email via SMTP");
      throw new Error(`Failed to send email via SMTP: ${error.message}`);
    }
  }

  if (!env.RESEND_API_KEY) {
    const msg = "[mail] Neither SMTP nor RESEND_API_KEY configured";
    console.error(msg);
    throw new Error(msg);
  }

  if (!resend) {
    resend = new Resend(env.RESEND_API_KEY);
  }

  let lastError: any;
  const fromAddresses = [env.MAIL_FROM, RESEND_TEST_SENDER];

  for (const from of fromAddresses) {
    try {
      const { data, error } = await resend.emails.send({
        from,
        to,
        subject,
        html: htmlBody,
      });

      if (!error) {
        logger.info({ to, from, id: data?.id }, "Email sent via Resend");
        return;
      }
      lastError = error;
      logger.warn({ err: error, to, from }, "Failed to send via Resend");
    } catch (err) {
      lastError = err;
    }
  }

  const errMsg = `Failed to send email to ${to}: ${lastError?.message || "unknown error"}`;
  logger.error({ to, error: lastError?.message }, "Email delivery failed");
  throw new Error(errMsg);
}
