import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileTextIcon } from "lucide-react";

export const metadata = { title: "Invoices" };

export default function BillingInvoicesPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-4">
      <h1 className="text-2xl font-bold">Invoices</h1>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileTextIcon className="size-5 text-muted-foreground" />
            <CardTitle>Invoice History</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            No invoices yet
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
