"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CopyIcon,
  CheckIcon,
  DownloadIcon,
  WrapTextIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFileExtension } from "@/lib/file-system/types";

const extToLang: Record<string, string> = {
  js: "javascript", ts: "typescript", jsx: "javascript", tsx: "typescript",
  py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
  c: "c", cpp: "cpp", h: "c", cs: "csharp",
  php: "php", swift: "swift", kt: "kotlin", scala: "scala",
  html: "html", css: "css", scss: "scss", less: "less",
  json: "json", xml: "xml", yaml: "yaml", yml: "yaml",
  md: "markdown", sql: "sql", sh: "bash", bash: "bash",
  bat: "batch", ps1: "powershell",
  txt: "text", log: "text", cfg: "ini", ini: "ini", env: "env",
  dockerfile: "dockerfile", toml: "toml",
};

function detectLanguage(filename: string): string {
  if (filename.toLowerCase() === "dockerfile") return "dockerfile";
  if (filename.toLowerCase() === "makefile") return "makefile";
  const ext = getFileExtension(filename);
  return extToLang[ext] || "text";
}

interface CodeViewerProps {
  src: string;
  fileName: string;
}

export function CodeViewer({ src, fileName }: CodeViewerProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [currentMatch, setCurrentMatch] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(src, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load file");
        return r.text();
      })
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [src]);

  useEffect(() => {
    if (!search) {
      setSearchMatches([]);
      setCurrentMatch(0);
      return;
    }
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches: number[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push(match.index);
    }
    setSearchMatches(matches);
    setCurrentMatch(0);
  }, [search, content]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [content]);

  const lines = content.split("\n");
  const lang = detectLanguage(fileName);

  const highlightLine = (line: string): React.ReactNode => {
    if (!search) return line;
    if (!searchMatches.length) return line;

    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = line.split(regex);
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} className="bg-yellow-300/40 dark:bg-yellow-500/30 rounded px-0.5">{part}</mark>
        : part,
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8">
        <p className="text-sm">Failed to load file preview</p>
        <Button variant="outline" size="sm" onClick={() => window.open(src, "_blank")}>
          <DownloadIcon className="size-3.5 mr-1.5" /> Download to view
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0 gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{lang}</span>
          <span className="text-xs text-muted-foreground">{lines.length} lines</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowSearch(!showSearch)}>
            <SearchIcon className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setWordWrap(!wordWrap)}>
            <WrapTextIcon className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleCopy}>
            {copied ? <CheckIcon className="size-3.5 text-green-500" /> : <CopyIcon className="size-3.5" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(src, "_blank")}>
            <DownloadIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      {showSearch && (
        <div className="px-4 py-2 border-b shrink-0 flex items-center gap-2">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm flex-1"
            autoFocus
          />
          {searchMatches.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {currentMatch + 1} / {searchMatches.length}
            </span>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowSearch(false)}>
            <XIcon className="size-3.5" />
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm font-mono">
          <tbody>
            {lines.map((line, i) => (
              <tr
                key={i}
                className={`hover:bg-accent/30 ${
                  searchMatches.length > 0 &&
                  searchMatches.some((m) => {
                    const lineStart = content.split("\n").slice(0, i).join("\n").length + (i > 0 ? 1 : 0);
                    return m >= lineStart && m < lineStart + line.length + 1;
                  })
                    ? "bg-yellow-300/10"
                    : ""
                }`}
              >
                <td className="px-3 py-0 text-right text-muted-foreground/50 select-none w-12 border-r border-border align-top">
                  <span className="text-[11px] leading-5">{i + 1}</span>
                </td>
                <td className={`px-4 py-0 leading-5 ${wordWrap ? "whitespace-pre-wrap" : "whitespace-pre"}`}>
                  {highlightLine(line) || " "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
