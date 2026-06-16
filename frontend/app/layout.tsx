import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { Providers } from "@/components/providers";
import { OfflineDetector } from "@/components/offline-detector";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "MyWorkSpace",
    template: "%s | MyWorkSpace",
  },
  description: "MyWorkSpace — the platform that transforms how your team collaborates and ships.",
  metadataBase: new URL("https://myworkspace.io"),
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
      <body className="min-h-full flex flex-col">
        <Providers>
          <OfflineDetector>{children}</OfflineDetector>
        </Providers>
      </body>
    </html>
  );
}
