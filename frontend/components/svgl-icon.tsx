"use client";
import { useEffect, useState } from "react";

const SVGL_MAP: Record<string, string> = {
  notion: "https://svgl.app/library/notion.svg",
  linear: "https://svgl.app/library/linear.svg",
  slack: "https://svgl.app/library/slack.svg",
  asana: "https://svgl.app/library/asana.svg",
  trello: "https://svgl.app/library/trello.svg",
  clickup: "https://svgl.app/library/clickup.svg",
  google_drive: "https://svgl.app/library/google-drive.svg",
  stripe: "https://svgl.app/library/stripe.svg",
  figma: "https://svgl.app/library/figma.svg",
  vercel: "https://svgl.app/library/vercel.svg",
  github: "https://svgl.app/library/github-dark.svg",
  jira: "https://svgl.app/library/jira.svg",
  monday: "https://svgl.app/library/monday.svg",
};

export function SvglIcon({
  name,
  className = "size-6",
  alt,
}: {
  name: keyof typeof SVGL_MAP;
  className?: string;
  alt?: string;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    const url = SVGL_MAP[name];
    if (!url) return;
    fetch(url)
      .then((r) => r.text())
      .then((t) => setSvg(t))
      .catch(() => {});
  }, [name]);
  if (!svg)
    return (
      <span
        className={`${className} inline-block bg-muted animate-pulse rounded`}
        aria-hidden="true"
      />
    );
  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: SVGL SVGs are trusted static assets from svgl.app
    <span
      className={`${className} inline-flex items-center justify-center [&>svg]:size-full [&>svg]:object-contain`}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted
      dangerouslySetInnerHTML={{ __html: svg }}
      role="img"
      aria-label={alt || name}
    />
  );
}

export { SVGL_MAP };
