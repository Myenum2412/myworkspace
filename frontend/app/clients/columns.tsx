"use client";

import { ColumnDef } from "@tanstack/react-table";

export type Client = {
  id: string;
  name: string;
  email: string;
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
  whatsappNumber?: string;
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
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        className="size-4 cursor-pointer rounded border-border accent-primary"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        className="size-4 cursor-pointer rounded border-border accent-primary"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(e.target.checked)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
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
        "Lead": "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        "Prospect": "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        "Active Client": "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        "Inactive Client": "bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
        "Completed": "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      };
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorMap[status] || "bg-gray-50 text-gray-700"}`}>
          {status}
        </span>
      );
    },
  },
];
