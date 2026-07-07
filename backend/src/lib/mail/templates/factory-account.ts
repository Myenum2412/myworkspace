import { EmailData } from "./types.js";

function ts(): string {
  return new Date().toLocaleString();
}

// 1. Welcome Email (User / Client / Employee Account Creation)
export const buildWelcomeEmail = (
  firstName: string,
  email: string,
  workspaceName: string,
  companyName: string | null,
  role: string,
  loginUrl: string,
  tempPassword?: string,
  providerIcon?: string
): EmailData => ({
  subject: "Welcome to MyWorkspace",
  previewText: `Your account has been created. Sign in with ${email}${tempPassword ? ' using the password provided below.' : '.'}`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Account", timestamp: ts(), action: "Welcome" },
  statusIndicator: { type: "success", label: "Account Active" },
  intro: [
    "Welcome to MyWorkspace. Your account has been successfully created and is now active.",
    tempPassword
      ? "Please use the credentials below to sign in. For security, change your password after your first login."
      : "Please verify your email to get started.",
  ],
  details: [
    { label: "Email", value: email },
    ...(tempPassword ? [{ label: "Temporary Password", value: tempPassword }] : []),
    { label: "Workspace", value: workspaceName },
    ...(companyName ? [{ label: "Company", value: companyName }] : []),
    { label: "Role", value: role },
    { label: "Status", value: "Active" },
  ],
  quickStart: [
    "Log in with your email and password",
    "Complete your profile",
    "Create your first project",
    "Invite your team",
    "Upload documents",
    ...(tempPassword ? ["Change your temporary password"] : []),
  ],
  features: [
    { title: "Project Management", description: "Organize tasks and track progress easily." },
    { title: "Team Collaboration", description: "Communicate seamlessly with your team." },
    { title: "Secure Authentication", description: "Your data is safe and protected." },
    { title: "Calendar & Tasks", description: "Stay on top of deadlines." },
    { title: "File Management", description: "Store and share documents." }
  ],
  button: {
    text: "Go to Workspace",
    url: loginUrl
  },
  ...(tempPassword ? { securityNotice: true as const, warning: "For security, change your temporary password after your first login." as const } : {}),
  providerIcon,
  socialLinks: {
    linkedin: "https://linkedin.com",
    twitter: "https://twitter.com",
    youtube: "https://youtube.com"
  },
  supportEmail: "support@workspace.com"
});

// 2. Email Verification
export const buildVerificationEmail = (
  firstName: string,
  verificationUrl: string
): EmailData => ({
  subject: "Verify your Email Address",
  previewText: "Please verify your email address to activate your account.",
  greeting: `Hi ${firstName},`,
  metadata: { module: "Account", timestamp: new Date().toLocaleString(), action: "Email Verification" },
  statusIndicator: { type: "warning", label: "Action Required" },
  intro: [
    "Thank you for signing up for Workspace. To get started, please verify your email address by clicking the button below."
  ],
  button: {
    text: "Verify Email",
    url: verificationUrl
  },
  outro: [
    `Or copy and paste this link into your browser: ${verificationUrl}`,
    "This link will expire in 24 hours."
  ],
  supportEmail: "support@workspace.com"
});

// 3. Account Successfully Verified
export const buildVerifiedEmail = (firstName: string, loginUrl: string): EmailData => ({
  subject: "Account Verified Successfully",
  greeting: `Hi ${firstName},`,
  metadata: { module: "Account", timestamp: new Date().toLocaleString(), action: "Verified" },
  statusIndicator: { type: "success", label: "Verified" },
  intro: ["Your email address has been successfully verified. You can now access all features of your Workspace."],
  button: { text: "Go to Workspace", url: loginUrl },
  supportEmail: "support@workspace.com"
});

