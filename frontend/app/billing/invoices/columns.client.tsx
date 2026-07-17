"use client"

import { type ColumnDef } from "@tanstack/react-table"
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiDownloadLine,
  RiExpandUpDownLine,
  RiEyeLine,
  RiMoreLine,
  RiPencilLine,
  RiDeleteBinLine,
  RiExternalLinkLine,
} from "@remixicon/react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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

const statusConfig: Record<
  string,
  { variant: "default" | "secondary" | "destructive" | "outline"; dot: string }
> = {
  paid: { variant: "default", dot: "bg-primary-foreground" },
  open: { variant: "secondary", dot: "bg-muted-foreground" },
  void: { variant: "outline", dot: "bg-muted-foreground" },
}

const headLabel =
  "text-xs font-semibold tracking-wider text-muted-foreground uppercase"
const sortButton =
  "-mx-1 inline-flex items-center gap-1 rounded-none px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground"

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc")
    return <RiArrowUpLine className="size-3.5" aria-hidden="true" />
  if (sorted === "desc")
    return <RiArrowDownLine className="size-3.5" aria-hidden="true" />
  return (
    <RiExpandUpDownLine
      className="size-3.5 text-muted-foreground/60"
      aria-hidden="true"
    />
  )
}

export const columns: ColumnDef<Invoice>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(checked) =>
          table.toggleAllPageRowsSelected(checked === true)
        }
        aria-label="Select all invoices"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(checked === true)}
        aria-label={`Select ${row.original.id}`}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
    meta: { className: "hidden md:table-cell" },
  },
  {
    accessorKey: "number",
    header: () => <span className={headLabel}>Invoice</span>,
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
    header: ({ column }) => (
      <button
        type="button"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className={sortButton}
      >
        Customer
        <SortIcon sorted={column.getIsSorted()} />
      </button>
    ),
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
          <Avatar size="sm" className="shrink-0 border border-border">
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
          <span className="truncate text-sm font-medium text-foreground">
            {inv.customerName || "—"}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: () => <span className={headLabel}>Date</span>,
    cell: ({ row }) => {
      const val = row.getValue("createdAt") as string
      if (!val) return <span className="text-muted-foreground">—</span>
      try {
        return (
          <span className="text-sm text-muted-foreground tabular-nums">
            {new Date(val).toLocaleDateString()}
          </span>
        )
      } catch {
        return <span className="text-sm text-muted-foreground">{val}</span>
      }
    },
    meta: { className: "hidden md:table-cell" },
  },
  {
    accessorKey: "services",
    header: () => <span className={headLabel}>Services</span>,
    cell: ({ row }) => {
      const val = row.getValue("services") as string
      return (
        <span
          className="block max-w-[140px] truncate text-sm text-muted-foreground"
          title={val}
        >
          {val || "—"}
        </span>
      )
    },
    meta: { className: "hidden lg:table-cell" },
  },
  {
    accessorKey: "amountPaid",
    sortingFn: "basic",
    header: ({ column }) => (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className={sortButton}
        >
          Amount
          <SortIcon sorted={column.getIsSorted()} />
        </button>
      </div>
    ),
    cell: ({ row }) => {
      const inv = row.original
      return (
        <span className="block text-right text-sm font-semibold text-foreground tabular-nums">
          ₹{((inv.amountPaid || 0) / 100).toFixed(2)}{" "}
          {(inv.currency || "INR").toUpperCase()}
        </span>
      )
    },
  },
  {
    accessorKey: "status",
    enableSorting: false,
    header: () => <span className={headLabel}>Status</span>,
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const cfg = statusConfig[status] || statusConfig.open
      const label = status === "paid" ? "Paid" : status === "open" ? "Pending" : status === "void" ? "Void" : status
      return (
        <Badge
          variant={cfg.variant}
          className="gap-1.5 text-[11px] font-medium"
        >
          <span
            className={cn("inline-block size-1.5 shrink-0", cfg.dot)}
            aria-hidden="true"
          />
          {label}
        </Badge>
      )
    },
  },
  {
    id: "actions",
    enableSorting: false,
    enableHiding: false,
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const inv = row.original
      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${inv.id}`}
              >
                <RiMoreLine className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() =>
                  (window.location.href = `/billing/invoices/${inv.id}`)
                }
              >
                <RiPencilLine aria-hidden="true" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  if (!inv.pdfUrl) {
                    e.preventDefault()
                    generateInvoicePDF(inv)
                  }
                }}
              >
                <RiDownloadLine aria-hidden="true" />
                {inv.pdfUrl ? "Download PDF" : "Generate PDF"}
              </DropdownMenuItem>
              {inv.pdfUrl && (
                <DropdownMenuItem
                  onClick={() => window.open(inv.pdfUrl, "_blank")}
                >
                  <RiEyeLine aria-hidden="true" />
                  View PDF
                </DropdownMenuItem>
              )}
              {inv.hostedUrl && (
                <DropdownMenuItem
                  onClick={() => window.open(inv.hostedUrl, "_blank")}
                >
                  <RiExternalLinkLine aria-hidden="true" />
                  Open Hosted
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={async () => {
                  if (
                    confirm("Are you sure you want to delete this invoice?")
                  ) {
                    await fetch(`/api/billing/invoices/${inv.id}`, {
                      method: "DELETE",
                    })
                    window.location.reload()
                  }
                }}
              >
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
