"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { lazy, type ReactNode, Suspense, useEffect, useMemo, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ClientSidebar } from "@/components/client-sidebar";
import { OrgSidebar } from "@/components/org-sidebar";
import { StaffSidebar } from "@/components/staff-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { type AppContextType, getAppContext, isAppPage } from "@/lib/app-context";

const Header = lazy(() => import("@/components/header").then((m) => ({ default: m.Header })));
const MobileBottomNav = lazy(() =>
  import("@/components/mobile-bottom-nav").then((m) => ({ default: m.MobileBottomNav })),
);
const NewNav = lazy(() =>
  import("@/components/landing/new-nav").then((m) => ({ default: m.NewNav })),
);
const NewFooter = lazy(() =>
  import("@/components/landing/new-footer").then((m) => ({ default: m.NewFooter })),
);
const ProductTourProvider = lazy(() =>
  import("@/components/product-tour").then((m) => ({ default: m.ProductTourProvider })),
);

const AUTH_ROUTES_WITHOUT_HEADER = [
  "/login",
  "/signup",
  "/signup-mongo",
  "/forgot-password",
  "/auth/not-found",
  "/client/forgot-password",
  "/client/reset-password",
  "/reset-password",
  "/verify-email",
];

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

  const user = useMemo(
    () => ({
      name: session?.user?.name || "User",
      email: session?.user?.email || "user@example.com",
      avatar: session?.user?.image || "",
      role: session?.user?.role || "",
    }),
    [session?.user?.name, session?.user?.email, session?.user?.image, session?.user?.role],
  );

  useEffect(() => {
    const handleResize = () => {
      setOpen(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!isApp) {
    const isAuthRouteWithoutHeader = AUTH_ROUTES_WITHOUT_HEADER.some(
      (p) => pathname === p || pathname.startsWith(p + "/"),
    );

    if (isAuthRouteWithoutHeader) {
      return (
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">{children}</main>
        </div>
      );
    }

    const isHomePage = pathname === "/";

    return (
      <div className="flex min-h-screen flex-col">
        <Suspense fallback={null}>
          <NewNav />
        </Suspense>
        <main className={`flex-1 ${!isHomePage ? "pt-16" : ""}`}>{children}</main>
        <Suspense fallback={null}>
          <NewFooter />
        </Suspense>
      </div>
    );
  }

  if (status === "loading") {
    return null;
  }

  if (pathname === "/files" || pathname.startsWith("/files/")) {
    return (
      <SidebarProvider open={open} onOpenChange={setOpen}>
        <Suspense fallback={null}>
          <SidebarByContext context={effectiveContext} user={user} />
        </Suspense>
        <SidebarInset className="h-[100dvh] overflow-hidden">
          <Suspense fallback={null}>
            <ProductTourProvider>{children}</ProductTourProvider>
          </Suspense>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <Suspense fallback={null}>
        <SidebarByContext context={effectiveContext} user={user} />
      </Suspense>
      <SidebarInset>
        <Suspense fallback={null}>
          <Header context={effectiveContext} />
        </Suspense>
        <main className="premium-scrollbar flex flex-1 flex-col gap-3 sm:gap-4 md:gap-5 p-3 sm:p-4 md:p-5 lg:p-7 pb-20 sm:pb-5 md:pb-5 lg:p-7 min-w-0 max-w-full">
          <Suspense fallback={null}>
            <ProductTourProvider>{children}</ProductTourProvider>
          </Suspense>
        </main>
        <Suspense fallback={null}>
          <MobileBottomNav context={effectiveContext} />
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
}
