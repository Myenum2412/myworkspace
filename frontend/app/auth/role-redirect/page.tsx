"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ROLES } from "@/lib/rbac";

export default function RoleRedirectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?error=Session+not+found.+Please+sign+in+again.");
      return;
    }
    if (status === "authenticated" && session?.user) {
      const role = session.user.role?.toLowerCase() || "";
      if (role === ROLES.ORG_ADMIN) {
        router.replace("/orgmenu");
      } else if (role === ROLES.MEMBERS) {
        router.replace("/dashboard");
      } else {
        router.replace("/staffs");
      }
    }
  }, [status, session, router]);

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
    </div>
  );
}
