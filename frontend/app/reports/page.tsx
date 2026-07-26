"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ReportsClient from "./reports-client";

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); }
  }, [status, router]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/reports").then(r => r.json()),
      fetch("/api/staffs/list").then(r => r.json()),
    ])
      .then(([reportsData, staffData]) => {
        if (!cancelled) {
          setTasks(reportsData.tasks || []);
          setEmployees(staffData.employees || []);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return <ReportsClient tasks={tasks} employees={employees} />;
}
