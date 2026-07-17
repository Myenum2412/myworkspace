"use client";

import { Suspense, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { OrgSidebar } from "@/components/org-sidebar";
import { StaffSidebar } from "@/components/staff-sidebar";
import { ClientSidebar } from "@/components/client-sidebar";
import { Header } from "@/components/header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getAppContext, isAppPage, type AppContextType } from "@/lib/app-context";
import { SubscriptionStatusBanner } from "@/components/subscription-status-banner";
import { SubscriptionGuard } from "@/components/subscription-guard";
import { Skeleton } from "@/components/ui/skeleton";

interface AppLayoutProps {
  children: ReactNode;
}

function SidebarFallback() {
  return (
    <div className="flex h-screen w-64 flex-col border-r bg-background p-4">
      <Skeleton className="h-8 w-32 mb-6" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

function HeaderFallback() {
  return (
    <header className="flex w-full h-14 sm:h-16 md:h-20 shrink-0 border-b items-center justify-between gap-2 px-4">
      <div className="flex items-center gap-2">
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="size-8 rounded-full" />
      </div>
    </header>
  );
}

const SidebarByContext = ({
  context,
  user,
}: {
  context: AppContextType;
  user: { name: string; email: string; avatar: string; role?: string };
}) => {
  switch (context) {
    case "origin":
      return <OrgSidebar user={user} />;
    case "staff":
      return <StaffSidebar user={user} />;
    case "client":
      return <ClientSidebar user={user} />;
    default:
      return <AppSidebar user={user} />;
  }
};

export function AppLayout({ children }: AppLayoutProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(true);

  const context = useMemo(() => getAppContext(pathname), [pathname]);
  const isApp = useMemo(() => isAppPage(pathname), [pathname]);

  useEffect(() => {
    // Only redirect if user is authenticated and on a protected route
    if (status !== "authenticated") return;
    const role = session?.user?.role?.toLowerCase() || "";
    if (role === "client" && !pathname.startsWith("/client") && !pathname.startsWith("/login")) {
      router.replace("/client/dashboard");
    }
  }, [session?.user?.role, pathname, router, status]);

  const user = useMemo(() => ({
    name: session?.user?.name || "User",
    email: session?.user?.email || "user@example.com",
    avatar: session?.user?.image || "",
    role: session?.user?.role || "",
  }), [session?.user?.name, session?.user?.email, session?.user?.image, session?.user?.role]);

  useEffect(() => {
    const handleResize = () => {
      setOpen(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!isApp) {
    return <SubscriptionGuard>{children}</SubscriptionGuard>;
  }

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <Suspense fallback={<SidebarFallback />}>
        <SidebarByContext context={context} user={user} />
      </Suspense>
      <SidebarInset>
        <Suspense fallback={<HeaderFallback />}>
          <SubscriptionStatusBanner />
          <Header context={context} />
        </Suspense>
        <main className="flex flex-1 flex-col gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 lg:p-6 pb-16 sm:pb-3 md:pb-4 lg:p-6 min-w-0 max-w-full">
          <SubscriptionGuard>{children}</SubscriptionGuard>
        </main>
        <MobileBottomNav context={context} />
      </SidebarInset>
    </SidebarProvider>
  );
}
