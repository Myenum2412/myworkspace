"use client";

import { DiaTextReveal } from "@/components/ui/dia-text-reveal";
import { Spinner } from "@/components/ui/spinner";

interface MyWorkspaceLoadingProps {
  /** Fill the viewport (default) or only the available container space. */
  fullScreen?: boolean;
  /** Secondary text shown below the animated wordmark. */
  message?: string;
  /** Animated brand wordmark. Pass an empty string to hide it. */
  text?: string;
  className?: string;
}

export function MyWorkspaceLoading({
  fullScreen = true,
  message,
  text = "My WorkSpace",
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
        {text ? (
          <DiaTextReveal text={text} repeat repeatDelay={1.2} duration={1.5} />
        ) : (
          <Spinner className="size-8" />
        )}
        {message ? <p className="text-sm font-normal text-muted-foreground">{message}</p> : null}
      </div>
    </div>
  );
}

export default MyWorkspaceLoading;