// 4. Workspace Invitation
export const buildWorkspaceInvite = (
  firstName: string,
  inviterName: string,
  workspaceName: string,
  inviteUrl: string
): EmailData => ({
  subject: `You've been invited to join ${workspaceName}`,
  previewText: `${inviterName} has invited you to join ${workspaceName}`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Account", timestamp: new Date().toLocaleString(), action: "Invitation" },
  statusIndicator: { type: "info", label: "Invitation" },
  intro: [`${inviterName} has invited you to join the ${workspaceName} workspace.`],
  button: { text: "Accept Invitation", url: inviteUrl },
  supportEmail: "support@workspace.com"
});

// 5. Team Member Added
export const buildTeamMemberAdded = (firstName: string, teamName: string, loginUrl: string): EmailData => ({
  subject: `You've been added to ${teamName}`,
  previewText: `You have been added to the ${teamName} team`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Account", timestamp: new Date().toLocaleString(), action: "Team Added" },
  statusIndicator: { type: "info", label: "Team Member" },
  intro: [`You have been added to the ${teamName} team. You can now view and collaborate on team projects.`],
  button: { text: "View Team Dashboard", url: loginUrl },
  supportEmail: "support@workspace.com"
});

// 6. First Login Congratulations
export const buildFirstLogin = (firstName: string): EmailData => ({
  subject: "Congratulations on your first login",
  previewText: "Welcome aboard! You just logged in for the first time.",
  greeting: `Hi ${firstName},`,
  metadata: { module: "Account", timestamp: new Date().toLocaleString(), action: "First Login" },
  statusIndicator: { type: "success", label: "First Login" },
  intro: ["We noticed you just logged in for the first time. Welcome aboard!", "Here are a few tips to get the most out of your workspace."],
  quickStart: ["Set up your avatar", "Review notification preferences", "Create your first task"],
  supportEmail: "support@workspace.com"
});

// 7. Getting Started Guide
export const buildGettingStarted = (firstName: string, docsUrl: string): EmailData => ({
  subject: "Getting Started with Workspace",
  previewText: "Ready to supercharge your productivity?",
  greeting: `Hi ${firstName},`,
  metadata: { module: "Account", timestamp: new Date().toLocaleString(), action: "Getting Started" },
  statusIndicator: { type: "info", label: "Guide" },
  intro: ["Ready to supercharge your productivity? Check out our quick start guide to learn the basics."],
  button: { text: "Read the Guide", url: docsUrl },
  supportEmail: "support@workspace.com"
});

// 8. Profile Completion Reminder
export const buildProfileReminder = (firstName: string, profileUrl: string): EmailData => ({
  subject: "Complete your profile to stand out",
  previewText: "Your profile is missing a few details.",
  greeting: `Hi ${firstName},`,
  metadata: { module: "Account", timestamp: new Date().toLocaleString(), action: "Profile Reminder" },
  statusIndicator: { type: "warning", label: "Incomplete Profile" },
  intro: ["We noticed your profile is missing a few details. Complete your profile to help your team know you better."],
  button: { text: "Update Profile", url: profileUrl },
  supportEmail: "support@workspace.com"
});

// 9. Workspace Setup Complete
export const buildWorkspaceSetupComplete = (workspaceName: string, loginUrl: string): EmailData => ({
  subject: `${workspaceName} setup is complete!`,
  previewText: `Your workspace "${workspaceName}" is ready to use.`,
  greeting: "Hello,",
  metadata: { module: "Account", timestamp: new Date().toLocaleString(), action: "Setup Complete" },
  statusIndicator: { type: "success", label: "Ready" },
  intro: [`Your workspace "${workspaceName}" has been successfully configured and is ready to use.`],
  button: { text: "Open Workspace", url: loginUrl },
  supportEmail: "support@workspace.com"
});

// 10. Password Changed Successfully
export const buildPasswordChanged = (firstName: string): EmailData => ({
  subject: "Your password was changed",
  previewText: "This is a confirmation that your password has been changed.",
  greeting: `Hi ${firstName},`,
  metadata: { module: "Account", timestamp: new Date().toLocaleString(), action: "Password Changed" },
  statusIndicator: { type: "info", label: "Password Updated" },
  intro: ["This is a confirmation that the password for your account has been changed successfully."],
  securityNotice: true,
  supportEmail: "support@workspace.com"
});

