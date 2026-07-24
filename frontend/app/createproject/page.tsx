"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CreateProjectPageInteractive } from "./page-interactive";

export default function CreateProjectPage() {
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
    <main className="flex flex-1 flex-col h-[calc(100vh-4rem)]">
      <CreateProjectPageInteractive />
    </main>
  );
}
