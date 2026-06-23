import { StaffSidebar } from "@/components/staff-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";

export default async function StaffsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = {
    name: session.user.name || "User",
    email: session.user.email || "user@example.com",
    avatar: session.user.image || "",
  };

  return (
    <SidebarProvider>
      <StaffSidebar user={user} />
      <SidebarInset>
        <Header />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
