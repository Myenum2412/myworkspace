import { Resend } from "resend";
import { env } from "../../config/env.js";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { buildEmailHtml } from "./templates/builder.js";
import * as Factory from "./templates/factory.js";
import { AttachmentItem } from "./templates/types.js";

const resend = new Resend(env.RESEND_API_KEY);

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
  console.warn(
    "[mail] WARNING: Using Resend test sender (onboarding@resend.dev). " +
    "Emails will ONLY be delivered to the email address verified with your Resend API key. " +
    "Set MAIL_FROM to a verified domain (e.g., 'noreply@yourdomain.com') to send to any recipient."
  );
}

// Ensure the logo path is correct relative to the backend execution context
const logoPath = path.resolve(process.cwd(), "../frontend/public/logo.jpeg");
const defaultAttachments: AttachmentItem[] = fs.existsSync(logoPath) 
  ? [{ filename: "logo.jpeg", path: logoPath, cid: "workspace_logo" }]
  : [];

async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
  attachments: AttachmentItem[] = defaultAttachments
): Promise<void> {
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: env.MAIL_FROM,
        to,
        subject,
        html: htmlBody,
        attachments: attachments.map(a => ({
          filename: a.filename,
          path: a.path,
          content: a.content,
          cid: a.cid
        }))
      });
      console.log(`[mail] Email sent to ${to} (messageId: ${info.messageId})`);
      return;
    } catch (error: any) {
      console.error(`[mail] Failed to send email via SMTP to ${to}:`, error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  if (!env.RESEND_API_KEY) {
    console.warn("[mail] Neither SMTP nor RESEND_API_KEY configured - skipping email");
    return;
  }

  // Map attachments for Resend
  const resendAttachments = attachments.map(a => {
    let content: string | Buffer = "";
    if (a.content) {
      content = a.content;
    } else if (a.path && fs.existsSync(a.path)) {
      content = fs.readFileSync(a.path);
    }
    return {
      filename: a.filename,
      content,
    };
  }).filter(a => a.content !== "");

  const { data, error } = await resend.emails.send({
    from: env.MAIL_FROM,
    to,
    subject,
    html: htmlBody,
    attachments: resendAttachments.length > 0 ? resendAttachments : undefined
  });

  if (error) {
    console.error(`[mail] Failed to send email via Resend to ${to}:`, error);
    throw new Error(`Failed to send email via Resend: ${error.message}`);
  }

  console.log(`[mail] Email sent to ${to} (id: ${data?.id})`);
}

// Backward compatible methods
export async function sendPasswordResetEmail(to: string, name: string, resetLink: string): Promise<void> {
  const data = Factory.buildPasswordReset(name, resetLink);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const data = Factory.buildWelcomeEmail(name, to, "MyWorkspace", null, "User", `${env.APP_URL}/login`);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendOrganizationInviteEmail(to: string, name: string, orgName: string, inviteUrl: string): Promise<void> {
  const data = Factory.buildWorkspaceInvite(name, "An administrator", orgName, inviteUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendVerificationEmail(to: string, name: string, verificationUrl: string): Promise<void> {
  const data = Factory.buildVerificationEmail(name, verificationUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendClientWelcomeEmail(to: string, clientName: string, username: string, tempPassword: string, loginUrl: string): Promise<void> {
  const data = Factory.buildWelcomeEmail(clientName, to, "MyWorkspace", null, "Client", loginUrl);
  // Add temp password details securely
  data.intro = [
    ...data.intro || [],
    "An administrator has created a client account for you.",
    `Username: ${username}`,
    `Temporary Password: ${tempPassword}`
  ];
  data.securityNotice = true;
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

// New 20 Email Functions
export async function sendUserWelcomeEmail(to: string, firstName: string, workspaceName: string, companyName: string | null, role: string, loginUrl: string, providerIcon?: string): Promise<void> {
  const data = Factory.buildWelcomeEmail(firstName, to, workspaceName, companyName, role, loginUrl, providerIcon);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendUserVerificationEmail(to: string, firstName: string, verificationUrl: string): Promise<void> {
  const data = Factory.buildVerificationEmail(firstName, verificationUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendVerifiedEmail(to: string, firstName: string, loginUrl: string): Promise<void> {
  const data = Factory.buildVerifiedEmail(firstName, loginUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendWorkspaceInvite(to: string, firstName: string, inviterName: string, workspaceName: string, inviteUrl: string): Promise<void> {
  const data = Factory.buildWorkspaceInvite(firstName, inviterName, workspaceName, inviteUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendTeamMemberAdded(to: string, firstName: string, teamName: string, loginUrl: string): Promise<void> {
  const data = Factory.buildTeamMemberAdded(firstName, teamName, loginUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendFirstLogin(to: string, firstName: string): Promise<void> {
  const data = Factory.buildFirstLogin(firstName);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendGettingStarted(to: string, firstName: string, docsUrl: string): Promise<void> {
  const data = Factory.buildGettingStarted(firstName, docsUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendProfileReminder(to: string, firstName: string, profileUrl: string): Promise<void> {
  const data = Factory.buildProfileReminder(firstName, profileUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendWorkspaceSetupComplete(to: string, workspaceName: string, loginUrl: string): Promise<void> {
  const data = Factory.buildWorkspaceSetupComplete(workspaceName, loginUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendPasswordChanged(to: string, firstName: string): Promise<void> {
  const data = Factory.buildPasswordChanged(firstName);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendNewDeviceLogin(to: string, firstName: string, deviceName: string, location: string): Promise<void> {
  const data = Factory.buildNewDeviceLogin(firstName, deviceName, location);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendSecurityAlert(to: string, firstName: string, alertDetails: string): Promise<void> {
  const data = Factory.buildSecurityAlert(firstName, alertDetails);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendSubscriptionActivated(to: string, firstName: string, planName: string, loginUrl: string): Promise<void> {
  const data = Factory.buildSubscriptionActivated(firstName, planName, loginUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendTrialStarted(to: string, firstName: string, daysLeft: number, loginUrl: string): Promise<void> {
  const data = Factory.buildTrialStarted(firstName, daysLeft, loginUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendTrialEndingSoon(to: string, firstName: string, daysLeft: number, upgradeUrl: string): Promise<void> {
  const data = Factory.buildTrialEndingSoon(firstName, daysLeft, upgradeUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendRenewalConfirmation(to: string, firstName: string, amount: string): Promise<void> {
  const data = Factory.buildRenewalConfirmation(firstName, amount);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendPasswordReset(to: string, firstName: string, resetUrl: string): Promise<void> {
  const data = Factory.buildPasswordReset(firstName, resetUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendPasswordResetSuccess(to: string, firstName: string, loginUrl: string): Promise<void> {
  const data = Factory.buildPasswordResetSuccess(firstName, loginUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendAccountDeactivated(to: string, firstName: string): Promise<void> {
  const data = Factory.buildAccountDeactivated(firstName);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendAccountReactivated(to: string, firstName: string, loginUrl: string): Promise<void> {
  const data = Factory.buildAccountReactivated(firstName, loginUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}