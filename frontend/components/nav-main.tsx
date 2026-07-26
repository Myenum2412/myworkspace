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
  useSidebar,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"
import { useRoutePrefetcher } from "@/components/route-prefetcher"

const navUnderlineStyles = `
  .nav-underline {
    position: relative;
  }
  .nav-underline::after {
    content: '';
    position: absolute;
    bottom: 4px;
    left: 50%;
    transform: translateX(-50%) scaleX(0);
    width: 60%;
    height: 2px;
    background: currentColor;
    border-radius: 1px;
    transition: transform 0.3s ease;
    opacity: 0.7;
  }
  .nav-underline:hover::after,
  .nav-underline[data-active="true"]::after {
    transform: translateX(-50%) scaleX(1);
  }
`

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
  const { setOpenMobile, isMobile } = useSidebar()
  const { prefetchRoute } = useRoutePrefetcher()

  const closeMobile = useCallback(() => {
    if (isMobile) setOpenMobile(false)
  }, [isMobile, setOpenMobile])

  const isOpen = useCallback(
    (item: typeof items[number]) => {
      if (!item.items?.length) return false
      if (pathname.startsWith(item.url)) return true
      return item.items.some((sub) => pathname.startsWith(sub.url))
    },
    [pathname]
  )

  const isActive = useCallback(
    (item: typeof items[number]) => {
      if (pathname === item.url) return true
      if (item.items?.some((sub) => pathname === sub.url)) return true
      return false
    },
    [pathname]
  )

  const handleMouseEnter = useCallback((url: string) => {
    prefetchRoute(url)
  }, [prefetchRoute])

  return (
    <SidebarGroup className={className}>
      <style>{navUnderlineStyles}</style>
      {label && <SidebarGroupLabel className="text-sm font-semibold mb-1">{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => {
          const active = isActive(item)
          return item.items?.length ? (
            <Collapsible
              key={item.title}
              asChild
              open={isOpen(item)}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton size="lg" tooltip={item.title} className="text-base nav-underline relative" asChild data-active={active}>
                    <Link href={item.url} onClick={closeMobile} onMouseEnter={() => handleMouseEnter(item.url)} prefetch={true}>
                      {item.icon}
                      <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                      <ChevronRightIcon className="ml-auto size-5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                    </Link>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => {
                      const subActive = pathname === subItem.url
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild className="text-sm py-2 nav-underline relative" data-active={subActive}>
                            <Link href={subItem.url} onClick={closeMobile} onMouseEnter={() => handleMouseEnter(subItem.url)} prefetch={true}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton size="lg" tooltip={item.title} className="text-base nav-underline relative" asChild data-active={active}>
                <Link href={item.url} onClick={closeMobile} onMouseEnter={() => handleMouseEnter(item.url)} prefetch={true}>
                  {item.icon}
                  <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
