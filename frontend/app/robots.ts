import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://myworkspace.myenum.in";

  return {
    rules: [
      // ── Google ───────────────────────────────────────────────
      {
        userAgent: "Googlebot",
        allow: "/",
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
      },
      {
        userAgent: "Googlebot-Image",
        allow: "/",
      },
      {
        userAgent: "Googlebot-News",
        allow: "/",
      },
      // ── Bing ─────────────────────────────────────────────────
      {
        userAgent: "Bingbot",
        allow: "/",
      },
      {
        userAgent: "Bingbot-Image",
        allow: "/",
      },
      {
        userAgent: "Bingbot-Video",
        allow: "/",
      },
      {
        userAgent: "Microsoft Bing",
        allow: "/",
      },
      // ── Other Search Engines ──────────────────────────────────
      {
        userAgent: "Applebot",
        allow: "/",
      },
      {
        userAgent: "Amazonbot",
        allow: "/",
      },
      {
        userAgent: "CCBot",
        allow: "/",
      },
      {
        userAgent: "DuckDuckBot",
        allow: "/",
      },
      {
        userAgent: "YandexBot",
        allow: "/",
      },
      {
        userAgent: "facebookexternalhit",
        allow: "/",
      },
      {
        userAgent: "LinkedInBot",
        allow: "/",
      },
      {
        userAgent: "Slackbot",
        allow: "/",
      },
      {
        userAgent: "Slackbot-LinkExpanding",
        allow: "/",
      },
      {
        userAgent: "Twitterbot",
        allow: "/",
      },
      {
        userAgent: "Pinterest",
        allow: "/",
      },
      {
        userAgent: "WhatsApp",
        allow: "/",
      },
      {
        userAgent: "TelegramBot",
        allow: "/",
      },
      // ── Default for all other crawlers ───────────────────────
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
