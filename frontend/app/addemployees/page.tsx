import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { AddEmployeeDialogWrapper } from "./add-employee-dialog-wrapper";
import { RecentEmployeesTable } from "./recent-employees-table";

export const metadata = {
  title: "Add Employee",
};

export default async function AddEmployeePage() {
  let session;
  try {
    session = await auth();
  } catch {
    redirect("/login");
  }

  if (!session?.user) {
    redirect("/login");
  }

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
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
            <p className="text-muted-foreground">Manage your organization&apos;s employees</p>
          </div>
          <AddEmployeeDialogWrapper />

          <RecentEmployeesTable />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
