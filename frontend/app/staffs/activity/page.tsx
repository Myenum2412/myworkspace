"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIndustry } from "@/components/industry-provider";

export default function StaffActivityPage() {
  const { t } = useIndustry();
  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">{t("page.staffs.activity")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("nav.staffActivity")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("nav.staffActivity")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("common.noResults")}</p>
        </CardContent>
      </Card>
    </main>
  );
}
