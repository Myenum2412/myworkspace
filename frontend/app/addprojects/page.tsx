"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AddProjectsInteractive from "./addprojects-interactive";

export default function AddProjectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clientList, setClientList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/addprojects").then(r => r.json()).then(d => setClientList(d.clientList || [])).catch(() => {}).finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return <AddProjectsInteractive clientList={clientList} />;
}
