"use client"
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EyeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AttendanceViewDialog } from "./attendance-view-dialog";

type AttendanceRecord = {
  name: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
};

type AttendanceTableProps = {
  data: AttendanceRecord[];
};

const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const statusStyles: Record<string, string> = {
  present: "bg-red-100 text-red-700 border-red-300",
  absent: "bg-gray-100 text-gray-700 border-gray-300",
  late: "bg-orange-100 text-orange-700 border-orange-300",
};

export function AttendanceTable({ data }: AttendanceTableProps) {
  const [viewRecord, setViewRecord] = useState<AttendanceRecord | null>(null);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-gray-200 bg-white shadow-sm overflow-hidden rounded-lg">
            <table className="table-premium w-full text-sm text-left">
              <thead>
                <tr className="bg-[#f3f4f6]">
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Staff</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Check In</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Check Out</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Status</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left w-10"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((t, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white cursor-pointer" onClick={() => setViewRecord(t)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback>{getInitials(t.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{t.checkIn || "\u2014"}</td>
                    <td className="px-4 py-3">{t.checkOut || "\u2014"}</td>
                    <td className="px-4 py-3">
                      <Badge className={statusStyles[t.status] || ""}>{t.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="size-8" onClick={(e) => { e.stopPropagation(); setViewRecord(t); }} title="View">
                        <EyeIcon className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AttendanceViewDialog
        record={viewRecord}
        open={!!viewRecord}
        onOpenChange={(open) => { if (!open) setViewRecord(null); }}
      />
    </>
  );
}
