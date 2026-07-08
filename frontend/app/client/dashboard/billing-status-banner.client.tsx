"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { FileViewer, type ViewerFile } from "@/components/ui/file-viewer"
import {
  CreditCardIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  ClockIcon,
  XCircleIcon,
  DownloadIcon,
  EyeIcon,
  ReceiptIcon,
  CalendarIcon,
  WalletIcon,
  BanIcon,
} from "lucide-react"

type BillingStatus = "active" | "due_soon" | "overdue" | "trial" | "expired" | "none"

type InvoiceData = {
  id: string
  number: string
  amountDue: number
  amountPaid: number
  currency: string
  status: string
  pdfUrl: string
  hostedUrl: string
  createdAt: string
  periodStart: string
  periodEnd: string
}

type BillingData = {
  plan: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  subscriptionStatus: string | null
  currentPeriodEnd: string | null
  trialEnd: string | null
  stripeSubscription: Record<string, unknown> | null
  invoices: InvoiceData[]
  hasPaymentMethod: boolean
}

const STATUS_CONFIG: Record<BillingStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; ring: string; text: string }> = {
  active: {
    label: "Active",
    icon: CheckCircle2Icon,
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    ring: "ring-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  due_soon: {
    label: "Due Soon",
    icon: ClockIcon,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    ring: "ring-amber-500/20",
    text: "text-amber-700 dark:text-amber-300",
  },
  overdue: {
    label: "Overdue",
    icon: AlertCircleIcon,
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950/30",
    ring: "ring-red-500/20",
    text: "text-red-700 dark:text-red-300",
  },
  trial: {
    label: "Trial",
    icon: WalletIcon,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    ring: "ring-blue-500/20",
    text: "text-blue-700 dark:text-blue-300",
  },
  expired: {
    label: "Expired",
    icon: XCircleIcon,
    color: "text-gray-600",
    bg: "bg-gray-50 dark:bg-gray-800/50",
    ring: "ring-gray-400/20",
    text: "text-gray-600 dark:text-gray-400",
  },
  none: {
    label: "Free Plan",
    icon: BanIcon,
    color: "text-gray-500",
    bg: "bg-gray-50 dark:bg-gray-800/50",
    ring: "ring-gray-400/20",
    text: "text-gray-600 dark:text-gray-400",
  },
}

function deriveStatus(data: BillingData): BillingStatus {
  const status = data.subscriptionStatus
  if (status === "active" && data.currentPeriodEnd) {
    const dueDate = new Date(data.currentPeriodEnd)
    const now = new Date()
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntilDue <= 7) return "due_soon"
    return "active"
  }
  if (status === "past_due" || status === "unpaid") return "overdue"
  if (status === "trialing") return "trial"
  if (status === "canceled" || status === "incomplete_expired") return "expired"
  if (!status || status === "none" || data.plan === "free") return "none"
  return "active"
}

function getPlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    growth: "Growth",
    pro: "Pro",
    enterprise: "Enterprise",
  }
  return labels[plan] || plan.charAt(0).toUpperCase() + plan.slice(1)
}

function getPeriodProgress(data: BillingData): number {
  if (!data.currentPeriodEnd || !data.stripeSubscription?.current_period_start) return 0
  const start = new Date((data.stripeSubscription.current_period_start as number) * 1000).getTime()
  const end = new Date(data.currentPeriodEnd).getTime()
  const now = Date.now()
  if (now <= start) return 0
  if (now >= end) return 100
  return ((now - start) / (end - start)) * 100
}

function formatCurrency(amount: number, currency: string): string {
  const value = amount / 100
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(value)
}

function getDaysRemaining(data: BillingData): number {
  if (!data.currentPeriodEnd) return 0
  const end = new Date(data.currentPeriodEnd).getTime()
  const now = Date.now()
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
}

type BillingStatusBannerProps = {
  token: string
}

