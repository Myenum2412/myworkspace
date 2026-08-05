"use client"
import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, EyeIcon } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AttendanceViewDialog } from "./attendance-view-dialog";

type AttendanceRecord = {
  name: string;
  displayId: string;
  email: string;
  department: string;
  designation: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
};

type AttendanceTableProps = {
  data: AttendanceRecord[];
};

const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

export function AttendanceTable({ data }: AttendanceTableProps) {
  const [viewRecord, setViewRecord] = useState<AttendanceRecord | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(30);

  const paginated = useMemo(() => {
    const start = page * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  const allSelected = paginated.length > 0 && paginated.every((_, i) => selectedRows.has(i));
  const someSelected = paginated.some((_, i) => selectedRows.has(i));

  const handlePageSizeChange = useCallback((value: string) => {
    setPageSize(Number(value));
    setPage(0);
  }, []);

  function toggleAllRows() {
    if (allSelected) {
      setSelectedRows(new Set());
    } else {
      const indices = paginated.map((_, i) => i);
      setSelectedRows(new Set(indices));
    }
  }

  function toggleRow(index: number) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="table-premium w-full text-sm text-left">
              <thead>
                <tr>
                  <th className="px-4 py-3.5 whitespace-nowrap">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAllRows}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Employee</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">ID</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Email</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Department</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Designation</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Check In</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Check Out</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Remarks</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left w-10"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((t, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white cursor-pointer" onClick={() => setViewRecord(t)}>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedRows.has(i)}
                        onCheckedChange={() => toggleRow(i)}
                        aria-label={`Select ${t.name}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback>{getInitials(t.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-500">{t.displayId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-700">{t.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      {t.department !== "\u2014" ? (
                        <span className="inline-flex items-center rounded-sm bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium">
                          {t.department}
                        </span>
                      ) : (
                        <span className="text-gray-300">\u2014</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-800">{t.designation}</span>
                    </td>
                    <td className="px-4 py-3">{t.checkIn || "\u2014"}</td>
                    <td className="px-4 py-3">{t.checkOut || "\u2014"}</td>
                    <td className="px-4 py-3">
                      <span className="text-gray-500 italic text-xs">\u2014</span>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="" onClick={(e) => { e.stopPropagation(); setViewRecord(t); }} title="View">
                        <EyeIcon className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border border-gray-200 rounded-lg mt-2">
            <span className="text-sm text-muted-foreground">
              {data.length === 0
                ? "0 items"
                : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, data.length)} of ${data.length}`}
            </span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
                <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="60">60</SelectItem>
                    <SelectItem value="90">90</SelectItem>
                    <SelectItem value="120">120</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * pageSize >= data.length}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
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
