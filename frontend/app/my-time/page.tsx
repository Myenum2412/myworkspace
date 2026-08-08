"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import TimeTracker from "@/app/time-tracker/time-tracker-interactive";

export default function MyTimePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<{
    initialEntries: any[];
    projects: any[];
    user: any;
    orgId: string;
  }>({ initialEntries: [], projects: [], user: {}, orgId: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/my-time")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d);
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

  return (
    <TimeTracker
      initialEntries={data.initialEntries}
      projects={data.projects}
      user={data.user}
      orgId={data.orgId}
    />
  );
}
