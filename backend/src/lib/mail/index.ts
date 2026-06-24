import { Resend } from "resend";
import { env } from "../../config/env.js";

if (!env.RESEND_API_KEY) {
  console.warn("RESEND_API_KEY not set — email sending is disabled");
}
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  if (!resend) {
    console.warn("Resend not configured — skipping welcome email");
    return;
  }
  await resend!.emails.send({
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

export async function sendClientWelcomeEmail(
  to: string,
  clientName: string,
  username: string,
  tempPassword: string,
  loginUrl: string
): Promise<void> {
  if (!resend) {
    console.warn("Resend not configured — skipping client welcome email");
    return;
  }
  await resend!.emails.send({
    from: env.MAIL_FROM,
    to,
    subject: `Welcome to MyWorkspace — Your Client Account is Ready`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
          <tr>
            <td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
                <tr>
                  <td style="padding:32px 32px 0;">
                    <h1 style="margin:0 0 8px;font-size:24px;color:#1a1a2e;">Welcome to MyWorkspace</h1>
                    <p style="margin:0 0 24px;font-size:16px;color:#64748b;">Your client portal is ready</p>
                    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">Hi ${clientName},</p>
                    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">
                      An administrator has created a client account for you. Use the credentials below to log in and access your portal.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
                      <tr>
                        <td style="padding:20px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-size:13px;color:#64748b;padding-bottom:4px;">Login URL</td>
                            </tr>
                            <tr>
                              <td style="font-size:14px;color:#1a1a2e;padding-bottom:16px;word-break:break-all;">
                                <a href="${loginUrl}" style="color:#3b82f6;text-decoration:none;">${loginUrl}</a>
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:13px;color:#64748b;padding-bottom:4px;">Username / Email</td>
                            </tr>
                            <tr>
                              <td style="font-size:14px;color:#1a1a2e;padding-bottom:16px;font-weight:600;">${username}</td>
                            </tr>
                            <tr>
                              <td style="font-size:13px;color:#64748b;padding-bottom:4px;">Temporary Password</td>
                            </tr>
                            <tr>
                              <td style="font-size:14px;color:#1a1a2e;padding-bottom:0;font-weight:600;letter-spacing:0.5px;">${tempPassword}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 32px 0;">
                    <p style="margin:0 0 8px;font-size:14px;color:#ef4444;font-weight:600;">Important</p>
                    <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;line-height:1.6;color:#334155;">
                      <li>You will be required to change your password after first login.</li>
                      <li>Please verify your email address when prompted.</li>
                      <li>For security, do not share these credentials with anyone.</li>
                    </ul>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 32px 32px;">
                    <a href="${loginUrl}"
                       style="display:inline-block;padding:12px 28px;background:#3b82f6;color:#ffffff;border-radius:8px;text-decoration:none;font-size:15px;font-weight:500;">
                      Log In to Your Portal
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 32px 32px;border-top:1px solid #e2e8f0;">
                    <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">
                      If you did not expect this email, you can safely ignore it.<br>
                      &copy; ${new Date().getFullYear()} MyWorkspace. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}
