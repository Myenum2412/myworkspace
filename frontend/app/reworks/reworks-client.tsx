"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusIcon, RotateCcwIcon } from "lucide-react";

type ReworkItem = {
  id: number;
  description: string;
  selectedFiles: string;
  remarks: string;
  status: "Completed" | "InCompleted";
};

const initialData: ReworkItem[] = [
  { id: 1, description: "Update dashboard UI colors", selectedFiles: "dashboard.tsx, theme.css", remarks: "Need client approval", status: "InCompleted" },
  { id: 2, description: "Fix login redirect issue", selectedFiles: "auth.ts", remarks: "Verified by QA", status: "Completed" },
  { id: 3, description: "Add pagination to reports", selectedFiles: "reports-table.tsx", remarks: "", status: "InCompleted" },
];

export default function ReworksClient() {
  const [items, setItems] = useState<ReworkItem[]>(initialData);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  function toggleSelect(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleSelectAll() {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  }

  function updateStatus(id: number, status: "Completed" | "InCompleted") {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status } : i))
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCcwIcon className="size-6" />
          <h1 className="text-2xl font-bold">Reworks</h1>
        </div>
        <Button size="sm">
          <PlusIcon className="size-4 mr-1" />
          Add Rework
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Reworks List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selected.size === items.length && items.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-16">S.No</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Selected Files</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="w-40">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No reworks found
                  </TableCell>
                </TableRow>
              )}
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{item.id}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.selectedFiles}
                  </TableCell>
                  <TableCell className="text-sm">{item.remarks || "—"}</TableCell>
                  <TableCell>
                    <Select
                      value={item.status}
                      onValueChange={(val) =>
                        updateStatus(item.id, val as "Completed" | "InCompleted")
                      }
                    >
                      <SelectTrigger className="h-8 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Completed">
                          <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-100">
                            Completed
                          </Badge>
                        </SelectItem>
                        <SelectItem value="InCompleted">
                          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-100">
                            InCompleted
                          </Badge>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
