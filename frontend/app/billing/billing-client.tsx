"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import BillingPageOverview from "./page.client"
import BillingServicesPage from "./services/page.client"
import BillingInvoicesPage from "./invoices/page.client"
import ReceiptsPageClient from "./receipts/page.client"
import QuotationsPageClient from "./quotations/page.client"

export default function BillingClient() {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="border-b border-border rounded-b-none justify-start w-full bg-transparent h-auto p-0 gap-1 *:flex-none">
        <TabsTrigger value="overview" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">Overview</TabsTrigger>
        <TabsTrigger value="services" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">Services</TabsTrigger>
        <TabsTrigger value="invoices" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">Invoices</TabsTrigger>
        <TabsTrigger value="quotations" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">Quotations</TabsTrigger>
        <TabsTrigger value="receipts" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">Receipts</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="mt-4"><BillingPageOverview /></TabsContent>
      <TabsContent value="services" className="mt-4"><BillingServicesPage /></TabsContent>
      <TabsContent value="invoices" className="mt-4"><BillingInvoicesPage /></TabsContent>
      <TabsContent value="quotations" className="mt-4"><QuotationsPageClient /></TabsContent>
      <TabsContent value="receipts" className="mt-4"><ReceiptsPageClient /></TabsContent>
    </Tabs>
  )
}
