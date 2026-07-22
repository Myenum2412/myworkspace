"use client"
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Building2, Users, EyeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DepartmentViewDialog } from "./department-view-dialog";

type Department = {
  name: string;
  head: string;
  headAvatar: string;
  memberCount: number;
  openPositions: number;
  budget: string;
  color: string;
};

type DepartmentsClientProps = {
  departments: Department[];
  totalMembers: number;
  totalOpen: number;
};

const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

export function DepartmentsClient({ departments, totalMembers, totalOpen }: DepartmentsClientProps) {
  const [viewDept, setViewDept] = useState<Department | null>(null);

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Departments</h1>
            <p className="text-sm text-muted-foreground mt-1">{departments.length} departments &middot; {totalMembers} members</p>
          </div>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {totalOpen} open positions
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {departments.map((dept) => (
            <Card key={dept.name} className="relative group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-sm ${dept.color} text-black`}>
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{dept.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{dept.budget} budget</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="size-4" />
                    {dept.memberCount} members
                  </div>
                  {dept.openPositions > 0 && (
                    <Badge variant="outline">{dept.openPositions} open</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 text-sm border-t pt-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-6">
                      <AvatarImage src={dept.headAvatar} alt={dept.head} />
                      <AvatarFallback className="text-[10px]">{getInitials(dept.head)}</AvatarFallback>
                    </Avatar>
                    <span className="text-muted-foreground">Head: <span className="font-medium text-foreground">{dept.head}</span></span>
                  </div>
                  <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setViewDept(dept)} title="View">
                    <EyeIcon className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <DepartmentViewDialog
        department={viewDept}
        open={!!viewDept}
        onOpenChange={(open) => { if (!open) setViewDept(null); }}
      />
    </>
  );
}
