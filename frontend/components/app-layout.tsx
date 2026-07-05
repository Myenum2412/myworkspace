"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { OrgSidebar } from "@/components/org-sidebar";
import { StaffSidebar } from "@/components/staff-sidebar";
import { ClientSidebar } from "@/components/client-sidebar";
import { Header } from "@/components/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getAppContext, isAppPage, type AppContextType } from "@/lib/app-context";



interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(true);

  const context: AppContextType = getAppContext(pathname);
  const isApp = isAppPage(pathname);

  // Redirect staff/member users away from non-staff pages
  useEffect(() => {
    const role = session?.user?.role?.toLowerCase() || "";
    const isWorkspaceAdmin = ["workspace", "admin", "manager", "org_menu_admin", "super_admin"].includes(role);
    
    if (session?.user && !isWorkspaceAdmin) {
      if (role === "client") {
        if (!pathname.startsWith("/client") && !pathname.startsWith("/login")) {
          router.replace("/client/dashboard");
        }
      } else {
        if (!pathname.startsWith("/staffs") && !pathname.startsWith("/login")) {
          router.replace("/staffs");
        }
      }
    }
  }, [session?.user, session?.user?.role, pathname, router]);

  const user = useMemo(() => ({
    name: session?.user?.name || "User",
    email: session?.user?.email || "user@example.com",
    avatar: session?.user?.image || "",
    role: session?.user?.role || "",
  }), [session?.user?.name, session?.user?.email, session?.user?.image, session?.user?.role]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setOpen(false);
    };
    handleResize();
  }, []);

  if (!isApp) {
    return <>{children}</>;
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
        <Header context={context} />
        <main className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
