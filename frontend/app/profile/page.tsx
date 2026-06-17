import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { schema } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  MailIcon,
  CalendarIcon,
  ShieldIcon,
  Building2Icon,
  GlobeIcon,
  CreditCardIcon,
  UsersIcon,
  CircleIcon,
} from "lucide-react";

const planLabels: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

const statusColors: Record<string, string> = {
  online: "bg-emerald-500",
  offline: "bg-gray-400",
  break: "bg-amber-500",
};

const roleBadge: Record<string, string> = {
  admin: "default",
  manager: "secondary",
  member: "outline",
} as const;

export const metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = {
    name: session.user.name || "User",
    email: session.user.email || "user@example.com",
    avatar: session.user.image || "",
  };

  const [dbUser] = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .all();

  const [membership] = db
    .select()
    .from(schema.orgMembers)
    .where(eq(schema.orgMembers.userId, session.user.id))
    .all();

  let org = null;
  let memberCount = 0;
  if (membership) {
    [org] = db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, membership.orgId))
      .all();

    const members = db
      .select()
      .from(schema.orgMembers)
      .where(eq(schema.orgMembers.orgId, membership.orgId))
      .all();
    memberCount = members.length;
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-6 p-6 max-w-4xl">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 ring-2 ring-border">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-lg">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{user.name}</h1>
              <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className={`inline-block size-2 rounded-full ${statusColors[dbUser?.status || "offline"]}`} />
                  {dbUser?.status ? dbUser.status.charAt(0).toUpperCase() + dbUser.status.slice(1) : "Offline"}
                </span>
                <span aria-hidden>&middot;</span>
                <Badge variant={(roleBadge[dbUser?.role || "member"] as "default" | "secondary" | "outline")}>
                  {dbUser?.role ? dbUser.role.charAt(0).toUpperCase() + dbUser.role.slice(1) : "Member"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldIcon className="size-5" />
                  User Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <MailIcon className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{user.email}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <ShieldIcon className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <p className="text-sm font-medium capitalize">{dbUser?.role || "Member"}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <CircleIcon className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="text-sm font-medium capitalize">{dbUser?.status || "Offline"}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <CalendarIcon className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Member since</p>
                    <p className="text-sm font-medium">
                      {dbUser?.createdAt
                        ? new Date(dbUser.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2Icon className="size-5" />
                  Company Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {org ? (
                  <>
                    <div className="flex items-center gap-3">
                      <Building2Icon className="size-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Company name</p>
                        <p className="text-sm font-medium">{org.name}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <GlobeIcon className="size-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Domain</p>
                        <p className="text-sm font-medium">{org.domain || "—"}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <CreditCardIcon className="size-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Plan</p>
                        <p className="text-sm font-medium">{planLabels[org.plan || "starter"] || org.plan}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <UsersIcon className="size-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Team size</p>
                        <p className="text-sm font-medium">{memberCount} member{memberCount !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="size-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Created</p>
                        <p className="text-sm font-medium">
                          {org.createdAt
                            ? new Date(org.createdAt).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No organization found.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
