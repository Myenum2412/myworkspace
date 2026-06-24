import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { AddEmployeePageClient } from "./page-client";

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

  return (
    <main className="flex flex-1 flex-col gap-6 p-6 h-[calc(100vh-4rem)]">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
        <p className="text-muted-foreground">Manage your organization&apos;s employees</p>
      </div>
      <AddEmployeePageClient />
    </main>
  );
}
