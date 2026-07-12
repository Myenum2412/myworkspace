"use client"
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Stock = {
  id: string;
  itemCode: string;
  productName: string;
  category: string;
  brand: string;
  unit: string;
  openingStock: number;
  stockIn: number;
  stockOut: number;
  availableStock: number;
  reorderLevel: number;
  purchasePrice: number;
  sellingPrice: number;
  supplier: string;
  warehouse: string;
  status: string;
  lastUpdated: string;
  image?: string;
};

const stockStatus = (available: number, reorder: number) => {
  if (available <= 0) return "Out of Stock";
  if (available <= reorder) return "Low Stock";
  return "In Stock";
};

const statusColorMap: Record<string, string> = {
  "In Stock": "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "Low Stock": "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "Out of Stock": "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export const columns: ColumnDef<Stock>[] = [
  {
    id: "sno",
    header: "S.No",
    cell: ({ row }) => <span className="text-muted-foreground">{row.index + 1}</span>,
    enableSorting: false,
    size: 50,
  },
  {
    accessorKey: "itemCode",
    header: "Item Code",
    cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("itemCode") || "—"}</span>,
    size: 105,
  },
  {
    accessorKey: "productName",
    header: "Product Name",
    cell: ({ row }) => <span className="font-medium text-xs">{row.getValue("productName")}</span>,
    size: 140,
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => <span className="text-xs">{row.getValue("category") || "—"}</span>,
    size: 100,
  },
  {
    accessorKey: "brand",
    header: "Brand",
    cell: ({ row }) => <span className="text-xs">{row.getValue("brand") || "—"}</span>,
    size: 90,
  },
  {
    accessorKey: "unit",
    header: "Unit",
    cell: ({ row }) => <span className="text-xs">{row.getValue("unit") || "—"}</span>,
    size: 60,
  },
  {
    accessorKey: "openingStock",
    header: "Opening Stock",
    cell: ({ row }) => <span className="text-xs">{row.getValue<number>("openingStock")}</span>,
    size: 100,
  },
  {
    accessorKey: "stockIn",
    header: "Stock In",
    cell: ({ row }) => <span className="text-xs">{row.getValue<number>("stockIn")}</span>,
    size: 80,
  },
  {
    accessorKey: "stockOut",
    header: "Stock Out",
    cell: ({ row }) => <span className="text-xs">{row.getValue<number>("stockOut")}</span>,
    size: 80,
  },
  {
    accessorKey: "availableStock",
    header: "Available Stock",
    cell: ({ row }) => <span className="text-xs font-semibold">{row.getValue<number>("availableStock")}</span>,
    size: 110,
  },
  {
    accessorKey: "reorderLevel",
    header: "Reorder Level",
    cell: ({ row }) => <span className="text-xs">{row.getValue<number>("reorderLevel")}</span>,
    size: 100,
  },
  {
    accessorKey: "supplier",
    header: "Supplier",
    cell: ({ row }) => <span className="text-xs">{row.getValue("supplier") || "—"}</span>,
    size: 120,
  },
  {
    accessorKey: "purchasePrice",
    header: "Purchase Price",
    cell: ({ row }) => <span className="text-xs">₹{Number(row.getValue<number>("purchasePrice")).toFixed(2)}</span>,
    size: 110,
  },
  {
    accessorKey: "sellingPrice",
    header: "Selling Price",
    cell: ({ row }) => <span className="text-xs">₹{Number(row.getValue<number>("sellingPrice")).toFixed(2)}</span>,
    size: 110,
  },
  {
    accessorKey: "lastUpdated",
    header: "Last Updated",
    cell: ({ row }) => <span className="text-xs">{row.getValue("lastUpdated") || "—"}</span>,
    size: 110,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const avail = row.original.availableStock;
      const reorder = row.original.reorderLevel;
      const status = stockStatus(avail, reorder);
      return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColorMap[status] || ""}`}>
          {status}
        </span>
      );
    },
    size: 100,
  },
];

export function makeActionsCell(
  onView: (stock: Stock) => void,
  onEdit: (stock: Stock) => void,
  onDelete: (stock: Stock) => void,
): ColumnDef<Stock> {
  return {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const stock = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onView(stock)}>
              <Eye className="mr-2 size-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(stock)}>
              <Pencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDelete(stock)}
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    enableHiding: false,
    size: 70,
  };
}
