"use client";

import { DiaTextReveal } from "@/components/ui/dia-text-reveal";

interface MyWorkspaceLoadingProps {
  /** Fill the viewport (default) or only the available container space. */
  fullScreen?: boolean;
  /** Secondary text shown below the animated wordmark. */
  message?: string;
  className?: string;
}

export function MyWorkspaceLoading({
  fullScreen = true,
  message,
  className,
}: MyWorkspaceLoadingProps) {
  return (
    <div
      id="workspace-loading-screen"
      data-workspace-loading="true"
      className={
        fullScreen
          ? "flex min-h-screen items-center justify-center bg-background text-foreground"
          : `flex items-center justify-center bg-background text-foreground ${className ?? ""}`
      }
    >
      <div className="flex flex-col items-center gap-3 text-3xl font-semibold tracking-tight md:text-4xl">
        <DiaTextReveal text="My WorkSpace" repeat repeatDelay={1.2} duration={1.5} />
        {message ? <p className="text-sm font-normal text-muted-foreground">{message}</p> : null}
      </div>
    </div>
  );
}

export default MyWorkspaceLoading;
