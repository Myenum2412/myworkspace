"use client";

import { useFileSystemStore } from "@/lib/file-system/store";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { FolderIcon, HomeIcon } from "lucide-react";

export function BreadcrumbNav() {
  const { breadcrumbs, setCurrentFolder, setBreadcrumbs } = useFileSystemStore();

  function navigateTo(index: number) {
    const target = breadcrumbs[index];
    setCurrentFolder(target.id);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            className="cursor-pointer flex items-center gap-1"
            onClick={() => {
              setCurrentFolder(null);
              setBreadcrumbs([{ id: null, name: "My Files" }]);
            }}
          >
            <FolderIcon className="size-3.5" />
            <span>My Files</span>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {breadcrumbs.slice(1).map((crumb, i) => (
          <BreadcrumbItem key={crumb.id || i}>
            <BreadcrumbSeparator />
            {i === breadcrumbs.length - 2 ? (
              <BreadcrumbPage className="font-medium">{crumb.name}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink className="cursor-pointer" onClick={() => navigateTo(i + 1)}>
                {crumb.name}
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
