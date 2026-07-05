import { Resend } from "resend";
import { env } from "../../config/env.js";

const resend = new Resend(env.RESEND_API_KEY);

async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.warn("[mail] RESEND_API_KEY not configured - skipping email");
    return;
  }

  const result = await resend.emails.send({
    from: env.MAIL_FROM,
    to,
    subject,
    html: htmlBody,
  });

  console.log(`[mail] Email sent to ${to}`);
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetLink: string
): Promise<void> {
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; color: #1a1a2e; margin: 0;">MyWorkspace</h1>
      </div>
      <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
        <h1 style="font-size: 20px; color: #1a1a2e; margin: 0 0 16px;">Reset your password</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 8px;">Hi ${name},</p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px;">
          We received a request to reset your MyWorkspace password. Click the button below to choose a new one.
        </p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${resetLink}"
             style="display: inline-block; padding: 12px 28px; background: #3b82f6; color: #ffffff; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 500;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0;">
          This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.
        </p>
      </div>
      <p style="text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8;">
        © ${new Date().getFullYear()} MyWorkspace. All rights reserved.
      </p>
    </div>
  `;
  await sendEmail(to, "Reset your MyWorkspace password", html);
}

export async function sendWelcomeEmail(
  to: string,
  name: string
): Promise<void> {
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <div style="text-align:center;margin-bottom:24px;">
        <img src="https://cdn-icons-png.flaticon.com/512/833/833314.png" width="40" height="40" alt="MyWorkspace" style="border-radius:10px;" />
        <h1 style="margin:8px 0 0;font-size:18px;color:#1a1a2e;">MyWorkspace</h1>
      </div>

      <div style="background:#ffffff;border-radius:12px;padding:24px;border:1px solid #e2e8f0;">
        <h2 style="margin:0 0 12px;font-size:18px;color:#1a1a2e;">Welcome, ${name}!</h2>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#475569;">
          Your account is ready. Start managing projects, tasks, and your team.
        </p>

        <div style="background:#f8fafc;border-radius:8px;padding:12px;border:1px solid #e2e8f0;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="https://cdn-icons-png.flaticon.com/512/5968/5968534.png" width="20" height="20" alt="" />
            <span style="font-size:13px;color:#64748b;">${to}</span>
          </div>
        </div>

        <a href="${env.APP_URL}/orgmenu"
           style="display:block;padding:10px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;text-align:center;">
          Get Started
        </a>
      </div>

      <p style="margin-top:16px;font-size:11px;color:#94a3b8;text-align:center;">
        If you didn't create this account, ignore this email.<br>
        &copy; ${new Date().getFullYear()} MyWorkspace
      </p>
    </div>
  `;
  await sendEmail(to, `Welcome to MyWorkspace, ${name}!`, html);
}

export async function sendOrganizationInviteEmail(
  to: string,
  name: string,
  orgName: string,
  inviteUrl: string
): Promise<void> {
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; color: #1a1a2e; margin: 0;">MyWorkspace</h1>
      </div>
      <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
        <h1 style="font-size: 20px; color: #1a1a2e; margin: 0 0 16px;">You've been invited!</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 8px;">Hi ${name},</p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px;">
          You have been invited to join <strong>${orgName}</strong> on MyWorkspace. Click the button below to access your workspace.
        </p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${inviteUrl}"
             style="display: inline-block; padding: 12px 28px; background: #3b82f6; color: #ffffff; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 500;">
            Open Workspace
          </a>
        </div>
        <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0;">
          If you were not expecting this invitation, you can safely ignore this email.
        </p>
      </div>
      <p style="text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8;">
        &copy; ${new Date().getFullYear()} MyWorkspace. All rights reserved.
      </p>
    </div>
  `;
  await sendEmail(to, `You've been invited to ${orgName} on MyWorkspace`, html);
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  verificationUrl: string
): Promise<void> {
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; color: #1a1a2e; margin: 0;">MyWorkspace</h1>
      </div>
      <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
        <h1 style="font-size: 20px; color: #1a1a2e; margin: 0 0 16px;">Verify your email address</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 8px;">Hi ${name},</p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px;">
          Thanks for creating a MyWorkspace account. Please verify your email address by clicking the button below.
        </p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${verificationUrl}"
             style="display: inline-block; padding: 12px 28px; background: #3b82f6; color: #ffffff; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 500;">
            Verify Email
          </a>
        </div>
        <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0;">
          This link will expire in 24 hours. If you did not create this account, you can safely ignore this email.
        </p>
      </div>
      <p style="text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8;">
        © ${new Date().getFullYear()} MyWorkspace. All rights reserved.
      </p>
    </div>
  `;
  await sendEmail(to, "Verify your MyWorkspace email address", html);
}

export async function sendClientWelcomeEmail(
  to: string,
  clientName: string,
  username: string,
  tempPassword: string,
  loginUrl: string
): Promise<void> {
  const html = `
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
  `;
  await sendEmail(to, `Welcome to MyWorkspace — Your Client Account is Ready`, html);
}