"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AttendanceTable } from "@/components/attendance/attendance-table";
import { CalendarCheckIcon } from "lucide-react";

export default function StaffAttendancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [today, setToday] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/attendance").then(r => r.json()).then(d => setToday(d.today || [])).catch(() => {}).finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8 min-w-0 max-w-full">
      <div className="flex items-center gap-3">
        <CalendarCheckIcon className="size-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="text-sm text-muted-foreground">Today&apos;s attendance overview</p>
        </div>
      </div>
      <AttendanceTable data={today} />
    </main>
  );
}
