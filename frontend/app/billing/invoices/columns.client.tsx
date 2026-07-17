"use client"

import { type ColumnDef } from "@tanstack/react-table"
import {
  RiDownloadLine,
  RiEyeLine,
  RiPencilLine,
  RiDeleteBinLine,
  RiExternalLinkLine,
  RiMoreLine,
} from "@remixicon/react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { generateInvoicePDF } from "@/lib/pdf"

export type Invoice = {
  id: string
  number: string
  amountPaid: number
  currency: string
  status: string
  pdfUrl: string
  hostedUrl: string
  createdAt: string
  customerName: string
  services: string
}

const statusStyles: Record<string, string> = {
  paid: "bg-green-50 text-green-700",
  open: "bg-blue-50 text-blue-700",
  void: "bg-gray-100 text-gray-700",
}

export const columns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "number",
    header: "Invoice",
    cell: ({ row }) => {
      const inv = row.original
      return (
        <span className="font-mono text-xs text-muted-foreground">
          {inv.number || `INV-${inv.id.slice(0, 5).toUpperCase()}`}
        </span>
      )
    },
  },
  {
    accessorKey: "customerName",
    header: "Customer",
    cell: ({ row }) => {
      const inv = row.original
      const initials = (inv.customerName || "U")
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
      return (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar className="size-7 shrink-0 border border-border">
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
          <span className="truncate text-sm font-medium">
            {inv.customerName || "—"}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => {
      const val = row.getValue("createdAt") as string
      if (!val) return <span className="text-muted-foreground">—</span>
      try {
        return (
          <span className="text-sm tabular-nums">
            {new Date(val).toLocaleDateString()}
          </span>
        )
      } catch {
        return <span className="text-sm">{val}</span>
      }
    },
  },
  {
    accessorKey: "services",
    header: "Services",
    cell: ({ row }) => {
      const val = row.getValue("services") as string
      return (
        <span className="block max-w-[140px] truncate text-sm" title={val}>
          {val || "—"}
        </span>
      )
    },
  },
  {
    accessorKey: "amountPaid",
    header: "Amount",
    cell: ({ row }) => {
      const inv = row.original
      return (
        <span className="block text-right text-sm font-semibold tabular-nums">
          ₹{((inv.amountPaid || 0) / 100).toFixed(2)}{" "}
          {(inv.currency || "INR").toUpperCase()}
        </span>
      )
    },
  },
  {
    accessorKey: "status",
    enableSorting: false,
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const label = status === "paid" ? "Paid" : status === "open" ? "Pending" : status === "void" ? "Void" : status
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[status] || "bg-gray-100 text-gray-700"}`}>
          {label}
        </span>
      )
    },
  },
  {
    id: "actions",
    enableSorting: false,
    header: "",
    cell: ({ row }) => {
      const inv = row.original
      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${inv.id}`}>
                <RiMoreLine className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => (window.location.href = `/billing/invoices/${inv.id}`)}>
                <RiPencilLine aria-hidden="true" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                if (!inv.pdfUrl) { e.preventDefault(); generateInvoicePDF(inv) }
              }}>
                <RiDownloadLine aria-hidden="true" />
                {inv.pdfUrl ? "Download PDF" : "Generate PDF"}
              </DropdownMenuItem>
              {inv.pdfUrl && (
                <DropdownMenuItem onClick={() => window.open(inv.pdfUrl, "_blank")}>
                  <RiEyeLine aria-hidden="true" />
                  View PDF
                </DropdownMenuItem>
              )}
              {inv.hostedUrl && (
                <DropdownMenuItem onClick={() => window.open(inv.hostedUrl, "_blank")}>
                  <RiExternalLinkLine aria-hidden="true" />
                  Open Hosted
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={async () => {
                if (confirm("Are you sure you want to delete this invoice?")) {
                  await fetch(`/api/billing/invoices/${inv.id}`, { method: "DELETE" })
                  window.location.reload()
                }
              }}>
                <RiDeleteBinLine aria-hidden="true" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  },
]
