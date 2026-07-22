"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { RiCheckLine, RiSparklingFill } from "@remixicon/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import CtaBlock from "@/components/cta-block"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

type CurrencyCode = keyof typeof currencies

const currencies = {
  INR: { symbol: "₹", label: "INR", rate: 1, locale: "en-IN" },
  JPY: { symbol: "¥", label: "JPY", rate: 1.68, locale: "ja-JP" },
  CNY: { symbol: "¥", label: "CNY", rate: 0.083, locale: "zh-CN" },
  KRW: { symbol: "₩", label: "KRW", rate: 15.5, locale: "ko-KR" },
  SGD: { symbol: "$", label: "SGD", rate: 0.016, locale: "en-SG" },
  MYR: { symbol: "RM", label: "MYR", rate: 0.052, locale: "ms-MY" },
  THB: { symbol: "฿", label: "THB", rate: 0.40, locale: "th-TH" },
  IDR: { symbol: "Rp", label: "IDR", rate: 185, locale: "id-ID" },
  PHP: { symbol: "₱", label: "PHP", rate: 0.67, locale: "en-PH" },
  VND: { symbol: "₫", label: "VND", rate: 290, locale: "vi-VN" },
  HKD: { symbol: "$", label: "HKD", rate: 0.090, locale: "en-HK" },
  TWD: { symbol: "$", label: "TWD", rate: 0.37, locale: "zh-TW" },
  AED: { symbol: "د.إ", label: "AED", rate: 0.044, locale: "ar-AE" },
  SAR: { symbol: "﷼", label: "SAR", rate: 0.045, locale: "ar-SA" },
  BDT: { symbol: "৳", label: "BDT", rate: 1.35, locale: "bn-BD" },
  PKR: { symbol: "₨", label: "PKR", rate: 3.35, locale: "ur-PK" },
  LKR: { symbol: "₨", label: "LKR", rate: 3.80, locale: "si-LK" },
  NPR: { symbol: "₨", label: "NPR", rate: 1.60, locale: "ne-NP" },
}

const regionToCurrency: Record<string, CurrencyCode> = {
  IN: "INR", JP: "JPY", CN: "CNY", KR: "KRW", SG: "SGD",
  MY: "MYR", TH: "THB", ID: "IDR", PH: "PHP", VN: "VND",
  HK: "HKD", TW: "TWD", AE: "AED", SA: "SAR", BD: "BDT",
  PK: "PKR", LK: "LKR", NP: "NPR",
}

function detectCurrency(): CurrencyCode {
  if (typeof window === "undefined") return "INR"
  const locale = Intl.DateTimeFormat().resolvedOptions().locale
  const region = locale.split("-").pop()?.toUpperCase() ?? ""
  return regionToCurrency[region] || "INR"
}

function formatPrice(amount: number, currency: CurrencyCode): string {
  const { symbol, rate } = currencies[currency]
  const converted = amount * rate
  if (currency === "JPY" || currency === "KRW" || currency === "IDR" || currency === "VND") {
    return `${symbol}${Math.round(converted).toLocaleString()}`
  }
  if (converted >= 1000) {
    return `${symbol}${Math.round(converted).toLocaleString()}`
  }
  return `${symbol}${converted.toFixed(2)}`
}

const tiers = [
  {
    name: "Starter",
    basePrice: 5000,
    tagline: "Built for founders who need quality work without breaking the bank.",
    description: "For startups & solopreneurs",
    cta: "Get Started",
    featured: false,
    features: [
      "Up to 50 projects",
      "Up to 15 staff users",
      "500 GB storage",
      "Monthly backup",
      "2K WhatsApp tokens",
      "Email notifications — free",
    ],
  },
  {
    name: "Growth",
    basePrice: 15000,
    tagline: "Designed for businesses gaining traction and needing a professional edge.",
    description: "For growing SMBs & funded startups",
    cta: "Choose Growth",
    featured: true,
    features: [
      "Up to 100 projects",
      "Up to 40 staff users",
      "1 TB storage",
      "Weekly backup included",
      "8K WhatsApp tokens",
      "Email notifications — free",
    ],
  },
  {
    name: "Enterprise",
    basePrice: 35000,
    tagline: "For established organisations that demand strategic depth and white-glove execution.",
    description: "For enterprises & high-growth companies",
    cta: "Contact Sales",
    featured: false,
    features: [
      "Unlimited projects",
      "Unlimited staff users",
      "Unlimited storage",
      "Daily backup included",
      "Unlimited WhatsApp tokens",
      "Email notifications — free",
      "Priority support",
    ],
  },
]

export default function PricingBlock() {
  const [currency, setCurrency] = useState<CurrencyCode>("INR")

  useEffect(() => {
    setCurrency(detectCurrency())
  }, [])

  return (
    <section className="flex w-full items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Pricing Plans
          </h2>
          <p className="mt-3 text-muted-foreground">
            Choose the plan that fits your business stage. Every tier is designed to deliver measurable outcomes, not just a checklist of deliverables.
          </p>
          <p className="mt-2 text-xs text-muted-foreground/70">
            Prices shown in {currencies[currency].label} ({currencies[currency].symbol}) based on your region.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={cn(
                "flex flex-col",
                tier.featured && "bg-muted/30 ring-2 ring-primary"
              )}
            >
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  {tier.name}
                </CardTitle>
                {tier.featured && (
                  <CardAction>
                    <Badge className="gap-1.5">
                      <RiSparklingFill
                        data-icon="inline-start"
                        className="size-3.5"
                        aria-hidden="true"
                      />
                      Most Popular
                    </Badge>
                  </CardAction>
                )}
                <CardDescription className="text-sm sm:min-h-10">
                  {tier.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-6">
                {/* Price */}
                {tier.name === "Enterprise" ? (
                  <div>
                    <p className="text-4xl font-bold tracking-tight text-foreground">
                      Contact Us
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {tier.tagline}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold tracking-tight text-foreground tabular-nums">
                        {formatPrice(tier.basePrice, currency)}
                      </span>
                      <span className="text-sm text-muted-foreground">one-time</span>
                    </p>
                    <p className="mt-1 h-5 text-xs text-muted-foreground">
                      {tier.tagline}
                    </p>
                  </div>
                )}

                {/* Features */}
                <ul className="flex flex-1 flex-col gap-3 text-sm text-foreground">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <RiCheckLine
                        className="mt-0.5 size-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button
                  asChild
                  variant={tier.featured ? "default" : "outline"}
                  size="lg"
                  className="w-full"
                >
                  {tier.name === "Enterprise" ? (
                    <a href="mailto:sales@myenum.in?subject=Enterprise Plan Inquiry">{tier.cta}</a>
                  ) : (
                    <Link href="/signup">{tier.cta}</Link>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Free trial CTA */}
        <CtaBlock
          heading="Try before you buy"
          description="Get started with our Free Plan — no credit card required."
          buttonText="Get Free Plan"
        >
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs">
            <RiCheckLine className="size-3.5 text-primary" aria-hidden="true" />
            3 days free
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs">
            <RiCheckLine className="size-3.5 text-primary" aria-hidden="true" />
            1 GB storage
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs">
            <RiCheckLine className="size-3.5 text-primary" aria-hidden="true" />
            1 project
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs">
            <RiCheckLine className="size-3.5 text-primary" aria-hidden="true" />
            2 clients
          </Badge>
        </CtaBlock>
      </div>
    </section>
  )
}
