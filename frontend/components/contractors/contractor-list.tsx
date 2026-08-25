"use client";
import { type Contractor, columns, makeActionsCell } from "@/app/contractors/columns";
import { DataTable } from "@/app/contractors/data-table";

type ContractorListProps = {
  contractors: Contractor[];
  onView: (contractor: Contractor) => void;
  onEdit: (contractor: Contractor) => void;
  onDelete: (contractor: Contractor) => void;
};

export function ContractorList({ contractors, onView, onEdit, onDelete }: ContractorListProps) {
  return (
    <div className="flex-1">
      <DataTable
        columns={[...columns, makeActionsCell(onView, onEdit, onDelete)]}
        data={contractors}
        onRowClick={onView}
      />
    </div>
  );
}
