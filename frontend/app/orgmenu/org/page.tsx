import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2Icon, GlobeIcon, UsersIcon, CreditCardIcon } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Organization" };

const getOrg = cache(async (orgId: string) => {
  try {
    return await db.collection(collections.organizations).findOne({ id: orgId });
  } catch {
    return null;
  }
});

const getAllOrgs = cache(async () => {
  try {
    return await db.collection(collections.organizations).find({}).sort({ createdAt: -1 }).toArray();
  } catch {
    return [];
  }
});

export default async function OrgDetailsPage() {
  const session = await auth();
  const role = session?.user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN" || role === "ORG_MENU_ADMIN";
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  const org = orgId ? await getOrg(orgId) : null;
  const allOrgs = isSuperAdmin ? await getAllOrgs() : [];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isSuperAdmin ? "All Organizations" : "Organization Details"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSuperAdmin ? `${allOrgs.length} organizations total` : "Your organization profile"}
          </p>
        </div>
      </div>

      {isSuperAdmin ? (
        <div className="grid gap-4 md:grid-cols-2">
          {allOrgs.map((o) => (
            <Card key={o.id as string}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2Icon className="size-5 text-muted-foreground" />
                  <CardTitle>{o.name as string}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <Badge variant="secondary" className="capitalize">{(o.plan as string) || "starter"}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Domain</span>
                  <span className="text-sm font-medium">{(o.domain as string) || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Slug</span>
                  <span className="text-sm font-medium">{(o.slug as string) || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm font-medium">
                    {o.createdAt ? new Date(o.createdAt as string).toLocaleDateString() : "—"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2Icon className="size-5 text-muted-foreground" />
                <CardTitle>Profile</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{org?.name || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <Badge variant="secondary" className="capitalize">{org?.plan || "—"}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium text-sm">
                  {org?.createdAt ? new Date(org.createdAt as string).toLocaleDateString() : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <GlobeIcon className="size-5 text-muted-foreground" />
                <CardTitle>Domain</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">Configure your organization&apos;s custom domain.</p>
              <p className="text-sm font-medium">{org?.domain || "No custom domain configured"}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