export default function BillingStatusBanner({ token }: BillingStatusBannerProps) {
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewerFile, setViewerFile] = useState<ViewerFile | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)

    fetch("/api/client-auth/billing-status", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setData(res.data)
        } else {
          setError(res.error || "Failed to load billing data")
        }
      })
      .catch(() => setError("Network error loading billing data"))
      .finally(() => setLoading(false))
  }, [token])

  const status = useMemo(() => data ? deriveStatus(data) : "none", [data])
  const config = STATUS_CONFIG[status]
  const progress = useMemo(() => data ? getPeriodProgress(data) : 0, [data])
  const daysRemaining = useMemo(() => data ? getDaysRemaining(data) : 0, [data])
  const planLabel = useMemo(() => data ? getPlanLabel(data.plan) : "—", [data])
  const latestInvoice = useMemo(() => {
    if (!data?.invoices?.length) return null
    return data.invoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  }, [data])
  const dueInvoice = useMemo(() => {
    if (!data?.invoices?.length) return null
    return data.invoices.find((inv) => inv.status === "open" || inv.status === "past_due") || null
  }, [data])

  const handleViewInvoice = (inv: InvoiceData) => {
    if (!inv.pdfUrl) return
    setViewerFile({
      url: inv.pdfUrl,
      name: `Invoice_${inv.number || inv.id}.pdf`,
      mimeType: "application/pdf",
      size: 0,
    })
    setViewerOpen(true)
  }

  const handleDownloadInvoice = (inv: InvoiceData) => {
    if (!inv.pdfUrl) return
    const a = document.createElement("a")
    a.href = inv.pdfUrl
    a.download = `Invoice_${inv.number || inv.id}.pdf`
    a.click()
  }

  const handleBillingHistory = () => {
    if (latestInvoice?.hostedUrl) {
      window.open(latestInvoice.hostedUrl, "_blank")
    } else if (data?.invoices?.length) {
      window.open(data.invoices[0].hostedUrl, "_blank")
    }
  }

  const handlePayNow = () => {
    if (dueInvoice?.hostedUrl) {
      window.open(dueInvoice.hostedUrl, "_blank")
    } else if (latestInvoice?.hostedUrl) {
      window.open(latestInvoice.hostedUrl, "_blank")
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-md" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-3 text-destructive">
          <AlertCircleIcon className="size-5 shrink-0" />
          <p className="text-sm">Failed to load billing information. <button onClick={() => window.location.reload()} className="underline underline-offset-2 hover:text-destructive/80 font-medium">Try again</button></p>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={cn("rounded-xl border p-5 space-y-4", config.bg)}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
              className={cn("size-10 rounded-full flex items-center justify-center shrink-0 ring-1", config.ring, config.bg)}
            >
              <config.icon className={cn("size-5", config.color)} />
            </motion.div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1", config.bg, config.text, config.ring)}>
                  <config.icon className="size-3" />
                  {config.label}
                </span>
                <span className="text-sm font-semibold">{planLabel} Plan</span>
              </div>
              {data.currentPeriodEnd && status !== "none" && status !== "expired" && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {daysRemaining > 0
                    ? `${daysRemaining} days remaining in billing period`
                    : "Billing period ending today"}
                </p>
              )}
              {status === "trial" && data.trialEnd && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Trial ends {new Date(data.trialEnd).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
            {latestInvoice?.pdfUrl && (
              <>
                <Button variant="ghost" size="sm" onClick={() => handleViewInvoice(latestInvoice)} className="shrink-0">
                  <EyeIcon className="size-3.5 mr-1" /> View Invoice
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDownloadInvoice(latestInvoice)} className="shrink-0">
                  <DownloadIcon className="size-3.5 mr-1" /> Download
                </Button>
              </>
            )}
            {dueInvoice && (status === "overdue" || status === "due_soon") && (
              <Button size="sm" onClick={handlePayNow} className="shrink-0">
                <CreditCardIcon className="size-3.5 mr-1" /> Pay Now
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleBillingHistory} className="shrink-0">
              <ReceiptIcon className="size-3.5 mr-1" /> History
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <InfoCard icon={CalendarIcon} label="Next Billing" value={data.currentPeriodEnd ? new Date(data.currentPeriodEnd).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"} />
          <InfoCard icon={WalletIcon} label="Plan" value={planLabel} />
          <InfoCard
            icon={CreditCardIcon}
            label={dueInvoice && dueInvoice.status === "open" ? "Amount Due" : "Latest Invoice"}
            value={dueInvoice && dueInvoice.status === "open" ? formatCurrency(dueInvoice.amountDue, dueInvoice.currency) : latestInvoice ? `#${latestInvoice.number || latestInvoice.id.slice(0, 8)}` : "—"}
          />
          <InfoCard
            icon={latestInvoice?.status === "paid" ? CheckCircle2Icon : ClockIcon}
            label="Payment Status"
            value={latestInvoice ? latestInvoice.status.charAt(0).toUpperCase() + latestInvoice.status.slice(1) : "—"}
            valueClassName={latestInvoice?.status === "paid" ? "text-emerald-600" : latestInvoice?.status === "open" ? "text-amber-600" : ""}
          />
        </div>

        {data.currentPeriodEnd && status !== "none" && status !== "expired" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Billing period progress</span>
              <span>{Math.round(progress)}% used</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                className={cn(
                  "h-full rounded-full",
                  progress > 90 ? "bg-red-500" : progress > 75 ? "bg-amber-500" : "bg-primary"
                )}
              />
            </div>
          </div>
        )}
      </motion.div>

      <FileViewer file={viewerFile} open={viewerOpen} onOpenChange={setViewerOpen} />
    </>
  )
}

function InfoCard({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-lg border bg-card/50 backdrop-blur-sm p-3 space-y-1"
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </div>
      <p className={cn("text-sm font-semibold truncate", valueClassName)}>{value}</p>
    </motion.div>
  )
}
