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

  // Initialize content on mount and handle external value changes if editor is empty
  React.useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value && !editorRef.current.innerHTML.trim()) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    editorRef.current?.focus();
    handleInput();
  };

  return (
    <div className="border border-input rounded-md overflow-hidden bg-background flex flex-col focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <div className="flex items-center gap-1 p-1 border-b bg-muted/50">
        <Button type="button" variant="ghost" size="icon" onClick={() => executeCommand('bold')}><BoldIcon className="size-4" /></Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => executeCommand('italic')}><ItalicIcon className="size-4" /></Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => executeCommand('underline')}><UnderlineIcon className="size-4" /></Button>
        <div className="w-px h-4 bg-border mx-1" />
        <label className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted cursor-pointer relative text-muted-foreground hover:text-foreground transition-colors" title="Highlight Color">
          <HighlighterIcon className="size-4" />
          <input
            type="color"
            defaultValue="#fef08a"
            className="absolute opacity-0 w-full h-full cursor-pointer"
            onChange={(e) => executeCommand('backColor', e.target.value)}
          />
        </label>
        <div className="w-px h-4 bg-border mx-1" />
        <Button type="button" variant="ghost" size="icon" onClick={() => executeCommand('insertUnorderedList')}><ListIcon className="size-4" /></Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => executeCommand('insertOrderedList')}><ListOrderedIcon className="size-4" /></Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        className="min-h-[150px] p-3 text-sm focus:outline-none prose-sm max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground cursor-text"
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
      />
    </div>
  );
}
