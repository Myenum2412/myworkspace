"use client"
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Contractor = {
  id: string;
  orgId: string;
  fullName: string;
  companyName?: string;
  mobileNumber: string;
  emailAddress: string;
  country: string;
  city: string;
  address?: string;
  contractorType: "Individual" | "Company" | "Subcontractor";
  mainTrade: string;
  otherTrade?: string;
  yearsOfExperience: string;
  numberOfWorkers: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  insuranceAvailable: "Yes" | "No";
  availableFrom: string;
  preferredWorkArea: string;
  willingToTravel: "Yes" | "No";
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  swiftBic?: string;
  currency: string;
  governmentId: string;
  governmentIdFile?: string;
  tradeLicense?: string;
  insuranceCertificate?: string;
  emergencyContacts: { name: string; phoneNumber: string; email?: string }[];
  declarationConfirmed: boolean;
  termsAccepted: boolean;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
};

export const columns: ColumnDef<Contractor>[] = [
  {
    id: "sno",
    header: "S.No",
    cell: ({ row }) => <span className="text-muted-foreground">{row.index + 1}</span>,
    enableSorting: false,
  },
  {
    accessorKey: "fullName",
    header: "Full Name",
    cell: ({ row }) => <span className="font-medium">{row.getValue("fullName")}</span>,
  },
  {
    accessorKey: "emailAddress",
    header: "Email",
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("emailAddress")}</span>,
  },
  {
    accessorKey: "mobileNumber",
    header: "Mobile",
    cell: ({ row }) => <span>{row.getValue("mobileNumber")}</span>,
  },
  {
    accessorKey: "contractorType",
    header: "Type",
    cell: ({ row }) => <span className="capitalize">{row.getValue("contractorType")}</span>,
  },
  {
    accessorKey: "mainTrade",
    header: "Trade",
    cell: ({ row }) => <span>{row.getValue("mainTrade")}</span>,
  },
  {
    accessorKey: "yearsOfExperience",
    header: "Experience",
    cell: ({ row }) => <span>{row.getValue("yearsOfExperience")} yrs</span>,
  },
  {
    accessorKey: "numberOfWorkers",
    header: "Workers",
    cell: ({ row }) => <span>{row.getValue("numberOfWorkers")}</span>,
  },
  {
    accessorKey: "insuranceAvailable",
    header: "Insurance",
    cell: ({ row }) => {
      const val = row.getValue<string>("insuranceAvailable");
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          val === "Yes" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
        }`}>
          {val}
        </span>
      );
    },
  },
  {
    accessorKey: "city",
    header: "City",
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("city") || "—"}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue<string>("status");
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          status === "Active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
        }`}>
          {status}
        </span>
      );
    },
  },
];

export function makeActionsCell(
  onView: (contractor: Contractor) => void,
  onEdit: (contractor: Contractor) => void,
  onDelete: (contractor: Contractor) => void,
): ColumnDef<Contractor> {
  return {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const c = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onView(c)}>
              <Eye className="mr-2 size-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(c)}>
              <Pencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDelete(c)}
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
