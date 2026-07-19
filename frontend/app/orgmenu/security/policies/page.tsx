import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheckIcon, ClockIcon } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Policies" };

const getPolicies = cache(async (orgId: string) => {
  const org = await db.collection(collections.organizations).findOne({ id: orgId });
  const policies = (org?.policies as Record<string, unknown>) || {};
  return {
    password: {
      minLength: (policies.passwordMinLength as number) || 8,
      requireSpecialChars: policies.requireSpecialChars !== false,
      requireNumbers: policies.requireNumbers !== false,
      expiryDays: (policies.passwordExpiryDays as number) || 90,
    },
    session: {
      timeoutMinutes: (policies.sessionTimeoutMinutes as number) || 30,
      maxConcurrent: (policies.maxConcurrentSessions as number) || 5,
      rememberMeDays: (policies.rememberMeDays as number) || 30,
    },
  };
});

const getAllPolicies = cache(async () => {
  const org = await db.collection(collections.organizations).findOne({});
  const policies = (org?.policies as Record<string, unknown>) || {};
  return {
    password: {
      minLength: (policies.passwordMinLength as number) || 8,
      requireSpecialChars: policies.requireSpecialChars !== false,
      requireNumbers: policies.requireNumbers !== false,
      expiryDays: (policies.passwordExpiryDays as number) || 90,
    },
    session: {
      timeoutMinutes: (policies.sessionTimeoutMinutes as number) || 30,
      maxConcurrent: (policies.maxConcurrentSessions as number) || 5,
      rememberMeDays: (policies.rememberMeDays as number) || 30,
    },
  };
});

export default async function PoliciesPage() {
  const session = await auth();
  const role = session?.user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN" || role === "ORG_MENU_ADMIN";
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  const policies = isSuperAdmin ? await getAllPolicies() : await getPolicies(orgId || "null");

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Policies</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="size-5 text-muted-foreground" />
              <CardTitle>Password Policy</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Minimum length</span>
              <Badge variant="secondary">{policies.password.minLength} characters</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Require special characters</span>
              <Badge variant="secondary">{policies.password.requireSpecialChars ? "Enabled" : "Disabled"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Require numbers</span>
              <Badge variant="secondary">{policies.password.requireNumbers ? "Enabled" : "Disabled"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Password expiry</span>
              <Badge variant="secondary">{policies.password.expiryDays} days</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClockIcon className="size-5 text-muted-foreground" />
              <CardTitle>Session Policy</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Session timeout</span>
              <Badge variant="secondary">{policies.session.timeoutMinutes} minutes</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Max concurrent sessions</span>
              <Badge variant="secondary">{policies.session.maxConcurrent}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Remember me duration</span>
              <Badge variant="secondary">{policies.session.rememberMeDays} days</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
