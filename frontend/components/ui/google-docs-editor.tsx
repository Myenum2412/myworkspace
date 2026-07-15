"use client"

import dynamic from "next/dynamic"
import { useEffect, useState, useCallback } from "react"
import { EditorState, ContentState } from "draft-js"
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css"

const Editor = dynamic(
  () => import("react-draft-wysiwyg").then((m) => m.Editor),
  { ssr: false }
)

interface GoogleDocsEditorProps {
  value: string
  onChange: (value: string) => void
}

export function GoogleDocsEditor({ value, onChange }: GoogleDocsEditorProps) {
  const [editorState, setEditorState] = useState(() =>
    EditorState.createWithContent(ContentState.createFromText(value || ""))
  )
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  useEffect(() => {
    if (!value && !editorState.getCurrentContent().hasText()) return
    const currentText = editorState.getCurrentContent().getPlainText()
    if (value !== currentText) {
      setEditorState(
        EditorState.createWithContent(ContentState.createFromText(value || ""))
      )
    }
  }, [value])

  const onEditorStateChange = useCallback(
    (state: EditorState) => {
      setEditorState(state)
      onChange(state.getCurrentContent().getPlainText())
    },
    [onChange]
  )

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Loading editor...
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <Editor
        editorState={editorState}
        onEditorStateChange={onEditorStateChange}
        toolbarClassName="flex sticky top-0 z-50 justify-center print:hidden border-b bg-white dark:bg-zinc-800 dark:text-zinc-200"
        editorClassName="flex-1 px-4 sm:px-8 py-4 w-full h-full dark:bg-zinc-950 dark:text-zinc-100"
      />
    </div>
  )
}
