const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const mailFrom = process.env.MAIL_FROM || "MyWorkspace <welcome@myworkspace.myenum.in>";
const appUrl = process.env.APP_URL || "http://localhost:3000";

async function callBackendEmailEndpoint(endpoint: string, data: Record<string, unknown>): Promise<void> {
  try {
    const response = await fetch(`${apiUrl}/api/auth${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[mail] Failed to send email via backend:`, msg);
    throw err;
  }
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  await callBackendEmailEndpoint("/send-welcome-email", { email: to, name });
}

export async function sendOrganizationInviteEmail(
  to: string,
  name: string,
  orgName: string,
  inviteUrl: string
): Promise<void> {
  await callBackendEmailEndpoint("/send-organization-invite-email", { email: to, name, orgName, inviteUrl });
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  verificationUrl: string
): Promise<void> {
  await callBackendEmailEndpoint("/send-verification-email", { email: to, name, verificationUrl });
}

export async function sendClientWelcomeEmail(
  to: string,
  clientName: string,
  username: string,
  tempPassword: string,
  loginUrl: string
): Promise<void> {
  await callBackendEmailEndpoint("/send-client-welcome-email", { email: to, clientName, username, tempPassword, loginUrl });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetLink: string
): Promise<void> {
  await callBackendEmailEndpoint("/send-password-reset-email", { email: to, name, resetLink });
}