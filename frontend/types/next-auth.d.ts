import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      permissions?: string[];
      orgId?: string;
      onboardingCompleted?: boolean;
      plan?: string;
      subscriptionStatus?: string;
      trialEnd?: string | null;
      currentPeriodEnd?: string | null;
    };
  }
}
