import type { Metadata, Viewport } from "next";
import { Inter, Roboto } from "next/font/google";
import { Toaster } from "sonner";
import { AppLayout } from "@/components/app-layout";
import { ContextMenuProvider } from "@/components/context-menu-provider";
import CookieConsentBlock from "@/components/cookie-consent-block";
import { CsrfInterceptor } from "@/components/csrf-interceptor";
import { GlobalLoader } from "@/components/global-loader";
import { NotificationInitializer } from "@/components/notification-initializer";
import { OfflineBanner } from "@/components/offline-banner";
import { OfflineSyncManager } from "@/components/offline-sync-manager";
import { PerformanceMonitor } from "@/components/performance-monitor";
import { Providers } from "@/components/providers";
import { auth } from "@/lib/auth/config";
import {
  organizationJsonLd,
  siteConfig,
  softwareApplicationJsonLd,
  webSiteJsonLd,
} from "@/lib/seo/seo-config";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
  preload: true,
});

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "MyWorkSpace | Rebar Detailing Platform",
    template: "%s | MyWorkSpace",
  },
  description:
    "MyWorkSpace — workspace management platform featuring rebar detailing, project management, team collaboration, and business automation. Transform your construction and engineering workflows.",
  keywords: [
    // Core
    "workspace management",
    "SaaS platform",
    "project management",
    "team collaboration",
    "task management",
    "employee management",
    "business management",
    "cloud workspace",
    "productivity software",
    "enterprise software",
    "CRM",
    "HR management",
    "organization management",
    "business automation",
    // Rebar Detailing
    "rebar detailing",
    "reinforcement detailing",
    "rebar shop drawings",
    "rebar fabrication",
    "concrete reinforcement",
    "rebar placement drawings",
    "structural detailing",
    "rebar schedule",
    "rebar quantity takeoff",
    "rebar bending schedule",
    "reinforced concrete detailing",
    "rebar 3D modeling",
    "rebar BIM",
    "rebar estimation",
    "steel reinforcement detailing",
  ],
  authors: [{ name: siteConfig.orgName, url: siteConfig.url }],
  creator: siteConfig.orgName,
  publisher: siteConfig.orgName,
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteConfig.url,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteConfig.name,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "64x64 32x32 24x24 16x16" },
      { url: "/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/web-app-manifest-192x192.png",
      },
    ],
  },
  openGraph: {
    title: "MyWorkSpace | Rebar Detailing Platform",
    description:
      "Workspace management platform featuring rebar detailing, project management, team collaboration, and business automation.",
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: siteConfig.ogImageWidth,
        height: siteConfig.ogImageHeight,
        alt: siteConfig.ogImageAlt,
      },
    ],
    locale: siteConfig.locale,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MyWorkSpace | Rebar Detailing Platform",
    description:
      "Workspace management platform featuring rebar detailing, project management, and team collaboration.",
    images: [siteConfig.ogImage],
    site: siteConfig.twitterHandle,
    creator: siteConfig.twitterHandle,
  },
  other: {
    "application-name": siteConfig.name,
    "msapplication-TileColor": "#000000",
    "msapplication-TileImage": "/web-app-manifest-192x192.png",
  },
  verification: {
    google: "IOMw7-gXRWLgu6vPpkJkPNR0a2x7cZuQWd1enWR0kI4",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = [organizationJsonLd(), webSiteJsonLd(), softwareApplicationJsonLd()];
  const apiUrl = process.env.API_URL || "http://localhost:4000";
  const cdnUrl = process.env.CDN_URL;
  const session = await auth().catch(() => null);

  return (
    <html
      lang={siteConfig.language}
      className={cn("h-full", "antialiased", roboto.variable, inter.variable)}
      suppressHydrationWarning
    >
      <head>
        {/* Resource Hints */}
        <link rel="dns-prefetch" href={apiUrl} />
        <link rel="preconnect" href={apiUrl} crossOrigin="anonymous" />
        {cdnUrl && (
          <>
            <link rel="dns-prefetch" href={cdnUrl} />
            <link rel="preconnect" href={cdnUrl} crossOrigin="anonymous" />
            <link rel="preload" href={`${cdnUrl}/web-app-manifest-192x192.png`} as="image" />
          </>
        )}
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Early Hints compatibility */}
        <meta httpEquiv="Accept-CH" content="DPR, Viewport-Width, Width" />

        {/* Loading-screen watchdog: recovers even if React hydration fails.
            If the "Loading workspace..." screen is still on screen after a few
            seconds the session fetch (or a stale service-worker shell) is hung.
            Force one hard reload per session, then show a recovery UI. */}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static watchdog script, no user input
          dangerouslySetInnerHTML={{
            __html: `
            (function () {
              if (typeof window === "undefined") return;
              var KEY = "mws-session-reload";
              function reloaded() {
                try { return sessionStorage.getItem(KEY) === "1"; } catch (e) { return false; }
              }
              function mark() {
                try { sessionStorage.setItem(KEY, "1"); } catch (e) {}
              }
              function el() { return document.getElementById("workspace-loading-screen"); }
              function showRecovery() {
                var node = el();
                if (!node) return;
                try {
                  node.innerHTML =
                    '<div style="display:flex;min-height:100vh;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:32px;text-align:center;font-family:system-ui,sans-serif;color:#0f172a;background:#fff">' +
                    '<h2 style="font-size:18px;font-weight:600;margin:0">Something went wrong</h2>' +
                    '<p style="font-size:14px;color:#64748b;max-width:420px;margin:0">The workspace is taking too long to load. Check your connection and try again.</p>' +
                    '<button onclick="location.reload()" style="padding:10px 20px;font-size:14px;font-weight:500;color:#fff;background:#0f172a;border:none;border-radius:6px;cursor:pointer">Reload</button>' +
                    "</div>";
                } catch (e) {}
              }
              function boot() {
                if (!el()) return;
                setTimeout(function () {
                  if (!el()) return;
                  if (!reloaded()) {
                    mark();
                    location.reload();
                    return;
                  }
                  setTimeout(function () {
                    showRecovery();
                    // Auto-retry: clear the flag and reload after a short
                    // countdown so the session fetch gets a fresh chance.
                    setTimeout(function () {
                      try {
                        sessionStorage.removeItem(KEY);
                      } catch (e) {}
                      location.reload();
                    }, 8000);
                  }, 10000);
                }, 20000);
              }
              if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", boot);
              } else {
                boot();
              }
            })();
            `,
          }}
        />

        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-1W2KRGMXJE" />
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static GA bootstrap, no user input
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-1W2KRGMXJE');
            `,
          }}
        />

        {/* DNS prefetch for third-party services */}
        <link rel="dns-prefetch" href="https://vercel.live" />
        <link rel="dns-prefetch" href="https://sentry.io" />

        {/* Structured Data */}
        {jsonLd.map((item, i) => {
          return (
            <script
              // biome-ignore lint/suspicious/noArrayIndexKey: static JSON-LD list, order is stable
              key={i}
              type="application/ld+json"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: static SEO JSON-LD, no user input
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(item).replace(/</g, "\\u003c"),
              }}
            />
          );
        })}
      </head>
      <body
        className="min-h-full flex flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        <Providers session={session}>
          <CsrfInterceptor />
          <ContextMenuProvider />
          <NotificationInitializer />
          <PerformanceMonitor />
          <GlobalLoader>
            <AppLayout>{children}</AppLayout>
          </GlobalLoader>
          <OfflineBanner />
          <OfflineSyncManager />
          <CookieConsentBlock />
          <Toaster richColors position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
