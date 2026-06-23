import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2Icon } from "lucide-react";
import { OrgLimitsEditor } from "./limits";

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
    const cursor = await db.collection(collections.organizations).find({});
    return await cursor.sort({ createdAt: -1 }).toArray();
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

  const orgs = isSuperAdmin ? allOrgs : (org ? [org] : []);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {orgs.length} organization{orgs.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No organizations found.
                </TableCell>
              </TableRow>
            ) : (
              orgs.map((o) => (
                <TableRow key={o.id as string}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2Icon className="size-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{o.name as string}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize">
                      {(o.plan as string) || "starter"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{(o.domain as string) || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{(o.slug as string) || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {o.createdAt ? new Date(o.createdAt as string).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <OrgLimitsEditor />
    </div>
  );
}
