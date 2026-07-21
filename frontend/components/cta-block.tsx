import type { ReactNode } from "react"
import { RiArrowRightLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"

interface CtaBlockProps {
  heading: string
  description: string
  buttonText: string
  buttonHref?: string
  children?: ReactNode
}

export default function CtaBlock({
  heading,
  description,
  buttonText,
  buttonHref = "#",
  children,
}: CtaBlockProps) {
  return (
    <section className="flex w-full items-center justify-center bg-muted/30 px-6 py-12 text-foreground">
      <div className="w-full rounded-xl bg-gradient-to-br from-muted/80 to-muted px-8 py-10 sm:px-14 sm:py-14">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {heading}
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              {description}
            </p>
            {children && (
              <div className="mt-1 flex flex-wrap gap-2">
                {children}
              </div>
            )}
          </div>
          <div className="shrink-0">
            <Button
              asChild
              variant="default"
              className="w-full sm:w-auto"
            >
              <a href={buttonHref}>
                {buttonText}
                <RiArrowRightLine data-icon="inline-end" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
