"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Appointments from "./appointments";

export default function AppointmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/appointments")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setDoctors(d.doctors || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading" || loading)
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  if (!session?.user) return null;

  return <Appointments initialDoctors={doctors} />;
}
