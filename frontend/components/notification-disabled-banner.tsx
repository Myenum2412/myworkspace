"use client";

import { useState, useEffect } from "react";
import { BellOffIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationDisabledBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "denied" && !dismissed) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [dismissed]);

  if (!show) return null;

  return (
    <div className="flex items-start gap-3 rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <BellOffIcon className="mt-0.5 size-4 shrink-0 text-amber-500" />
      <div className="flex-1">
        <p className="font-medium">Notifications are disabled</p>
        <p className="mt-0.5 text-amber-700">
          You&apos;re missing important updates. To enable notifications, go to your
          browser or device settings and allow notifications for this site.
        </p>
        <div className="mt-2 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if ("Notification" in window && Notification.permission === "denied") {
                window.open(
                  /Chrome|Edge/i.test(navigator.userAgent)
                    ? "chrome://settings/content/notifications"
                    : /Firefox/i.test(navigator.userAgent)
                      ? "about:preferences#privacy"
                      : "/settings/notifications",
                  "_blank"
                );
              }
            }}
          >
            Open Settings
          </Button>
        </div>
      </div>
      <button
        onClick={() => {
          setShow(false);
          setDismissed(true);
        }}
        className="shrink-0 text-amber-400 hover:text-amber-600"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}
