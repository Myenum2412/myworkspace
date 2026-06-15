"use client";

import { useEffect, useCallback, useState } from "react";
import { getWsClient, WsConnectionState } from "@/lib/ws/client";

export function useWebSocket(userId?: string, orgId?: string) {
  const [state, setState] = useState<WsConnectionState>("disconnected");

  useEffect(() => {
    if (!userId || !orgId) return;
    const client = getWsClient();
    client.onStateChange(setState);
    client.connect(userId, orgId);
    return () => { client.disconnect(); };
  }, [userId, orgId]);

  const subscribe = useCallback((channels: string[]) => {
    getWsClient().subscribe(channels);
  }, []);

  const unsubscribe = useCallback((channels: string[]) => {
    getWsClient().unsubscribe(channels);
  }, []);

  return { state, subscribe, unsubscribe, client: getWsClient() };
}
