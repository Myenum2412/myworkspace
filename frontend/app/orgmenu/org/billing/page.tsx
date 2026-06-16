import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCardIcon, FileTextIcon } from "lucide-react";

export const metadata = { title: "Billing" };

export default function BillingPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Billing</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCardIcon className="size-5 text-muted-foreground" />
              <CardTitle>Payment Method</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Visa ending in 4242</p>
              <p className="text-xs text-muted-foreground">Expires 12/2028</p>
            </div>
            <Button variant="outline" size="sm">Update payment method</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileTextIcon className="size-5 text-muted-foreground" />
              <CardTitle>Invoices</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {["March 2026", "February 2026", "January 2026"].map((month) => (
              <div key={month} className="flex items-center justify-between rounded-lg border p-3">
                <p className="text-sm font-medium">{month}</p>
                <Button variant="ghost" size="sm">Download</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
