"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2Icon } from "lucide-react";
import { DeleteOrgDashboardButton } from "@/components/dashboard-actions";

export function DashboardOrgsTable({ orgs }: { orgs: Record<string, unknown>[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (prev.size === orgs.length) return new Set();
      return new Set(orgs.map((o) => o.id as string));
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2Icon className="size-5" />
          Recent Organizations
          {selected.size > 0 && (
            <span className="text-sm font-normal text-muted-foreground ml-auto">
              {selected.size} selected
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selected.size === orgs.length && orgs.length > 0}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">Created</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.map((org) => (
              <TableRow
                key={org.id as string}
                className={selected.has(org.id as string) ? "bg-muted/30" : ""}
              >
                <TableCell>
                  <Checkbox
                    checked={selected.has(org.id as string)}
                    onCheckedChange={() => toggle(org.id as string)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {org.name as string}
                </TableCell>
                <TableCell>{(org.plan as string) || "starter"}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {org.createdAt
                    ? new Date(org.createdAt as string).toLocaleDateString()
                    : "—"}
                </TableCell>
                <TableCell>
                  <DeleteOrgDashboardButton
                    orgId={org.id as string}
                    orgName={org.name as string}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
