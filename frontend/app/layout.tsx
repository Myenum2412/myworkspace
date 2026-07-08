import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { Providers } from "@/components/providers";
import { AppLayout } from "@/components/app-layout";
import { OfflineBanner } from "@/components/offline-banner";
import { OfflineSyncManager } from "@/components/offline-sync-manager";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
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
  title: {
    default: "MyWorkSpace",
    template: "%s | MyWorkSpace",
  },
  description: "MyWorkSpace — the platform that transforms how your team collaborates and ships.",
  metadataBase: new URL("https://myworkspace.io"),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MyWorkSpace",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "MyWorkSpace",
    description: "The platform that transforms how your team collaborates and ships.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground" suppressHydrationWarning>
        <Providers>
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
