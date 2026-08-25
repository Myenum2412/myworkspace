export function useAnalytics(eventName?: string) {
  const trackEvent = (action: string, data?: any) => {
    console.log(`[Analytics] ${eventName || "Event"} - ${action}`, data);
  };

  return { trackEvent };
}
