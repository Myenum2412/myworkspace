"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useIndustry } from "@/components/industry-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function StaffListPage() {
  const { t } = useIndustry();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/staffs/list")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setEmployees(d.employees || []);
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
      <h1 className="text-2xl font-bold tracking-tight" data-tour-step-id="step-staffs-list">
        {t("page.staffs.list")}
      </h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {employees.map((e) => (
          <Card key={e.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <Avatar>
                <AvatarImage src={e.avatar} />
                <AvatarFallback>{e.name?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{e.name}</p>
                <p className="text-sm text-muted-foreground truncate">{e.email}</p>
              </div>
              <Badge variant="outline">{e.role}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
