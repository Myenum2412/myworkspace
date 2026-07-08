"use client";

import { Check, ArrowRight, Star, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserCountry, isINR, getCurrencySymbol } from "@/hooks/use-user-country";
import { priceTiers } from "@/lib/currency";
import { useRouter } from "next/navigation";

export function Pricing() {
  const { country, loading, toggleCurrency } = useUserCountry();
  const inr = isINR(country);
  const sym = getCurrencySymbol(country);
  const router = useRouter();

  const handleClick = (planId: string) => {
    if (planId === "enterprise") {
      window.location.href = "/contact";
      return;
    }
    router.push(`/signup?plan=${planId}`);
  };

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

        <div className="mt-16 grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {priceTiers.map((plan) => {
            const price = inr ? plan.inr : plan.usd;
            const period = plan.id === "enterprise" ? "" : plan.period;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border bg-white p-8 transition-all duration-200 hover:shadow-lg ${
                  plan.popular
                    ? "border-brand-500 shadow-xl ring-2 ring-brand-500/30 scale-105 lg:scale-110 z-10"
                    : "border-brand-200/60 hover:border-brand-300"
                } ${plan.highlighted ? "bg-gradient-to-b from-white to-brand-50/50" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-800 px-4 py-1 text-xs font-semibold text-white shadow-sm">
                      <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                      Most Popular
                    </span>
                  </div>
                )}

                {plan.id === "starter" && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <Zap className="size-5 text-brand-600" />
                      <h3 className="text-xl font-bold text-brand-900">{plan.name}</h3>
                    </div>
                    <p className="mt-3 text-sm text-brand-600">
                      <span className="font-semibold text-brand-800">{plan.description}</span>
                      <br />
                      {plan.bestFor}
                    </p>
                  </div>
                )}

                {plan.id === "professional" && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <Star className="size-5 text-amber-500 fill-amber-500" />
                      <h3 className="text-xl font-bold text-brand-900">{plan.name}</h3>
                    </div>
                    <p className="mt-3 text-sm text-brand-600">
                      <span className="font-semibold text-amber-600">{plan.description}</span>
                      <br />
                      {plan.bestFor}
                    </p>
                  </div>
                )}

                {plan.id === "enterprise" && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <Crown className="size-5 text-brand-600" />
                      <h3 className="text-xl font-bold text-brand-900">{plan.name}</h3>
                    </div>
                    <p className="mt-3 text-sm text-brand-600">
                      <span className="font-semibold text-brand-800">{plan.description}</span>
                      <br />
                      {plan.bestFor}
                    </p>
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight text-brand-900">
                      {inr && plan.id !== "enterprise" ? `₹${plan.inr.replace("₹", "")}` : price}
                    </span>
                    {period && <span className="text-sm text-brand-400">{period}</span>}
                  </div>
                </div>

                <Button
                  onClick={() => handleClick(plan.id)}
                  variant={plan.popular ? "default" : "outline"}
                  className={`mb-6 h-11 w-full text-base font-medium ${
                    plan.popular ? "" : "border-brand-200 text-brand-800 hover:bg-brand-50"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="ml-2 size-4" />
                </Button>

                {plan.limits.length > 0 && (
                  <div className="mb-4 rounded-lg bg-brand-50/80 p-3">
                    <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-2">Limits</p>
                    <ul className="space-y-1">
                      {plan.limits.map((limit) => (
                        <li key={limit} className="flex items-start gap-2 text-xs text-brand-600">
                          <span className="mt-0.5 size-1.5 rounded-full bg-brand-400 shrink-0" />
                          {limit}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex-1">
                  <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-3">
                    {plan.id === "enterprise" ? "Everything in Professional +" : "Includes"}
                  </p>
                  <ul className="space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="mt-0.5 size-4 shrink-0 text-green-500" />
                        <span className="text-sm text-brand-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
