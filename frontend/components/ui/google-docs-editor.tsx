"use client"

import { useCallback, useRef, useEffect } from "react"

interface GoogleDocsEditorProps {
  value: string
  onChange: (value: string) => void
}

export function GoogleDocsEditor({ value, onChange }: GoogleDocsEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (el) {
      el.style.height = "auto"
      el.style.height = `${el.scrollHeight}px`
    }
  }, [value])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value)
    },
    [onChange]
  )

  return (
    <div className="h-full flex flex-col">
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        placeholder="Write a description..."
        className="flex-1 w-full resize-none border-0 bg-transparent px-4 sm:px-8 py-4 text-base leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0"
      />
    </div>
  )
}
