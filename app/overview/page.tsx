import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function OverviewPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <h1 className="text-2xl font-bold">Task Overview</h1>
          {/* Empty Overview Page Content */}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
