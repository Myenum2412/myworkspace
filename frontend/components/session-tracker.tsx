"use client";

import { useSessionTracker } from "@/hooks/use-session-tracker";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Clock, Play, Coffee } from "lucide-react";

export function SessionTracker() {
  const {
    activeSession,
    todaySummary,
    isLoading,
    elapsed,
    breakElapsed,
    startBreak,
    endBreak,
    formatDuration,
    isOnBreak,
  } = useSessionTracker();

  if (isLoading || !activeSession) {
    return null;
  }

  const activeMinutes = Math.floor(elapsed / 60000);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-1.5 h-8 ${isOnBreak ? "border-blue-300 text-black" : "border-blue-300 text-black"}`}
        >
          <Clock className={`size-3.5 ${isOnBreak ? "animate-pulse" : ""}`} />
          <span className="font-mono text-xs">{formatDuration(elapsed)}</span>
          {isOnBreak && (
            <span className="text-[10px] text-black font-medium">BREAK</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Session Tracker
        </DropdownMenuLabel>

        <div className="px-2 py-1.5 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Active Time</span>
            <span className="font-mono font-medium">{formatDuration(elapsed)}</span>
          </div>
          {breakElapsed > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Break Time</span>
              <span className="font-mono font-medium text-black">
                {formatDuration(breakElapsed)}
              </span>
            </div>
          )}
          {todaySummary && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Today Active</span>
                <span className="font-mono font-medium">
                  {formatDuration(todaySummary.totalActiveTime)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Today Breaks</span>
                <span className="font-mono font-medium text-black">
                  {formatDuration(todaySummary.totalBreakTime)}
                </span>
              </div>
            </>
          )}
        </div>

        <DropdownMenuSeparator />

        <div className="p-1">
          {isOnBreak ? (
            <Button
              variant="default"
              size="sm"
              className="w-full gap-2"
              onClick={endBreak}
            >
              <Play className="size-4" />
              Resume Work
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 border-blue-300 text-black hover:bg-gray-800"
              onClick={startBreak}
            >
              <Coffee className="size-4" />
              Take Break
            </Button>
          )}
        </div>

        {activeMinutes > 0 && (
          <div className="px-2 pb-2">
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all"
                style={{
                  width: `${Math.min((activeMinutes / 480) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-center">
              {activeMinutes} min of 8h target
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
