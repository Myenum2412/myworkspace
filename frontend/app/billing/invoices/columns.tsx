"use client"
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLinkIcon, FileTextIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon, DownloadIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { generateInvoicePDF } from "@/lib/pdf";

export type Invoice = {
  id: string;
  number: string;
  amountPaid: number;
  currency: string;
  status: string;
  pdfUrl: string;
  hostedUrl: string;
  createdAt: string;
  customerName: string;
  services: string;
};

export const columns: ColumnDef<Invoice>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
    meta: { className: "hidden md:table-cell" },
  },
  {
    id: "sno",
    header: "S.No",
    cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.index + 1}</span>,
    enableSorting: false,
    size: 50,
    meta: { className: "hidden md:table-cell" },
  },
  {
    accessorKey: "number",
    header: "Invoice",
    cell: ({ row }) => {
      const inv = row.original;
      return <span className="font-medium text-gray-900">{inv.number || inv.id.slice(0, 8)}</span>;
    },
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => {
      const val = row.getValue("createdAt") as string;
      if (!val) return <span className="text-muted-foreground">—</span>;
      try {
        return <span className="text-muted-foreground">{new Date(val).toLocaleDateString()}</span>;
      } catch {
        return <span>{val}</span>;
      }
    },
    meta: { className: "hidden md:table-cell" },
  },
  {
    accessorKey: "customerName",
    header: "Customer Name",
    cell: ({ row }) => <span className="font-medium text-gray-700">{row.getValue("customerName") || "—"}</span>,
  },
  {
    accessorKey: "services",
    header: "Services & Deliverable",
    cell: ({ row }) => {
      const val = row.getValue("services") as string;
      return <span className="text-gray-600 truncate max-w-[200px] block" title={val}>{val || "—"}</span>;
    },
    meta: { className: "hidden md:table-cell" },
  },
  {
    id: "amount",
    header: "Amount",
    cell: ({ row }) => {
      const inv = row.original;
      return (
        <span className="text-gray-700">
          ₹{(inv.amountPaid / 100).toFixed(2)} {inv.currency.toUpperCase()}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      if (status === "paid") {
        return <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Paid Invoices</span>;
      } else if (status === "open") {
        return <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10">Pending Payment</span>;
      } else if (status === "void") {
        return <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10">Cancelled / Void Invoices</span>;
      }
      return <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10">{status}</span>;
    },
  },

  {
    id: "actions",
    header: "Action",
    cell: ({ row }) => {
      const inv = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => window.location.href = `/billing/invoices/${inv.id}`}>
              <PencilIcon className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={(e) => {
                if (!inv.pdfUrl) {
                  e.preventDefault();
                  generateInvoicePDF(inv);
                }
              }}
              asChild={!!inv.pdfUrl}
            >
              {inv.pdfUrl ? (
                <a href={inv.pdfUrl} download={`Invoice_${inv.number || inv.id}.pdf`}>
                  <DownloadIcon className="mr-2 size-4" />
                  Download PDF
                </a>
              ) : (
                <div className="flex items-center cursor-pointer w-full">
                  <DownloadIcon className="mr-2 size-4" />
                  Download PDF
                </div>
              )}
            </DropdownMenuItem>

            {inv.pdfUrl && (
              <DropdownMenuItem onClick={() => window.open(inv.pdfUrl, "_blank")}>
                <FileTextIcon className="mr-2 size-4" />
                View PDF
              </DropdownMenuItem>
            )}
            {inv.hostedUrl && (
              <DropdownMenuItem onClick={() => window.open(inv.hostedUrl, "_blank")}>
                <ExternalLinkIcon className="mr-2 size-4" />
                Open Hosted
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={async () => {
                if (confirm("Are you sure you want to delete this invoice?")) {
                  await fetch(`/api/billing/invoices/${inv.id}`, { method: "DELETE" });
                  window.location.reload();
                }
              }}
            >
              <Trash2Icon className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    size: 40,
  },
];
