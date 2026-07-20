import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlertIcon, HomeIcon } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function OrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sessionRole = session.user.role;
  const authorized = sessionRole === "org_admin";

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <ShieldAlertIcon className="size-12 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground">
              You do not have permission to access this area.
              This section is restricted to the authorized administrator.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline mt-4"
            >
              <HomeIcon className="size-4" />
              Return to Workspace
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userName = session.user.name || "User";
  const userEmailDisplay = session.user.email || "";
  const userAvatar = session.user.image || "";

  const user = {
    name: userName,
    email: userEmailDisplay,
    avatar: userAvatar,
    role: sessionRole || "org_admin",
    permissions: session.user.permissions || [],
  };

  return <>{children}</>;
}
