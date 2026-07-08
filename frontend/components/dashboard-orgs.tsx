"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";

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
        <div className="border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="table w-full text-sm text-left">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#f3f4f6] text-gray-900 border-b">
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap w-10">
                  <Checkbox
                    checked={selected.size === orgs.length && orgs.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Name</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Plan</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-right">Created</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orgs.map((org) => (
                <tr
                  key={org.id as string}
                  className={`bg-white group hover:bg-slate-50 transition-colors ${selected.has(org.id as string) ? "bg-muted/30" : ""}`}
                >
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selected.has(org.id as string)}
                      onCheckedChange={() => toggle(org.id as string)}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {org.name as string}
                  </td>
                  <td className="px-4 py-3">{(org.plan as string) || "free"}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {org.createdAt
                      ? new Date(org.createdAt as string).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <DeleteOrgDashboardButton
                      orgId={org.id as string}
                      orgName={org.name as string}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
