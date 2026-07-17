"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"

const COOKIE_CONSENT_KEY = "cookie-consent"

type ConsentValue = "accepted" | "declined" | null

function getStoredConsent(): ConsentValue {
  if (typeof window === "undefined") return null
  return localStorage.getItem(COOKIE_CONSENT_KEY) as ConsentValue
}

function storeConsent(value: ConsentValue) {
  if (typeof window === "undefined") return
  if (value) {
    localStorage.setItem(COOKIE_CONSENT_KEY, value)
  } else {
    localStorage.removeItem(COOKIE_CONSENT_KEY)
  }
}

export default function CookieConsentBlock() {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const consent = getStoredConsent()
    if (!consent) {
      setVisible(true)
    }
  }, [])

  const handleConsent = (value: "accepted" | "declined") => {
    storeConsent(value)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          We use cookies to improve your experience and analyze traffic. Read
          our{" "}
          <a
            href="#"
            className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
          >
            cookie policy
          </a>
          .
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleConsent("declined")}
            className="flex-1 sm:flex-none"
          >
            Decline
          </Button>
          <Button
            onClick={() => handleConsent("accepted")}
            className="flex-1 sm:flex-none"
          >
            Accept all
          </Button>
        </div>
      </div>
    </div>
  )
}
