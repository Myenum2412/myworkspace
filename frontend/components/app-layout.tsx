"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const [open, setOpen] = useState(true);

  const context: AppContextType = getAppContext(pathname);
  const isApp = isAppPage(pathname);

  // Redirect client users to their portal
  useEffect(() => {
    const role = session?.user?.role?.toLowerCase() || "";
    if (role === "client" && !pathname.startsWith("/client") && !pathname.startsWith("/login")) {
      routerRef.current.replace("/client/dashboard");
    }
  }, [session?.user?.role, pathname]);

  const user = useMemo(() => ({
    name: session?.user?.name || "User",
    email: session?.user?.email || "user@example.com",
    avatar: session?.user?.image || "",
    role: session?.user?.role || "",
  }), [session?.user?.name, session?.user?.email, session?.user?.image, session?.user?.role]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setOpen(false);
      else setOpen(true);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Session loading is handled by AppInitProvider at the root level.
  // By the time this component renders for app pages, the session is ready.
  // Public pages are rendered without the init provider's loader.
  if (!isApp) {
    return <SubscriptionGuard>{children}</SubscriptionGuard>;
  }

  const renderSidebar = () => {
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

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      {renderSidebar()}
      <SidebarInset>
        <SubscriptionStatusBanner />
        <Header context={context} />
        <main className="flex flex-1 flex-col gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 lg:p-6 pb-16 sm:pb-3 md:pb-4 lg:p-6 min-w-0 max-w-full">
          <SubscriptionGuard>{children}</SubscriptionGuard>
        </main>
        <MobileBottomNav context={context} />
      </SidebarInset>
    </SidebarProvider>
  );
}
