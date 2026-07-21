"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/app/clients/data-table";
import { columns, makeActionsCell, type Client } from "@/app/clients/columns";

type ClientListProps = {
  clients: Client[];
  onView: (client: Client) => void;
  onEdit?: (client: Client) => void;
  onDelete: (client: Client) => void;
};

export function ClientList({ clients, onView, onEdit, onDelete }: ClientListProps) {
  return (
    <>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {clients.filter((c) => c.status === "Active Client").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Inactive / Lead</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {clients.filter((c) => c.status === "Inactive Client" || c.status === "Lead").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.reduce((acc, c) => acc + c.projects, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 mt-4">
        <DataTable
          columns={[...columns, makeActionsCell(onView, onDelete, onEdit)]}
          data={clients}
        />
      </div>
    </>
  );
}
