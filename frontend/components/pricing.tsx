import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Starter",
    price: "$29",
    description: "Perfect for small teams getting started with project management.",
    features: [
      "Up to 10 team members",
      "5 projects",
      "Basic time tracking",
      "Task management",
      "Email notifications",
      "7-day history",
    ],
    popular: false,
  },
  {
    name: "Growth",
    price: "$79",
    description: "For growing teams that need advanced collaboration tools.",
    features: [
      "Up to 50 team members",
      "Unlimited projects",
      "Advanced time tracking",
      "Custom workflows",
      "Analytics & reports",
      "Priority support",
      "Integrations",
      "90-day history",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$199",
    description: "For organizations requiring enterprise-grade security and control.",
    features: [
      "Unlimited team members",
      "Unlimited projects",
      "Dedicated account manager",
      "SSO & SAML",
      "Audit logs",
      "Custom integrations",
      "SLA guarantee",
      "Unlimited history",
    ],
    popular: false,
  },
];

export function Pricing() {
  return (
    <div className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-sm font-medium text-brand-600 shadow-xs">
            Pricing
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-brand-600">
            Choose the plan that fits your team. No hidden fees, no surprises.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-xl border bg-white p-8 transition-all duration-200 hover:shadow-lg ${
                plan.popular
                  ? "border-brand-500 shadow-md ring-1 ring-brand-500/20 scale-105 lg:scale-110"
                  : "border-brand-200/60 hover:border-brand-300"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center rounded-full bg-brand-800 px-4 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-brand-900">
                  {plan.name}
                </h3>
                <p className="mt-2 text-sm text-brand-600">
                  {plan.description}
                </p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-brand-900">
                    {plan.price}
                  </span>
                  <span className="text-sm text-brand-400">/month</span>
                </div>
              </div>

              <Button
                asChild
                variant={plan.popular ? "default" : "outline"}
                className={`mb-8 h-11 w-full text-base font-medium ${
                  plan.popular ? "" : "border-brand-200 text-brand-800 hover:bg-brand-50"
                }`}
              >
                <a href="/signup">
                  Get started
                  <ArrowRight className="ml-2 size-4" />
                </a>
              </Button>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand-500" />
                    <span className="text-sm text-brand-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
