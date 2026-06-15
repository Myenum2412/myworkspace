import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function AppStorePage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          {/* Empty App Store Page Content */}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
