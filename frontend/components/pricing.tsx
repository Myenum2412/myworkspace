"use client";

import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserCountry, isINR, getCurrencySymbol } from "@/hooks/use-user-country";
import { priceTiers } from "@/lib/currency";

export function Pricing() {
  const { country, loading, toggleCurrency } = useUserCountry();
  const inr = isINR(country);
  const sym = getCurrencySymbol(country);

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
            Choose the plan that fits your team. Prices shown in {loading ? "USD" : inr ? "INR (₹)" : "USD ($)"}.
          </p>
        </div>

        {!loading && (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-brand-600">
            <span className={inr ? "font-semibold text-brand-900" : ""}>₹ INR</span>
            <div
              className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors ${
                inr ? "bg-brand-800" : "bg-brand-200"
              }`}
              onClick={toggleCurrency}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  inr ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </div>
            <span className={!inr ? "font-semibold text-brand-900" : ""}>$ USD</span>
          </div>
        )}

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {priceTiers.map((plan) => {
            const price = inr ? plan.inr : plan.usd;
            const period = plan.id === "enterprise" ? "" : plan.period;
            return (
              <div
                key={plan.id}
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
                      {inr && plan.id !== "enterprise" ? `₹${plan.inr.replace("₹", "")}` : price}
                    </span>
                    {period && <span className="text-sm text-brand-400">{period}</span>}
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
                    {plan.id === "enterprise" ? "Contact sales" : "Get started"}
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
