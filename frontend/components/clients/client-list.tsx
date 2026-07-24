"use client"
import { DataTable } from "@/app/clients/data-table";
import { columns, makeActionsCell, type Client } from "@/app/clients/columns";

type ClientListProps = {
  clients: Client[];
  onView: (client: Client) => void;
  onEdit?: (client: Client) => void;
  onDelete: (client: Client) => void;
  hideSearchBar?: boolean;
};

export function ClientList({ clients, onView, onEdit, onDelete, hideSearchBar }: ClientListProps) {
  return (
    <div className="flex-1">
      <DataTable
        columns={[...columns, makeActionsCell(onView, onDelete, onEdit)]}
        data={clients}
        hideSearchBar={hideSearchBar}
      />
    </div>
  );
}
