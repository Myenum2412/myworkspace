"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AiCodeBlock } from "./ai-code-block";

interface AiMarkdownRendererProps {
  content: string;
}

export function AiMarkdownRenderer({ content }: AiMarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const code = String(children).replace(/\n$/, "");
          if (match) {
            return <AiCodeBlock code={code} language={match[1]} />;
          }
          return (
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
              {children}
            </code>
          );
        },
        pre({ children }) {
          return <div className="my-2">{children}</div>;
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full border-collapse border border-border text-sm">
                {children}
              </table>
            </div>
          );
        },
        th({ children }) {
          return <th className="border border-border bg-muted px-3 py-2 text-left font-medium">{children}</th>;
        },
        td({ children }) {
          return <td className="border border-border px-3 py-2">{children}</td>;
        },
        a({ href, children }) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
              {children}
            </a>
          );
        },
        ul({ children }) {
          return <ul className="list-disc pl-6 my-1 space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal pl-6 my-1 space-y-1">{children}</ol>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground my-2">
              {children}
            </blockquote>
          );
        },
        h1({ children }) { return <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>; },
        h2({ children }) { return <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>; },
        h3({ children }) { return <h3 className="text-base font-semibold mt-2 mb-1">{children}</h3>; },
        p({ children }) { return <p className="my-1 leading-relaxed">{children}</p>; },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
