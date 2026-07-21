"use client"
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import FolderIcon from "@mui/icons-material/Folder";
import { BarChart3, MoreHorizontal, Pencil, Settings, Trash2, Workflow, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Client = {
  id: string;
  name: string;
  email: string;
  username?: string;
  company: string;
  projects: number;
  status: string;

  clientType?: string;
  industry?: string;
  websiteUrl?: string;
  primaryContact?: string;
  designation?: string;
  mobileNumber?: string;
  alternatePhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  country?: string;
  postalCode?: string;
  gstNumber?: string;
  panNumber?: string;
  companyRegNumber?: string;
  taxId?: string;
  projectName?: string;
  serviceRequired?: string;
  projectBudget?: string;
  expectedStartDate?: string;
  expectedEndDate?: string;
  billingContactName?: string;
  billingEmail?: string;
  paymentTerms?: string;
  currency?: string;
  creditLimit?: string;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  confirmAccountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  accountType?: string;
  upiId?: string;
  preferredContactMethod?: string;
  preferredTimeZone?: string;
  sourceOfLead?: string;
  notes?: string;

  assignedSalesPerson?: string;
  assignedProjectManager?: string;
  createdBy?: string;
  createdDate?: string;
  lastUpdatedDate?: string;
};

export const columns: ColumnDef<Client>[] = [
  {
    id: "sno",
    header: "S.No",
    cell: ({ row }) => <span className="text-muted-foreground">{row.index + 1}</span>,
    enableSorting: false,
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("email")}</span>,
  },
  {
    accessorKey: "username",
    header: "Username",
    cell: ({ row }) => <span className="text-muted-foreground font-mono text-xs">{row.getValue("username") || "—"}</span>,
  },
  {
    accessorKey: "company",
    header: "Company",
    cell: ({ row }) => <span>{row.getValue("company")}</span>,
  },
  {
    accessorKey: "mobileNumber",
    header: "Phone",
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("mobileNumber") || "—"}</span>,
  },
  {
    accessorKey: "city",
    header: "City",
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("city") || "—"}</span>,
  },
  {
    accessorKey: "serviceRequired",
    header: "Service",
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("serviceRequired") || "—"}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue<string>("status");
      const colorMap: Record<string, string> = {
        "Lead": "bg-gray-200 text-gray-700 dark:bg-gray-700/30 dark:text-gray-600",
        "Prospect": "bg-gray-700 text-gray-700 dark:bg-[#1e2d1d]/30 dark:text-[#7d9474]",
        "Active Client": "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        "Inactive Client": "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-600",
        "Completed": "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      };
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorMap[status] || "bg-gray-100 text-gray-700"}`}>
          {status}
        </span>
      );
    },
  },
  {
    id: "quickAccess",
    header: "Quick Access",
    cell: ({ row }) => {
      const client = row.original;
      const links = [
        { href: `/clients/${client.id}#dashboard`, label: "Dashboard", icon: BarChart3 },
        { href: `/clients/${client.id}#files`, label: "Files", icon: FolderIcon },
        { href: `/clients/${client.id}#projects`, label: "Projects", icon: Workflow },
        { href: `/clients/${client.id}#reports`, label: "Reports", icon: FileText },
        { href: `/clients/${client.id}#settings`, label: "Settings", icon: Settings },
      ];

      return (
        <div className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Button key={label} asChild variant="ghost" size="icon" className="size-8" title={label}>
              <Link href={href} aria-label={label}>
                <Icon className="size-4" />
              </Link>
            </Button>
          ))}
        </div>
      );
    },
    enableSorting: false,
  },
];

/**
 * Actions cell factory — defined here so the dropdown markup lives in one
 * place, but the handlers come from the page (which owns `setClients` and the
 * edit modal). Keeps the data-table dependency-injection free.
 */
export function makeActionsCell(
  onView: (client: Client) => void,
  onDelete: (client: Client) => void,
  onEdit?: (client: Client) => void,
): ColumnDef<Client> {
  return {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const client = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onView(client)}>
              <Eye className="mr-2 size-4" />
              View
            </DropdownMenuItem>
            {onEdit && (
              <DropdownMenuItem onSelect={() => onEdit(client)}>
                <Pencil className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDelete(client)}
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
  };
}
