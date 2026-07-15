"use client"

import * as React from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

interface TextEffectProps {
  children: React.ReactNode
  className?: string
  preset?: "fade-in-blur" | "slide-up" | "scale-up"
  per?: "char" | "word" | "line"
  delay?: number
  speedSegment?: number
  as?: React.ElementType
}

export function TextEffect({
  children,
  className,
  preset = "fade-in-blur",
  per = "char",
  delay = 0,
  speedSegment = 0.3,
  as: Component = "div",
}: TextEffectProps) {
  const text = typeof children === "string" ? children : ""

  const getAnimation = () => {
    switch (preset) {
      case "fade-in-blur":
        return {
          hidden: { opacity: 0, filter: "blur(12px)", y: 12 },
          visible: {
            opacity: 1,
            filter: "blur(0px)",
            y: 0,
            transition: { type: "spring" as const, bounce: 0.3, duration: 1.5 },
          },
        }
      case "slide-up":
        return {
          hidden: { opacity: 0, y: 20 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { type: "spring" as const, bounce: 0.3, duration: 1.5 },
          },
        }
      case "scale-up":
        return {
          hidden: { opacity: 0, scale: 0.9 },
          visible: {
            opacity: 1,
            scale: 1,
            transition: { type: "spring" as const, bounce: 0.3, duration: 1.5 },
          },
        }
      default:
        return {
          hidden: { opacity: 0 },
          visible: { opacity: 1 },
        }
    }
  }

  const splitText = (str: string) => {
    if (per === "char") return str.split("")
    if (per === "word") return str.split(" ")
    return [str]
  }

  const segments = splitText(text)
  const animation = getAnimation()

  return (
    <Component className={cn("inline", className)}>
      {segments.map((segment, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial="hidden"
          animate="visible"
          variants={animation}
          transition={{
            delay: delay + i * speedSegment,
          }}
        >
          {segment}
          {per === "word" && i < segments.length - 1 && "\u00A0"}
        </motion.span>
      ))}
    </Component>
  )
}
