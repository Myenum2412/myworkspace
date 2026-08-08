"use client";

import { useIndustry } from "@/components/industry-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StaffAddPage() {
  const { t } = useIndustry();
  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">{t("page.staffs.addStaff")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("nav.staffAdd")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("page.employees.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("nav.staffAdd")}</p>
        </CardContent>
      </Card>
    </main>
  );
}