// 11. New Device Login Alert
export const buildNewDeviceLogin = (firstName: string, deviceName: string, location: string): EmailData => ({
  subject: "New login to your Workspace account",
  previewText: "We noticed a new login from an unrecognized device.",
  greeting: `Hi ${firstName},`,
  metadata: { module: "Account", timestamp: new Date().toLocaleString(), action: "New Device" },
  statusIndicator: { type: "warning", label: "New Device Login" },
  intro: [
    "We noticed a new login to your account from an unrecognized device.",
  ],
  details: [
    { label: "Device", value: deviceName },
    { label: "Location", value: location },
  ],
  securityNotice: true,
  supportEmail: "support@workspace.com"
});

// 12. Account Security Alert
export const buildSecurityAlert = (firstName: string, alertDetails: string): EmailData => ({
  subject: "Security Alert: Suspicious Activity Detected",
  previewText: "We detected unusual activity on your account.",
  greeting: `Hi ${firstName},`,
  metadata: { module: "Account", timestamp: new Date().toLocaleString(), action: "Security Alert" },
  statusIndicator: { type: "error", label: "Security Alert" },
  intro: ["We detected unusual activity on your account."],
  details: [{ label: "Details", value: alertDetails }],
  securityNotice: true,
  supportEmail: "support@workspace.com"
});

// 13. Subscription Activated
export const buildSubscriptionActivated = (firstName: string, planName: string, loginUrl: string): EmailData => ({
  subject: "Subscription Activated",
  previewText: `Your ${planName} subscription is now active.`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Account", timestamp: new Date().toLocaleString(), action: "Subscription Activated" },
  statusIndicator: { type: "success", label: planName },
  intro: [`Thank you for upgrading! Your ${planName} subscription is now active.`],
  button: { text: "View Billing", url: loginUrl },
  supportEmail: "support@workspace.com"
});

// 14. Trial Started
export const buildTrialStarted = (firstName: string, daysLeft: number, loginUrl: string): EmailData => ({
  subject: "Welcome to your Free Trial",
  previewText: `Your ${daysLeft}-day free trial has started.`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Account", timestamp: new Date().toLocaleString(), action: "Trial Started" },
  statusIndicator: { type: "success", label: "Free Trial" },
  intro: [`Your ${daysLeft}-day free trial has started. Explore all premium features now!`],
  button: { text: "Explore Features", url: loginUrl },
  supportEmail: "support@workspace.com"
});

// 15. Trial Ending Soon
export const buildTrialEndingSoon = (firstName: string, daysLeft: number, upgradeUrl: string): EmailData => ({
  subject: `Your trial ends in ${daysLeft} days`,
  previewText: "Your free trial is almost over.",
  greeting: `Hi ${firstName},`,
  metadata: { module: "Account", timestamp: new Date().toLocaleString(), action: "Trial Ending" },
  statusIndicator: { type: "warning", label: `${daysLeft} days left` },
  intro: ["Your free trial is almost over. Upgrade your plan to keep access to all premium features."],
  button: { text: "Upgrade Now", url: upgradeUrl },
  supportEmail: "support@workspace.com"
});

// 16. Subscription Renewal Confirmation
export const buildRenewalConfirmation = (firstName: string, amount: string): EmailData => ({
  subject: "Subscription Renewed",
  previewText: "Your subscription has been renewed.",
  greeting: `Hi ${firstName},`,
  metadata: { module: "Account", timestamp: new Date().toLocaleString(), action: "Renewed" },
  statusIndicator: { type: "success", label: "Renewed" },
  intro: [`Your subscription has been successfully renewed for ${amount}. Thank you for your continued support!`],
  supportEmail: "support@workspace.com"
});

