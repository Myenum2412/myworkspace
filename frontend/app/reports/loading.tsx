import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ReportsLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Skeleton className="h-8 w-40" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="mb-2 h-8 w-full rounded-md" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
