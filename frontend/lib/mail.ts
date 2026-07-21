const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const mailFrom = process.env.MAIL_FROM || "MyWorkspace <welcome@myworkspace.myenum.in>";
const appUrl = process.env.APP_URL || "http://localhost:3000";

export type EmailSendResult = { success: boolean; emailStatus: "sent" | "failed" | "skipped"; error?: string };

async function callBackendEmailEndpoint(endpoint: string, data: Record<string, unknown>): Promise<EmailSendResult> {
  try {
    const response = await fetch(`${apiUrl}/api/auth${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const body = await response.json().catch(() => ({ message: "Unknown error" }));

    if (!response.ok) {
      throw new Error(body.message || `HTTP ${response.status}`);
    }

    return { success: true, emailStatus: body.emailStatus || "sent" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[mail] Failed to send email via backend:`, msg);
    return { success: false, emailStatus: "failed", error: msg };
  }
}

export async function sendWelcomeEmail(to: string, name: string): Promise<EmailSendResult> {
  return callBackendEmailEndpoint("/send-welcome-email", { email: to, name });
}

export async function sendOrganizationInviteEmail(
  to: string,
  name: string,
  orgName: string,
  inviteUrl: string
): Promise<EmailSendResult> {
  return callBackendEmailEndpoint("/send-organization-invite-email", { email: to, name, orgName, inviteUrl });
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  verificationUrl: string
): Promise<EmailSendResult> {
  return callBackendEmailEndpoint("/send-verification-email", { email: to, name, verificationUrl });
}

export async function sendClientWelcomeEmail(
  to: string,
  clientName: string,
  username: string,
  tempPassword: string,
  loginUrl: string,
  staffInfo?: string[],
  documentsInfo?: string[]
): Promise<EmailSendResult> {
  return callBackendEmailEndpoint("/send-client-welcome-email", {
    email: to,
    clientName,
    username,
    tempPassword,
    loginUrl,
    staffInfo,
    documentsInfo,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetLink: string
): Promise<EmailSendResult> {
  return callBackendEmailEndpoint("/send-password-reset-email", { email: to, name, resetLink });
}

export async function sendEmployeeOnboarded(
  to: string,
  firstName: string,
  email: string,
  workspaceName: string,
  loginUrl: string,
  tempPassword: string
): Promise<EmailSendResult> {
  return callBackendEmailEndpoint("/send-employee-onboarded-email", { email: to, firstName, userEmail: email, workspaceName, loginUrl, tempPassword });
}