import Image from "next/image";
import { SidebarHeader } from "@/components/ui/sidebar";

export function SidebarBrand({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <SidebarHeader className="h-20 shrink-0 justify-center border-b bg-sidebar/40">
      <div className="flex items-center gap-2.5 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-border shadow-sm">
          <Image
            src="/logo.jpeg"
            alt="MyWorkSpace Logo"
            width={36}
            height={36}
            className="size-9 object-cover"
          />
        </div>
        <div className="grid min-w-0 group-data-[collapsible=icon]:hidden">
          <span className="truncate text-[15px] font-semibold leading-tight tracking-tight text-sidebar-foreground">
            {title}
          </span>
          {subtitle && (
            <span className="truncate text-xs font-medium leading-tight text-muted-foreground">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </SidebarHeader>
  );
}
