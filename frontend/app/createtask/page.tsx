"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CreateTaskPageInteractive } from "./page-interactive";

export default function CreateTaskPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); }
  }, [status, router]);

  useEffect(() => {
    fetch("/api/createtask")
      .then(() => {})
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return (
    <main className="flex flex-1 flex-col h-[calc(100vh-4rem)]">
      <CreateTaskPageInteractive />
    </main>
  );
}
