import { cache } from "react";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2Icon, GlobeIcon, CalendarIcon } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Organization" };

const getOrg = cache(async (orgId: string) => {
  return db.collection(collections.organizations).findOne({ id: orgId });
});

export default async function OrgDetailsPage() {
  const org = await getOrg("demo-org-id");

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Organization Details</h1>
      </div>
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
              <p className="font-medium">{org?.name || "Acme Inc"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <Badge variant="secondary" className="capitalize">{org?.plan || "enterprise"}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium text-sm">
                {org?.createdAt ? new Date(org.createdAt).toLocaleDateString() : "Recently"}
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
    </div>
  );
}
