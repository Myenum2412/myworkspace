import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "lucide-react";

export const metadata = { title: "Plans" };

const plans = [
  {
    name: "Starter",
    price: "Free",
    features: ["Up to 10 team members", "5 projects", "1 GB storage", "Basic reporting"],
  },
  {
    name: "Pro",
    price: "$29",
    features: ["Up to 50 team members", "Unlimited projects", "10 GB storage", "Advanced reporting", "Priority support"],
  },
  {
    name: "Enterprise",
    price: "$99",
    features: ["Unlimited team members", "Unlimited projects", "Unlimited storage", "Custom reporting", "Dedicated support", "SSO"],
  },
];

export default function BillingPlansPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-4">
      <h1 className="text-2xl font-bold">Plans</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.name}>
            <CardHeader>
              <CardTitle>{p.name}</CardTitle>
              <p className="text-3xl font-bold">{p.price}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckIcon className="size-4 text-green-600 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full">{p.name === "Starter" ? "Current Plan" : "Upgrade"}</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
