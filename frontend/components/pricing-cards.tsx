"use client";

import { useState, useEffect } from "react";
import { Check, Sparkles, Zap, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { priceTiers, getPrice, type Currency } from "@/lib/currency";
import { useUserCountry, isINR } from "@/hooks/use-user-country";

interface PricingCardsProps {
  selectedPlan?: string;
  onSelectPlan: (plan: string) => void;
}

export function PricingCards({ selectedPlan, onSelectPlan }: PricingCardsProps) {
  const { country, loading } = useUserCountry();
  const currency: Currency = isINR(country) ? "INR" : "USD";

  return (
    <div className="grid gap-6 lg:grid-cols-3 w-full max-w-5xl mx-auto">
      {priceTiers.map((plan) => {
        const Icon = plan.id === "free" ? Zap : plan.id === "growth" ? Sparkles : Building2;
        const isSelected = selectedPlan === plan.id;
        const price = getPrice(plan, currency);
        return (
          <div
            key={plan.id}
            onClick={() => onSelectPlan(plan.id)}
            className={cn(
              "relative flex flex-col rounded-2xl border-2 p-6 cursor-pointer transition-all duration-300 hover:shadow-xl",
              isSelected
                ? "border-primary bg-primary/5 shadow-lg scale-[1.02]"
                : "border-border bg-card hover:border-primary/40",
              plan.popular && !isSelected && "border-primary/30 shadow-md"
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  <Sparkles className="size-3" />
                  Most Popular
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "flex size-10 items-center justify-center rounded-xl",
                isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                <Icon className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{plan.name}</h3>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">{price}</span>
                <span className="text-sm text-muted-foreground">{plan.id === "enterprise" ? "" : plan.period}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
            </div>

            <ul className="space-y-2.5 mb-6 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "w-full h-10",
                isSelected && "shadow-md"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onSelectPlan(plan.id);
              }}
            >
              {isSelected ? (
                <>
                  Selected
                  <Check className="ml-2 size-4" />
                </>
              ) : (
                <>
                  Choose {plan.name}
                  <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
