import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheckIcon } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "SSO" };

const getSsoConfigs = cache(async (orgId: string) => {
  const configs = await db.collection(collections.ssoConfigs).find({ orgId }).toArray();
  return configs.map((c) => ({
    provider: (c.provider as string) || "Unknown",
    status: c.enabled ? "Enabled" : "Not configured",
    color: c.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700",
  }));
});

const getAllSsoConfigs = cache(async () => {
  const configs = await db.collection(collections.ssoConfigs).find({}).toArray();
  return configs.map((c) => ({
    provider: (c.provider as string) || "Unknown",
    status: c.enabled ? "Enabled" : "Not configured",
    color: c.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700",
  }));
});

const defaultProviders = [
  { provider: "SAML 2.0", status: "Not configured", color: "bg-gray-100 text-gray-700" },
  { provider: "OIDC", status: "Not configured", color: "bg-gray-100 text-gray-700" },
];

export default async function SsoPage() {
  const session = await auth();
  const role = session?.user?.role;
  const isSuperAdmin = role === "org_admin";
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  let providers = isSuperAdmin ? await getAllSsoConfigs() : await getSsoConfigs(orgId || "null");

  // Show default providers if none configured
  if (providers.length === 0) {
    providers = defaultProviders;
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">SSO</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="size-5" />
            Single Sign-On
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure SAML or OIDC identity providers for single sign-on access.
          </p>
          <div className="space-y-3">
            {providers.map((item) => (
              <div key={item.provider} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">{item.provider}</p>
                  <Badge variant="secondary" className="mt-1">{item.status}</Badge>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
