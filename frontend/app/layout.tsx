import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { Providers } from "@/components/providers";
import { AppLayout } from "@/components/app-layout";
import { OfflineBanner } from "@/components/offline-banner";
import { OfflineSyncManager } from "@/components/offline-sync-manager";
import { Toaster } from "sonner";
import { NotificationInitializer } from "@/components/notification-initializer";
import { Analytics } from "@vercel/analytics/next";
import { siteConfig, organizationJsonLd, webSiteJsonLd, softwareApplicationJsonLd } from "@/lib/seo/seo-config";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
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
    default: "MyWorkSpace",
    template: "%s | MyWorkSpace",
  },
  description:
    "MyWorkSpace — the all-in-one SaaS platform for workspace management, project management, team collaboration, task management, employee management, and business automation.",
  keywords: [
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
    title: siteConfig.name,
    description:
      "The all-in-one SaaS platform for workspace management, project management, team collaboration, and business automation.",
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
    title: siteConfig.name,
    description:
      "The all-in-one SaaS platform for workspace management, project management, team collaboration, and business automation.",
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

  return (
    <html
      lang={siteConfig.language}
      className={`${roboto.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
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
          <NotificationInitializer />
          <AppLayout>
            {children}
          </AppLayout>
          <OfflineBanner />
          <OfflineSyncManager />
          <Analytics />
          <Toaster richColors position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
