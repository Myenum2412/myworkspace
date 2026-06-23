import { Resend } from "resend";
import { env } from "../../config/env.js";

const resend = new Resend(env.RESEND_API_KEY || "re_7NZa9FCD_K5vnAhL7rwgxgTAVSgwSDXSi");

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  await resend.emails.send({
    from: env.MAIL_FROM,
    to,
    subject: `Welcome to MyWorkspace, ${name}!`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 22px; margin: 0 0 16px;">Welcome aboard, ${name}!</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #1f2937;">
          Your MyWorkspace account is ready. Jump in, set up your org, and start tracking work in real time.
        </p>
        <a href="${env.APP_URL}/orgmenu"
           style="display: inline-block; margin-top: 16px; padding: 10px 18px; background: #3b82f6; color: #fff; border-radius: 8px; text-decoration: none; font-size: 14px;">
          Open Dashboard
        </a>
        <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">
          If you did not create this account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
