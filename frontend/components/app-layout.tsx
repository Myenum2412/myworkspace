"use client";

import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { OrgSidebar } from "@/components/org-sidebar";
import { StaffSidebar } from "@/components/staff-sidebar";
import { ClientSidebar } from "@/components/client-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getAppContext, isAppPage, type AppContextType } from "@/lib/app-context";
import { SubscriptionGuard } from "@/components/subscription-guard";

const Header = lazy(() => import("@/components/header").then(m => ({ default: m.Header })));
const MobileBottomNav = lazy(() => import("@/components/mobile-bottom-nav").then(m => ({ default: m.MobileBottomNav })));
const SubscriptionStatusBanner = lazy(() => import("@/components/subscription-status-banner").then(m => ({ default: m.SubscriptionStatusBanner })));
const NewNav = lazy(() => import("@/components/landing/new-nav").then(m => ({ default: m.NewNav })));
const NewFooter = lazy(() => import("@/components/landing/new-footer").then(m => ({ default: m.NewFooter })));

interface AppLayoutProps {
  children: ReactNode;
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

  // Override sidebar context based on session role so client users
  // never see a flash of the wrong sidebar while the redirect fires.
  const effectiveContext = useMemo((): AppContextType => {
    const role = session?.user?.role?.toLowerCase() || "";
    if (role === "client") return "client";
    return context;
  }, [context, session?.user?.role]);

  useEffect(() => {
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
    return (
      <SubscriptionGuard>
        <div className="flex min-h-screen flex-col">
          <Suspense fallback={null}>
            <NewNav />
          </Suspense>
          <main className="flex-1 pt-16">
            {children}
          </main>
          <Suspense fallback={null}>
            <NewFooter />
          </Suspense>
        </div>
      </SubscriptionGuard>
    );
  }

  if (status === "loading") {
    return <div className="flex h-screen w-full bg-background" />;
  }

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <Suspense fallback={null}>
        <SidebarByContext context={effectiveContext} user={user} />
      </Suspense>
      <SidebarInset>
        <Suspense fallback={null}>
          <SubscriptionStatusBanner />
          <Header context={effectiveContext} />
        </Suspense>
        <main className="flex flex-1 flex-col gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 lg:p-6 pb-16 sm:pb-3 md:pb-4 lg:p-6 min-w-0 max-w-full">
          <SubscriptionGuard>{children}</SubscriptionGuard>
        </main>
        <Suspense fallback={null}>
          <MobileBottomNav context={effectiveContext} />
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
}
