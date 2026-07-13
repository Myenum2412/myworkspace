"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";

interface ActiveSession {
  sessionId: string;
  loginTime: string;
  currentStatus: "online" | "break" | "offline";
  totalBreakDuration: number;
  statusTransitions: Array<{ status: string; timestamp: string }>;
}

interface TodaySummary {
  totalSessions: number;
  completedSessions: number;
  totalActiveTime: number;
  totalBreakTime: number;
}

export function useSessionTracker() {
  const { data: session } = useSession();
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [breakElapsed, setBreakElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breakIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeSessionRef = useRef<ActiveSession | null>(null);

  const fetchActiveSession = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions/active", { credentials: "include" });
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data) {
        setActiveSession(prev => {
          if (prev?.sessionId === json.data.sessionId && prev?.currentStatus === json.data.currentStatus) return prev;
          return json.data;
        });
        if (json.data.currentStatus === "online") {
          const loginMs = new Date(json.data.loginTime).getTime();
          setElapsed(Date.now() - loginMs - json.data.totalBreakDuration);
        } else if (json.data.currentStatus === "break") {
          const lastBreak = json.data.statusTransitions.filter(
            (t: any) => t.status === "break"
          ).pop();
          if (lastBreak) {
            setBreakElapsed(Date.now() - new Date(lastBreak.timestamp).getTime());
          }
        }
      } else {
        setActiveSession(null);
      }
    } catch {
      setActiveSession(null);
    }
  }, []);

  const fetchTodaySummary = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions/today", { credentials: "include" });
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data) {
        setTodaySummary(json.data.summary);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchActiveSession(), fetchTodaySummary()]);
      if (!cancelled) setIsLoading(false);
    };
    init();

    const pollInterval = setInterval(() => {
      fetchActiveSession();
      fetchTodaySummary();
    }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
    };
  }, [session?.user?.id, fetchActiveSession, fetchTodaySummary]);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    if (activeSession?.currentStatus === "online") {
      const loginMs = new Date(activeSession.loginTime).getTime();
      const calc = () => Date.now() - loginMs - activeSession.totalBreakDuration;
      setElapsed(calc());
      intervalRef.current = setInterval(() => setElapsed(calc()), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeSession?.currentStatus, activeSession?.loginTime, activeSession?.totalBreakDuration]);

  useEffect(() => {
    if (activeSession?.currentStatus === "break") {
      breakIntervalRef.current = setInterval(() => {
        setBreakElapsed((prev) => prev + 1000);
      }, 1000);
    } else {
      if (breakIntervalRef.current) clearInterval(breakIntervalRef.current);
    }
    return () => {
      if (breakIntervalRef.current) clearInterval(breakIntervalRef.current);
    };
  }, [activeSession?.currentStatus]);

  const startBreak = useCallback(async () => {
    const s = activeSessionRef.current;
    if (!s) return;
    try {
      await fetch(`/api/sessions/${s.sessionId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "break" }),
        credentials: "include",
      });
      await fetchActiveSession();
    } catch (err) {
      console.error("Failed to start break:", err);
    }
  }, [fetchActiveSession]);

  const endBreak = useCallback(async () => {
    const s = activeSessionRef.current;
    if (!s) return;
    try {
      await fetch(`/api/sessions/${s.sessionId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "online" }),
        credentials: "include",
      });
      await fetchActiveSession();
    } catch (err) {
      console.error("Failed to end break:", err);
    }
  }, [fetchActiveSession]);

  const formatDuration = useCallback((ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, []);

  return {
    activeSession,
    todaySummary,
    isLoading,
    elapsed,
    breakElapsed,
    startBreak,
    endBreak,
    formatDuration,
    isOnBreak: activeSession?.currentStatus === "break",
    isOnline: activeSession?.currentStatus === "online",
    refresh: fetchActiveSession,
  };
}
