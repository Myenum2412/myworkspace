"use client";
import * as React from "react";
import { BoldIcon, ItalicIcon, UnderlineIcon, ListIcon, ListOrderedIcon, HighlighterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BlogEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function BlogEditor({ value, onChange, placeholder }: BlogEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const savedRange = React.useRef<Range | null>(null);

  React.useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value && !editorRef.current.innerHTML.trim()) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  React.useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const save = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
        savedRange.current = sel.getRangeAt(0);
      }
    };
    editor.addEventListener("keyup", save);
    editor.addEventListener("mouseup", save);
    return () => {
      editor.removeEventListener("keyup", save);
      editor.removeEventListener("mouseup", save);
    };
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const exec = (cmd: string, arg?: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    if (savedRange.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRange.current);
      }
    }

    editor.focus();
    document.execCommand(cmd, false, arg);
    handleInput();
  };

  const cmd = (command: string, arg?: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    exec(command, arg);
  };

  return (
    <div className="border-2 border-black overflow-hidden bg-background flex flex-col focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 h-full min-h-0">
      <div className="flex items-center gap-1 p-1 border-b border-black bg-muted/50 shrink-0">
        <Button type="button" variant="ghost" size="icon" onMouseDown={cmd('bold')}><BoldIcon className="size-4" /></Button>
        <Button type="button" variant="ghost" size="icon" onMouseDown={cmd('italic')}><ItalicIcon className="size-4" /></Button>
        <Button type="button" variant="ghost" size="icon" onMouseDown={cmd('underline')}><UnderlineIcon className="size-4" /></Button>
        <div className="w-px h-4 bg-border mx-1" />
        <label className="flex items-center justify-center h-8 w-8 rounded-sm hover:bg-muted cursor-pointer relative text-muted-foreground hover:text-foreground transition-colors" title="Highlight Color">
          <HighlighterIcon className="size-4" />
          <input
            type="color"
            defaultValue="#fef08a"
            className="absolute opacity-0 w-full h-full cursor-pointer"
            onChange={(e) => exec('backColor', e.target.value)}
          />
        </label>
        <div className="w-px h-4 bg-border mx-1" />
        <Button type="button" variant="ghost" size="icon" onMouseDown={cmd('insertUnorderedList')}><ListIcon className="size-4" /></Button>
        <Button type="button" variant="ghost" size="icon" onMouseDown={cmd('insertOrderedList')}><ListIcon className="size-4" /></Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="flex-1 min-h-0 p-3 text-sm focus:outline-none prose-sm max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground cursor-text overflow-y-auto"
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
      />
    </div>
  );
}
