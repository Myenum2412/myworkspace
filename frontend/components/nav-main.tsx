"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback } from "react";
import { useRoutePrefetcher } from "@/components/route-prefetcher";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
} from "@/components/ui/sidebar";
import { ChevronRightIcon } from "@/lib/icons";

export function NavMain({
  items,
  label = "Platform",
  className,
}: {
  items: {
    title: string;
    url: string;
    icon?: React.ReactNode;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
  label?: string;
  className?: string;
}) {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();
  const { prefetchRoute } = useRoutePrefetcher();

  const closeMobile = useCallback(() => {
    if (isMobile) setOpenMobile(false);
  }, [isMobile, setOpenMobile]);

  const isOpen = useCallback(
    (item: (typeof items)[number]) => {
      if (!item.items?.length) return false;
      if (pathname.startsWith(item.url)) return true;
      return item.items.some((sub) => pathname.startsWith(sub.url));
    },
    [pathname],
  );

  const isActive = useCallback(
    (item: (typeof items)[number]) => {
      if (pathname === item.url) return true;
      if (item.items?.some((sub) => pathname === sub.url)) return true;
      return false;
    },
    [pathname],
  );

  const handleMouseEnter = useCallback(
    (url: string) => {
      prefetchRoute(url);
    },
    [prefetchRoute],
  );

  return (
    <SidebarGroup className={className}>
      {label && (
        <SidebarGroupLabel className="mb-0.5 px-3 text-[11px] font-semibold uppercase tracking-wider">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarMenu>
        {items.map((item) => {
          const active = isActive(item);
          return item.items?.length ? (
            <Collapsible key={item.title} asChild open={isOpen(item)} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    tooltip={item.title}
                    className="h-11 rounded-lg text-[13.5px] font-medium"
                    asChild
                    data-active={active}
                  >
                    <Link
                      href={item.url}
                      onClick={closeMobile}
                      onMouseEnter={() => handleMouseEnter(item.url)}
                      prefetch={true}
                    >
                      {item.icon}
                      <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                      <ChevronRightIcon className="ml-auto size-4 opacity-60 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                    </Link>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => {
                      const subActive = pathname === subItem.url;
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            className="h-8 rounded-md py-1.5 text-[13px]"
                            data-active={subActive}
                          >
                            <Link
                              href={subItem.url}
                              onClick={closeMobile}
                              onMouseEnter={() => handleMouseEnter(subItem.url)}
                              prefetch={true}
                            >
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                size="lg"
                tooltip={item.title}
                className="h-11 rounded-lg text-[13.5px] font-medium"
                asChild
                data-active={active}
              >
                <Link
                  href={item.url}
                  onClick={closeMobile}
                  onMouseEnter={() => handleMouseEnter(item.url)}
                  prefetch={true}
                >
                  {item.icon}
                  <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
