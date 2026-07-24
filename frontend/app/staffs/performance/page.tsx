"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PerformancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/staffs/performance").then(r => r.json()).then(d => setReviews(d.reviews || [])).catch(() => {}).finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8 min-w-0 max-w-full">
      <h1 className="text-2xl font-bold tracking-tight">Performance</h1>
      <Card><CardHeader><CardTitle>Reviews</CardTitle></CardHeader><CardContent>
        {reviews.length === 0 ? <p className="text-sm text-muted-foreground">No reviews</p> : reviews.map((r) => (
          <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
            <span>{r.employeeId}</span>
            <Badge>{r.score}/10</Badge>
          </div>
        ))}
      </CardContent></Card>
    </main>
  );
}
