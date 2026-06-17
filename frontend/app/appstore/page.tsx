import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { StoreIcon } from "lucide-react";

export const metadata = {
  title: "App Store",
  description: "Browse and install workspace applications",
};


export default async function AppStorePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = {
    name: session.user.name || "User",
    email: session.user.email || "user@example.com",
    avatar: session.user.image || "",
  };

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <StoreIcon className="size-6" />
                App Store
              </h1>
              <p className="text-muted-foreground mt-1">
                Extend your workspace with powerful integrations
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
