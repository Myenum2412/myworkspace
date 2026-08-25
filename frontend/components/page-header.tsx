import type * as React from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  search?: React.ReactNode;
  className?: string;
};

export function PageHeader({ icon, title, subtitle, actions, search, className }: PageHeaderProps) {
  return (
    <div className={cn("rounded-lg border bg-white shadow-sm p-4 sm:p-5", className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-3 min-w-0 md:flex-1">
          {icon ? (
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p> : null}
          </div>
        </div>
        {search ? <div className="w-full md:w-72 md:mx-auto md:flex-none">{search}</div> : null}
        {actions ? (
          <div className="flex items-center gap-2 md:gap-3 flex-wrap md:flex-1 md:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
