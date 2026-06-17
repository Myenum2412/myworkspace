"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"

export function NavMain({
  items,
  label = "Platform",
  className,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
  label?: string
  className?: string
}) {
  const pathname = usePathname()

  const isOpen = useCallback(
    (item: typeof items[number]) => {
      if (!item.items?.length) return false
      if (pathname.startsWith(item.url)) return true
      return item.items.some((sub) => pathname.startsWith(sub.url))
    },
    [pathname]
  )

  return (
    <SidebarGroup className={className}>
      {label && <SidebarGroupLabel className="text-sm font-semibold mb-1">{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) =>
          item.items?.length ? (
              <Collapsible
              key={item.title}
              asChild
              open={isOpen(item)}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton size="lg" tooltip={item.title} className="text-base" asChild>
                    <Link href={item.url}>
                      {item.icon}
                      <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                      <ChevronRightIcon className="ml-auto size-5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                    </Link>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild className="text-sm py-2" data-active={pathname === subItem.url}>
                          <Link href={subItem.url}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton size="lg" tooltip={item.title} className="text-base" asChild>
                <Link href={item.url}>
                  {item.icon}
                  <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
