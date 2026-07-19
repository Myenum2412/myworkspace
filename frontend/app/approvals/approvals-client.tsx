"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ApprovalsInteractive from "./approvals-interactive.client"
import Approved from "./approved/approved.client"
import Rejected from "./rejected/rejected.client"
import type { ApprovalItem } from "./columns"

type Props = {
  pendingItems: ApprovalItem[]
  approvedItems: ApprovalItem[]
  rejectedItems: ApprovalItem[]
}

export default function ApprovalsClient({ pendingItems, approvedItems, rejectedItems }: Props) {
  return (
    <Tabs defaultValue="pending" className="w-full">
      <TabsList className="border-b border-border rounded-b-none justify-start w-full bg-transparent h-auto p-0 gap-1 max-h-10! *:flex-none">
        <TabsTrigger value="pending" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">Pending</TabsTrigger>
        <TabsTrigger value="approved" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">Approved</TabsTrigger>
        <TabsTrigger value="rejected" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">Rejected</TabsTrigger>
      </TabsList>
      <TabsContent value="pending" className="mt-4">
        <ApprovalsInteractive initialItems={pendingItems} />
      </TabsContent>
      <TabsContent value="approved" className="mt-4">
        <Approved initialItems={approvedItems} />
      </TabsContent>
      <TabsContent value="rejected" className="mt-4">
        <Rejected initialItems={rejectedItems} />
      </TabsContent>
    </Tabs>
  )
}
