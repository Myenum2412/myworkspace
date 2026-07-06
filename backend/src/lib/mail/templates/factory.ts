import { EmailData } from "./types.js";

// 1. Welcome Email
export const buildWelcomeEmail = (
  firstName: string,
  email: string,
  workspaceName: string,
  companyName: string | null,
  role: string,
  loginUrl: string,
  providerIcon?: string
): EmailData => ({
  subject: "Welcome to MyWorkspace",
  previewText: "Your account has been created successfully.",
  greeting: `Hi ${firstName},`,
  intro: [
    "Welcome to MyWorkspace. Your enterprise account has been successfully provisioned and is now active.",
    "We are delighted to welcome you to our professional suite of productivity tools. Below is a detailed overview of your newly configured account:"
  ],
  accountInfo: [
    { label: "Full Name", value: firstName },
    { label: "Registered Email", value: email },
    { label: "Workspace Name", value: workspaceName },
    ...(companyName ? [{ label: "Company Name", value: companyName }] : []),
    { label: "Signup Date", value: new Date().toLocaleDateString() },
    { label: "User Role", value: role },
    { label: "Account Status", value: "Active" },
  ],
  quickStart: [
    "Complete your profile",
    "Create your first project",
    "Invite your team",
    "Upload documents",
    "Configure workspace settings",
    "Enable notifications"
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
  outro: [
    "If you have any questions, our support team is always here to help."
  ],
  securityNotice: false,
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
  greeting: `Hi ${firstName},`,
  intro: [`${inviterName} has invited you to join the ${workspaceName} workspace.`],
  button: { text: "Accept Invitation", url: inviteUrl },
  supportEmail: "support@workspace.com"
});

// 5. Team Member Added
export const buildTeamMemberAdded = (firstName: string, teamName: string, loginUrl: string): EmailData => ({
  subject: `You've been added to ${teamName}`,
  greeting: `Hi ${firstName},`,
  intro: [`You have been added to the ${teamName} team. You can now view and collaborate on team projects.`],
  button: { text: "View Team Dashboard", url: loginUrl },
  supportEmail: "support@workspace.com"
});

// 6. First Login Congratulations
export const buildFirstLogin = (firstName: string): EmailData => ({
  subject: "Congratulations on your first login",
  greeting: `Hi ${firstName},`,
  intro: ["We noticed you just logged in for the first time. Welcome aboard!", "Here are a few tips to get the most out of your workspace."],
  quickStart: ["Set up your avatar", "Review notification preferences", "Create your first task"],
  supportEmail: "support@workspace.com"
});

// 7. Getting Started Guide
export const buildGettingStarted = (firstName: string, docsUrl: string): EmailData => ({
  subject: "Getting Started with Workspace",
  greeting: `Hi ${firstName},`,
  intro: ["Ready to supercharge your productivity? Check out our quick start guide to learn the basics."],
  button: { text: "Read the Guide", url: docsUrl },
  supportEmail: "support@workspace.com"
});

// 8. Profile Completion Reminder
export const buildProfileReminder = (firstName: string, profileUrl: string): EmailData => ({
  subject: "Complete your profile to stand out",
  greeting: `Hi ${firstName},`,
  intro: ["We noticed your profile is missing a few details. Complete your profile to help your team know you better."],
  button: { text: "Update Profile", url: profileUrl },
  supportEmail: "support@workspace.com"
});

// 9. Workspace Setup Complete
export const buildWorkspaceSetupComplete = (workspaceName: string, loginUrl: string): EmailData => ({
  subject: `${workspaceName} setup is complete!`,
  greeting: "Hello,",
  intro: [`Your workspace "${workspaceName}" has been successfully configured and is ready to use.`],
  button: { text: "Open Workspace", url: loginUrl },
  supportEmail: "support@workspace.com"
});

// 10. Password Changed Successfully
export const buildPasswordChanged = (firstName: string): EmailData => ({
  subject: "Your password was changed",
  greeting: `Hi ${firstName},`,
  intro: ["This is a confirmation that the password for your account has been changed successfully."],
  securityNotice: true,
  supportEmail: "support@workspace.com"
});

// 11. New Device Login Alert
export const buildNewDeviceLogin = (firstName: string, deviceName: string, location: string): EmailData => ({
  subject: "New login to your Workspace account",
  greeting: `Hi ${firstName},`,
  intro: [
    "We noticed a new login to your account from an unrecognized device.",
    `Device: ${deviceName}`,
    `Approximate Location: ${location}`
  ],
  securityNotice: true,
  supportEmail: "support@workspace.com"
});

// 12. Account Security Alert
export const buildSecurityAlert = (firstName: string, alertDetails: string): EmailData => ({
  subject: "Security Alert: Suspicious Activity Detected",
  greeting: `Hi ${firstName},`,
  intro: ["We detected unusual activity on your account.", alertDetails],
  securityNotice: true,
  supportEmail: "support@workspace.com"
});

// 13. Subscription Activated
export const buildSubscriptionActivated = (firstName: string, planName: string, loginUrl: string): EmailData => ({
  subject: "Subscription Activated",
  greeting: `Hi ${firstName},`,
  intro: [`Thank you for upgrading! Your ${planName} subscription is now active.`],
  button: { text: "View Billing", url: loginUrl },
  supportEmail: "support@workspace.com"
});

// 14. Trial Started
export const buildTrialStarted = (firstName: string, daysLeft: number, loginUrl: string): EmailData => ({
  subject: "Welcome to your Free Trial",
  greeting: `Hi ${firstName},`,
  intro: [`Your ${daysLeft}-day free trial has started. Explore all premium features now!`],
  button: { text: "Explore Features", url: loginUrl },
  supportEmail: "support@workspace.com"
});

// 15. Trial Ending Soon
export const buildTrialEndingSoon = (firstName: string, daysLeft: number, upgradeUrl: string): EmailData => ({
  subject: `Your trial ends in ${daysLeft} days`,
  greeting: `Hi ${firstName},`,
  intro: ["Your free trial is almost over. Upgrade your plan to keep access to all premium features."],
  button: { text: "Upgrade Now", url: upgradeUrl },
  supportEmail: "support@workspace.com"
});

// 16. Subscription Renewal Confirmation
export const buildRenewalConfirmation = (firstName: string, amount: string): EmailData => ({
  subject: "Subscription Renewed",
  greeting: `Hi ${firstName},`,
  intro: [`Your subscription has been successfully renewed for ${amount}. Thank you for your continued support!`],
  supportEmail: "support@workspace.com"
});

// 17. Password Reset Request
export const buildPasswordReset = (firstName: string, resetUrl: string): EmailData => ({
  subject: "Password Reset Request",
  greeting: `Hi ${firstName},`,
  intro: ["We received a request to reset your password. Click the button below to choose a new one."],
  button: { text: "Reset Password", url: resetUrl },
  outro: ["This link will expire in 1 hour.", "If you didn't request this, you can safely ignore this email."],
  supportEmail: "support@workspace.com"
});

// 18. Password Reset Successful
export const buildPasswordResetSuccess = (firstName: string, loginUrl: string): EmailData => ({
  subject: "Password Reset Successful",
  greeting: `Hi ${firstName},`,
  intro: ["Your password has been successfully reset. You can now log in with your new password."],
  button: { text: "Log In", url: loginUrl },
  supportEmail: "support@workspace.com"
});

// 19. Account Deactivated
export const buildAccountDeactivated = (firstName: string): EmailData => ({
  subject: "Account Deactivated",
  greeting: `Hi ${firstName},`,
  intro: ["Your Workspace account has been deactivated by an administrator. If you believe this is a mistake, please contact support."],
  supportEmail: "support@workspace.com"
});

// 20. Account Reactivated
export const buildAccountReactivated = (firstName: string, loginUrl: string): EmailData => ({
  subject: "Account Reactivated",
  greeting: `Hi ${firstName},`,
  intro: ["Good news! Your Workspace account has been reactivated. You can now log in and access your data."],
  button: { text: "Log In", url: loginUrl },
  supportEmail: "support@workspace.com"
});
