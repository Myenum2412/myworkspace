import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "lucide-react";

export const metadata = { title: "Plans" };

const plans = [
  { name: "Free", price: "$0", description: "Essential features for small teams.", features: ["Up to 5 members", "Basic tasks", "10 GB storage", "Email support"], popular: false },
  { name: "Growth", price: "$79", description: "For growing organizations.", features: ["Up to 50 members", "Advanced tasks & workflows", "200 GB storage", "Priority support", "API access", "Custom integrations"], popular: true },
  { name: "Enterprise", price: "Custom", description: "Custom solutions for large orgs.", features: ["Unlimited members", "Enterprise SSO", "Unlimited storage", "Dedicated support", "Custom SLAs", "On-premise option"], popular: false },
];

export default function PlansPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Plans</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.name} className={`relative ${plan.popular ? "border-primary shadow-lg" : ""}`}>
            {plan.popular && <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">Popular</Badge>}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold">{plan.price}</span>
                {plan.price !== "Custom" && <span className="text-sm text-muted-foreground">/month</span>}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="text-sm flex items-center gap-2">
                    <CheckIcon className="size-4 text-primary shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                {plan.price === "Custom" ? "Contact sales" : "Get started"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
