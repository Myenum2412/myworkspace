import { createNotification, CreateNotificationParams } from "../../services/notification.service.js";

export const notifyUserAuth = {
  async workspaceRegistered(userId: string, orgId: string, workspaceName: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "workspace_registered", category: "auth",
      title: "Workspace Registered",
      message: `Your workspace "${workspaceName}" has been registered successfully.`,
      link: "/dashboard",
      actions: [{ label: "Go to Dashboard", action: "view", url: "/dashboard", primary: true }],
    });
  },

  async organizationCreated(userId: string, orgId: string, orgName: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "organization_created", category: "auth",
      title: "Organization Created",
      message: `Organization "${orgName}" has been created.`,
      link: "/settings/organization",
    });
  },

  async workspaceWelcome(userId: string, orgId: string, workspaceName: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "workspace_welcome", category: "auth", priority: "high",
      title: `Welcome to ${workspaceName}`,
      message: "Get started by exploring the dashboard and setting up your profile.",
      link: "/dashboard",
      actions: [
        { label: "Explore Dashboard", action: "view", url: "/dashboard", primary: true },
        { label: "Complete Profile", action: "view", url: "/settings/profile" },
      ],
    });
  },

  async userInvited(userId: string, orgId: string, invitedBy: string, role: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "user_invited", category: "auth", priority: "high",
      title: "You've Been Invited",
      message: `${invitedBy} invited you as ${role}.`,
      link: "/auth/accept-invite",
      actions: [{ label: "Accept Invitation", action: "view", url: "/auth/accept-invite", primary: true }],
    });
  },

  async userAccountCreated(userId: string, orgId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "user_account_created", category: "auth",
      title: "Account Created",
      message: "Your account has been created successfully.",
      link: "/dashboard",
    });
  },

  async userActivation(userId: string, orgId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "user_activation", category: "auth", priority: "high",
      title: "Activate Your Account",
      message: "Please activate your account to get started.",
      link: "/auth/activate",
      actions: [{ label: "Activate Now", action: "view", url: "/auth/activate", primary: true }],
    });
  },

  async emailVerified(userId: string, orgId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "email_verified", category: "auth",
      title: "Email Verified",
      message: "Your email address has been verified successfully.",
    });
  },

  async passwordSetupInvite(userId: string, orgId: string, invitedBy: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "password_setup_invite", category: "auth", priority: "high",
      title: "Set Up Your Password",
      message: `${invitedBy} has invited you. Please set up your password.`,
      link: "/auth/set-password",
      actions: [{ label: "Set Password", action: "view", url: "/auth/set-password", primary: true }],
    });
  },

  async passwordReset(userId: string, orgId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "password_reset", category: "auth", priority: "high",
      title: "Password Reset Requested",
      message: "A password reset has been requested for your account.",
    });
  },

  async passwordChanged(userId: string, orgId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "password_changed", category: "auth", priority: "high",
      title: "Password Changed",
      message: "Your password has been changed successfully.",
      metadata: { timestamp: new Date().toISOString() },
    });
  },

  async newDeviceLogin(userId: string, orgId: string, deviceName: string, location: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "new_device_login", category: "auth", priority: "high",
      title: "New Device Login",
      message: `New login detected from ${deviceName} (${location})`,
      actions: [
        { label: "Review Activity", action: "view", url: "/settings/security", primary: true },
      ],
      metadata: { deviceName, location },
    });
  },

  async failedLogin(userId: string, orgId: string, attempts: number, ipAddress: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "failed_login", category: "auth", priority: "high",
      title: "Failed Login Attempt",
      message: `${attempts} failed login attempt(s) detected from ${ipAddress}.`,
      actions: [
        { label: "Review Activity", action: "view", url: "/settings/security" },
      ],
      metadata: { attempts, ipAddress },
    });
  },

  async accountLocked(userId: string, orgId: string, reason: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "account_locked", category: "auth", priority: "critical",
      title: "Account Locked",
      message: `Your account has been locked: ${reason}`,
      actions: [{ label: "Contact Support", action: "view", url: "/support", primary: true }],
      metadata: { reason },
    });
  },

  async accountUnlocked(userId: string, orgId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "account_unlocked", category: "auth",
      title: "Account Unlocked",
      message: "Your account has been unlocked. You may now log in.",
      link: "/auth/login",
    });
  },

  async accountSuspended(userId: string, orgId: string, reason: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "account_suspended", category: "auth", priority: "critical",
      title: "Account Suspended",
      message: `Your account has been suspended: ${reason}`,
      actions: [{ label: "Contact Support", action: "view", url: "/support", primary: true }],
      metadata: { reason },
    });
  },

  async accountReactivated(userId: string, orgId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "account_reactivated", category: "auth",
      title: "Account Reactivated",
      message: "Your account has been reactivated. Welcome back!",
      link: "/dashboard",
    });
  },

  async roleChanged(userId: string, orgId: string, newRole: string, changedBy: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "role_changed", category: "permissions", priority: "high",
      title: "Role Changed",
      message: `Your role has been changed to ${newRole} by ${changedBy}.`,
      link: "/settings/profile",
    });
  },

  async permissionUpdated(userId: string, orgId: string, permissions: string[]) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "permission_updated", category: "permissions",
      title: "Permissions Updated",
      message: `Your permissions have been updated: ${permissions.join(", ")}`,
      link: "/settings/profile",
    });
  },

  async profileUpdated(userId: string, orgId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "profile_updated", category: "auth",
      title: "Profile Updated",
      message: "Your profile has been updated successfully.",
    });
  },

  async accountDeleted(userId: string, orgId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "account_deleted", category: "auth",
      title: "Account Deleted",
      message: "Your account has been deleted.",
    });
  },

  async subscriptionActivated(userId: string, orgId: string, planName: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "subscription_activated", category: "billing",
      title: "Subscription Activated",
      message: `Your ${planName} plan is now active.`,
      link: "/billing",
      actions: [{ label: "View Billing", action: "view", url: "/billing", primary: true }],
      metadata: { planName },
    });
  },

  async subscriptionUpgraded(userId: string, orgId: string, planName: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "subscription_upgraded", category: "billing",
      title: "Plan Upgraded",
      message: `You have been upgraded to the ${planName} plan.`,
      link: "/billing",
      metadata: { planName },
    });
  },

  async subscriptionDowngraded(userId: string, orgId: string, planName: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "subscription_downgraded", category: "billing",
      title: "Plan Downgraded",
      message: `Your plan has been changed to ${planName}.`,
      link: "/billing",
      metadata: { planName },
    });
  },

  async subscriptionRenewed(userId: string, orgId: string, amount: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "subscription_renewed", category: "billing",
      title: "Subscription Renewed",
      message: `Your subscription has been renewed for ${amount}.`,
      link: "/billing",
      metadata: { amount },
    });
  },

  async subscriptionExpired(userId: string, orgId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "subscription_expired", category: "billing", priority: "high",
      title: "Subscription Expired",
      message: "Your subscription has expired. Renew to continue using premium features.",
      link: "/billing",
      actions: [{ label: "Renew Now", action: "view", url: "/billing", primary: true }],
    });
  },

  async subscriptionCancelled(userId: string, orgId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "subscription_cancelled", category: "billing",
      title: "Subscription Cancelled",
      message: "Your subscription has been cancelled.",
      link: "/billing",
    });
  },

  async subscriptionNearingExpiration(userId: string, orgId: string, daysRemaining: number) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "subscription_nearing_expiration", category: "billing", priority: "high",
      title: "Subscription Expiring Soon",
      message: `Your subscription will expire in ${daysRemaining} days. Renew to avoid interruption.`,
      link: "/billing",
      actions: [{ label: "Renew Now", action: "view", url: "/billing", primary: true }],
      metadata: { daysRemaining },
    });
  },
};
