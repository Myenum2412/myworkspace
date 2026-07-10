"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type EngagementStatus = "Active" | "Pending" | "Completed" | "Cancelled";

interface Engagement {
  id: number;
  entityName: string;
  status: EngagementStatus;
  date: string;
  assignedTo: string;
  outcome: string;
  notes: string;
}

const initialData: Engagement[] = [
  {
    id: 1,
    entityName: "Client Meeting - Acme Corp",
    status: "Completed",
    date: "2026-07-10",
    assignedTo: "John Doe",
    outcome: "Deal Closed",
    notes: "Contract signed for 12 months",
  },
  {
    id: 2,
    entityName: "Product Demo - TechStart",
    status: "Active",
    date: "2026-07-12",
    assignedTo: "Jane Smith",
    outcome: "Pending",
    notes: "Scheduled for next week",
  },
  {
    id: 3,
    entityName: "Follow-up - GlobalTech",
    status: "Pending",
    date: "2026-07-15",
    assignedTo: "Mike Johnson",
    outcome: "Pending",
    notes: "Waiting for budget approval",
  },
  {
    id: 4,
    entityName: "Proposal Review - DataFlow",
    status: "Cancelled",
    date: "2026-07-08",
    assignedTo: "Sarah Wilson",
    outcome: "Lost",
    notes: "Client chose competitor",
  },
];

const statusColors: Record<EngagementStatus, string> = {
  Active: "bg-green-100 text-green-700 border-green-200",
  Pending: "bg-amber-100 text-amber-700 border-amber-200",
  Completed: "bg-blue-100 text-blue-700 border-blue-200",
  Cancelled: "bg-red-100 text-red-700 border-red-200",
};

export function EngagementOverviewClient() {
  const [engagements] = useState<Engagement[]>(initialData);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Engagement Overview</h1>
        <p className="text-sm text-muted-foreground">Track and manage all entity engagements</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Engagements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">S.No</TableHead>
                  <TableHead>Entity Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {engagements.map((engagement, index) => (
                  <TableRow key={engagement.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{engagement.entityName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[engagement.status]}>
                        {engagement.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(engagement.date).toLocaleDateString()}</TableCell>
                    <TableCell>{engagement.assignedTo}</TableCell>
                    <TableCell>{engagement.outcome}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{engagement.notes}</TableCell>
                  </TableRow>
                ))}
                {engagements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No engagements found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
