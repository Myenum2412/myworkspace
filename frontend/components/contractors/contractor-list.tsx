"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/app/contractors/data-table";
import { columns, makeActionsCell, type Contractor } from "@/app/contractors/columns";

type ContractorListProps = {
  contractors: Contractor[];
  onView: (contractor: Contractor) => void;
  onEdit: (contractor: Contractor) => void;
  onDelete: (contractor: Contractor) => void;
};

export function ContractorList({ contractors, onView, onEdit, onDelete }: ContractorListProps) {
  return (
    <>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Contractors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contractors.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {contractors.filter((c) => c.status === "Active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">With Insurance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contractors.filter((c) => c.insuranceAvailable === "Yes").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Workers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contractors.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 mt-4">
        <DataTable
          columns={[...columns, makeActionsCell(onView, onEdit, onDelete)]}
          data={contractors}
          onRowClick={onView}
        />
      </div>
    </>
  );
}
