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
      // ── AI Crawlers ──────────────────────────────────────────
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
      },
      {
        userAgent: "GPTBot",
        allow: "/",
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
      },
      {
        userAgent: "Claude-Web",
        allow: "/",
      },
      {
        userAgent: "anthropic-ai",
        allow: "/",
      },
      {
        userAgent: "Bytespider",
        allow: "/",
      },
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
      // ── Other AI Search Engines ──────────────────────────────
      {
        userAgent: "YouBot",
        allow: "/",
      },
      {
        userAgent: "Timpibot",
        allow: "/",
      },
      {
        userAgent: "PetalseBot",
        allow: "/",
      },
      {
        userAgent: "Brightbot",
        allow: "/",
      },
      {
        userAgent: "AI2Bot",
        allow: "/",
      },
      {
        userAgent: "AI2Bot-Dolma",
        allow: "/",
      },
      {
        userAgent: "FriendlyCrawler",
        allow: "/",
      },
      {
        userAgent: "DataForSeoBot",
        allow: "/",
      },
      {
        userAgent: "NaverBot",
        allow: "/",
      },
      {
        userAgent: "Daum",
        allow: "/",
      },
      {
        userAgent: "Sogou",
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
