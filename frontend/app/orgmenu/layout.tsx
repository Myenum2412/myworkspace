import { OrgSidebar } from "@/components/org-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlertIcon } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "developer@myenum.in").toLowerCase().trim();

export default async function OrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let userEmail = session.user.email?.toLowerCase().trim();
  const sessionRole = session.user.role;
  let authorized = sessionRole === "ORG_MENU_ADMIN" || sessionRole === "SUPER_ADMIN" || userEmail === ADMIN_EMAIL;

  // Fallback: query DB if session doesn't carry email or role
  if (!authorized && userEmail) {
    try {
      const dbUser = await db.collection("users").findOne({ email: userEmail });
      if (dbUser) {
        authorized = dbUser.role === "ORG_MENU_ADMIN" || dbUser.role === "SUPER_ADMIN" || (dbUser.email?.toLowerCase().trim() === ADMIN_EMAIL);
      }
    } catch {}
  }

  console.log(`[AUTH orgmenu/layout] email=${userEmail} sessionRole=${session.user.role} dbRole=${authorized ? 'N/A (session authorized)' : 'checked'} authorized=${authorized}`);

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <ShieldAlertIcon className="size-12 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground">
              You do not have permission to access this area.
              This section is restricted to the authorized administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userName = session.user.name || "User";
  const userEmailDisplay = session.user.email || "user@example.com";
  const userAvatar = session.user.image || "";

  const user = {
    name: userName,
    email: userEmailDisplay,
    avatar: userAvatar,
    role: sessionRole || "ORG_MENU_ADMIN",
    permissions: session.user.permissions || [],
  };

  return (
    <SidebarProvider>
      <OrgSidebar user={user} />
      <SidebarInset>
        <Header />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
