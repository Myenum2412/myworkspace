import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const mailFrom = process.env.MAIL_FROM || "MyWorkspace <noreply@myenum.in>";

export type EmailSendResult = { success: boolean; emailStatus: "sent" | "failed" | "skipped"; error?: string };

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  if (!smtpHost) return null;
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
  return transporter;
}

export async function sendEmailDirect(to: string, subject: string, htmlBody: string): Promise<EmailSendResult> {
  const transport = getTransporter();
  if (!transport) {
    const msg = "CRITICAL: SMTP not configured (SMTP_HOST missing) — email delivery skipped";
    console.error(`[email] ${msg}`);
    return { success: false, emailStatus: "skipped", error: msg };
  }

  try {
    const info = await transport.sendMail({
      from: mailFrom,
      to,
      subject,
      html: htmlBody,
    });
    console.log(`[email] Email sent to ${to} via SMTP (messageId: ${info.messageId})`);
    return { success: true, emailStatus: "sent" };
  } catch (error: any) {
    const errMsg = `Failed to send email to ${to}: ${error.message || "unknown error"}`;
    console.error(`[email] ${errMsg}`);
    return { success: false, emailStatus: "failed", error: errMsg };
  }
}

export function buildEmployeeOnboardedHtml(
  firstName: string,
  email: string,
  workspaceName: string,
  loginUrl: string,
  tempPassword: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f4f5f7;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-block;background:#10b981;color:#fff;width:48px;height:48px;border-radius:50%;line-height:48px;font-size:24px;">&#10003;</div>
      </div>
      <h1 style="color:#1a1a2e;font-size:24px;text-align:center;margin:0 0 8px;">Welcome to ${workspaceName}</h1>
      <p style="color:#6b7280;font-size:14px;text-align:center;margin:0 0 32px;">Your account has been created successfully</p>

      <p style="color:#374151;font-size:15px;line-height:1.6;">Hi ${firstName},</p>
      <p style="color:#374151;font-size:15px;line-height:1.6;">Your account for <strong>${workspaceName}</strong> has been created. Please use the credentials below to sign in.</p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:24px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:13px;">Workspace</td>
            <td style="padding:8px 0;color:#1a1a2e;font-size:14px;font-weight:600;text-align:right;">${workspaceName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:13px;">Email</td>
            <td style="padding:8px 0;color:#1a1a2e;font-size:14px;font-weight:600;text-align:right;">${email}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:13px;">Temporary Password</td>
            <td style="padding:8px 0;color:#1a1a2e;font-size:14px;font-weight:600;font-family:monospace;text-align:right;">${tempPassword}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:13px;">Status</td>
            <td style="padding:8px 0;color:#10b981;font-size:14px;font-weight:600;text-align:right;">Active</td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin:32px 0;">
        <a href="${loginUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Log In Now</a>
      </div>

      <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:16px;margin:24px 0;">
        <p style="color:#92400e;font-size:13px;margin:0;"><strong>&#9888; Security Notice:</strong> Please change your temporary password after your first login.</p>
      </div>

      <h3 style="color:#1a1a2e;font-size:15px;margin:24px 0 12px;">Quick Start</h3>
      <ul style="color:#374151;font-size:14px;line-height:1.8;padding-left:20px;">
        <li>Log in with your email and temporary password</li>
        <li>Set up your profile and upload a photo</li>
        <li>Change your temporary password</li>
        <li>Review your notification preferences</li>
        <li>Explore the workspace and available projects</li>
      </ul>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px;">
      <p style="color:#9ca3af;font-size:12px;text-align:center;">If you have questions, contact your administrator or email support@workspace.com</p>
    </div>
  </div>
</body>
</html>`;
}
