"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useIndustry } from "@/components/industry-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TimeOffPage() {
  const { t } = useIndustry();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/staffs/time-off")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setRequests(d.requests || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status === "loading" || loading)
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  if (!session?.user) return null;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8 min-w-0 max-w-full">
      <h1 className="text-2xl font-bold tracking-tight">{t("page.staffs.timeOff")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("nav.staffTasks")}</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("common.noResults")}</p>
          ) : (
            requests.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <span>
                  <span className="font-semibold">{r.requesterName}</span>: {r.type} ({r.startDate}{" "}
                  to {r.endDate})
                </span>
                <Badge>{r.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}
