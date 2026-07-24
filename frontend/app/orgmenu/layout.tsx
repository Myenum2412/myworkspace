"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlertIcon, HomeIcon } from "lucide-react";
import Link from "next/link";

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  }

  if (!session?.user) return null;

  const authorized = session.user.role === "org_admin";

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

  return <>{children}</>;
}
