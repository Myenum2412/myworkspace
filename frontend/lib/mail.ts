import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY || "";
const mailFrom = process.env.MAIL_FROM || "MyWorkspace <welcome@myworkspace.myenum.in>";
const appUrl = process.env.APP_URL || "http://localhost:3000";

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  if (!resend) {
    console.warn("[mail] RESEND_API_KEY not set — skipping welcome email");
    return;
  }
  try {
    await resend.emails.send({
      from: mailFrom,
      to,
      subject: `Welcome to MyWorkspace, ${name}!`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 28px; color: #1a1a2e; margin: 0;">MyWorkspace</h1>
          </div>
          <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
            <h1 style="font-size: 22px; color: #1a1a2e; margin: 0 0 16px;">Welcome aboard, ${name}! 👋</h1>
            <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px;">
              Your MyWorkspace account has been created successfully. You now have access to a powerful workspace to manage your team, projects, files, and more.
            </p>
            <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="font-size: 14px; color: #166534; margin: 0; font-weight: 500;">Here's what you can do:</p>
              <ul style="font-size: 14px; color: #15803d; margin: 8px 0 0; padding-left: 20px; line-height: 1.8;">
                <li>Set up your organization profile</li>
                <li>Invite team members</li>
                <li>Create and manage projects</li>
                <li>Upload and share files securely</li>
                <li>Track time and monitor productivity</li>
              </ul>
            </div>
            <a href="${appUrl}/orgmenu"
               style="display: inline-block; padding: 12px 28px; background: #3b82f6; color: #ffffff; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 500;">
              Open Dashboard →
            </a>
            <p style="margin-top: 24px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
              If you did not create this account, you can safely ignore this email.
            </p>
          </div>
          <p style="text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8;">
            © ${new Date().getFullYear()} MyWorkspace. All rights reserved.
          </p>
        </div>
      `,
    });
    console.log(`[mail] Welcome email sent to ${to}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[mail] Failed to send welcome email to ${to}:`, msg);
  }
}