// 17. Password Reset Request
export const buildPasswordReset = (firstName: string, resetUrl: string): EmailData => ({
  subject: "Password Reset Request",
  previewText: "We received a request to reset your password.",
  greeting: `Hi ${firstName},`,
  metadata: { module: "Account", timestamp: new Date().toLocaleString(), action: "Password Reset" },
  statusIndicator: { type: "warning", label: "Reset Requested" },
  intro: ["We received a request to reset your password. Click the button below to choose a new one."],
  button: { text: "Reset Password", url: resetUrl },
  outro: ["This link will expire in 1 hour.", "If you didn't request this, you can safely ignore this email."],
  supportEmail: "support@workspace.com"
});

// 18. Password Reset Successful
export const buildPasswordResetSuccess = (firstName: string, loginUrl: string): EmailData => ({
  subject: "Password Reset Successful",
  previewText: "Your password has been successfully reset.",
  greeting: `Hi ${firstName},`,
  metadata: { module: "Account", timestamp: new Date().toLocaleString(), action: "Reset Successful" },
  statusIndicator: { type: "success", label: "Password Updated" },
  intro: ["Your password has been successfully reset. You can now log in with your new password."],
  button: { text: "Log In", url: loginUrl },
  supportEmail: "support@workspace.com"
});

// 19. Account Deactivated
export const buildAccountDeactivated = (firstName: string): EmailData => ({
  subject: "Account Deactivated",
  previewText: "Your account has been deactivated.",
  greeting: `Hi ${firstName},`,
  metadata: { module: "Account", timestamp: new Date().toLocaleString(), action: "Deactivated" },
  statusIndicator: { type: "error", label: "Deactivated" },
  intro: ["Your Workspace account has been deactivated by an administrator. If you believe this is a mistake, please contact support."],
  supportEmail: "support@workspace.com"
});

// 20. Account Reactivated
export const buildAccountReactivated = (firstName: string, loginUrl: string): EmailData => ({
  subject: "Account Reactivated",
  previewText: "Your account has been reactivated.",
  greeting: `Hi ${firstName},`,
  metadata: { module: "Account", timestamp: ts(), action: "Reactivated" },
  statusIndicator: { type: "success", label: "Active" },
  intro: ["Good news! Your Workspace account has been reactivated. You can now log in and access your data."],
  button: { text: "Log In", url: loginUrl },
  supportEmail: "support@workspace.com"
});

// 21. User/Client Onboarding Reminder
export const buildAccountOnboardingReminder = (
  firstName: string,
  email: string,
  workspaceName: string,
  role: string,
  daysSinceCreation: number,
  loginUrl: string
): EmailData => ({
  subject: `Reminder: Complete Your ${workspaceName} Setup`,
  previewText: `Your ${workspaceName} account (${email}) was created ${daysSinceCreation} days ago. Complete your setup to get started.`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Account", timestamp: ts(), action: "Onboarding Reminder" },
  statusIndicator: { type: "warning", label: "Action Required" },
  intro: [
    `Your ${workspaceName} account was created ${daysSinceCreation} day${daysSinceCreation > 1 ? 's' : ''} ago, but you haven't completed the onboarding process yet.`,
    role === "Client"
      ? "Please sign in to access your client portal and start collaborating on projects."
      : "Please sign in to set up your workspace and start collaborating with your team.",
  ],
  details: [
    { label: "Workspace", value: workspaceName },
    { label: "Email", value: email },
    { label: "Role", value: role },
    { label: "Account Created", value: `${daysSinceCreation} day${daysSinceCreation > 1 ? 's' : ''} ago` },
  ],
  quickStart: [
    "Log in with your email and password",
    "Set up your profile",
    "Explore available projects",
    "Connect with your team",
  ],
  button: { text: "Log In Now", url: loginUrl },
  warning: "Please complete your onboarding to avoid account deactivation.",
  supportEmail: "support@workspace.com",
});
