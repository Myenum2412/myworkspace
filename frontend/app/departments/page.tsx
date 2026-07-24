"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DepartmentsClient } from "@/components/departments/departments-client";

export default function DepartmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<{ departments: any[]; totalMembers: number; totalOpen: number }>({ departments: [], totalMembers: 0, totalOpen: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/departments").then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return <DepartmentsClient departments={data.departments} totalMembers={data.totalMembers} totalOpen={data.totalOpen} />;
}
