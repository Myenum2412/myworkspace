import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { Providers } from "@/components/providers";
import { AppLayout } from "@/components/app-layout";
import { ContextMenuProvider } from "@/components/context-menu-provider";
import { OfflineBanner } from "@/components/offline-banner";
import { OfflineSyncManager } from "@/components/offline-sync-manager";
import { Toaster } from "sonner";
import { NotificationInitializer } from "@/components/notification-initializer";
import CookieConsentBlock from "@/components/cookie-consent-block";
import { siteConfig, organizationJsonLd, webSiteJsonLd, softwareApplicationJsonLd } from "@/lib/seo/seo-config";
import "./globals.css";

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
    default: "MyWorkSpace | AI Detailing & Rebar Detailing Platform",
    template: "%s | MyWorkSpace",
  },
  description:
    "MyWorkSpace — AI-powered workspace management platform featuring AI detailing, rebar detailing, project management, team collaboration, and business automation. Transform your construction and engineering workflows.",
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
    // AI Detailing
    "AI detailing",
    "artificial intelligence detailing",
    "AI-powered detailing",
    "intelligent detailing automation",
    "AI detail management",
    "machine learning detailing",
    "automated detail extraction",
    "AI workflow automation",
    "smart detailing tools",
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
    title: "MyWorkSpace | AI Detailing & Rebar Detailing Platform",
    description:
      "AI-powered workspace management platform featuring AI detailing, rebar detailing, project management, team collaboration, and business automation.",
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
    title: "MyWorkSpace | AI Detailing & Rebar Detailing Platform",
    description:
      "AI-powered workspace management platform featuring AI detailing, rebar detailing, project management, and team collaboration.",
    images: [siteConfig.ogImage],
    site: siteConfig.twitterHandle,
    creator: siteConfig.twitterHandle,
  },
  other: {
    "application-name": siteConfig.name,
    "msapplication-TileColor": "#000000",
    "msapplication-TileImage": "/web-app-manifest-192x192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = [organizationJsonLd(), webSiteJsonLd(), softwareApplicationJsonLd()];
  const apiUrl = process.env.API_URL || "http://localhost:4000";
  const cdnUrl = process.env.CDN_URL;

  return (
    <html
      lang={siteConfig.language}
      className={`${roboto.variable} h-full antialiased`}
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

        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-1W2KRGMXJE" />
        <script
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
        {jsonLd.map((item, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(item).replace(/</g, "\\u003c"),
            }}
          />
        ))}
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground" suppressHydrationWarning>
        <Providers>
          <ContextMenuProvider />
          <NotificationInitializer />
          <AppLayout>
            {children}
          </AppLayout>
          <OfflineBanner />
          <OfflineSyncManager />
          <CookieConsentBlock />
          <Toaster richColors position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}