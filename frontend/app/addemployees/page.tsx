"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AddEmployeePageInteractive } from "./page-interactive";

export default function AddEmployeePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  }

  if (!session?.user) return null;

  return (
    <main className="flex flex-1 flex-col gap-6 p-6 h-[calc(100vh-4rem)]">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
        <p className="text-muted-foreground">Manage your organization&apos;s employees</p>
      </div>
      <AddEmployeePageInteractive />
    </main>
  );
}
