import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";


const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.aptivo.tech'),
  title: "Aptivo",
  description: "Comprehensive Educational Platform",
  openGraph: {
    title: "Aptivo",
    description: "Comprehensive Educational Platform",
    url: 'https://www.aptivo.tech',
    siteName: 'Aptivo',
    images: [
      {
        url: '/logo.png',
        width: 1024,
        height: 1024,
        alt: 'Aptivo Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

import { LoadingProvider } from "@/lib/context/LoadingContext";
import { UIProvider } from "@/lib/context/UIContext";
import { AuthProvider } from "@/components/providers/AuthProvider";
import AIAssistant from "@/components/features/AIAssistant";
import MaintenanceGuard from "@/components/guards/MaintenanceGuard";
import { TourProvider } from "@/lib/context/TourContext";
import GuidedTour from "@/components/features/GuidedTour";
import NativeAppBridge from "@/components/providers/NativeAppBridge";
import "./ai-assistant.css";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script src="https://t.contentsquare.net/uxa/176ecc2184d1e.js"></script>
      </head>
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased bg-gray-50`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Aptivo",
              "url": "https://www.aptivo.tech",
              "logo": "https://www.aptivo.tech/logo.png"
            })
          }}
        />
        <AuthProvider>
          <LoadingProvider>
            <UIProvider>
              <TourProvider>
                <MaintenanceGuard>
                  {children}
                  <AIAssistant />
                  <GuidedTour />
                  <NativeAppBridge />
                </MaintenanceGuard>
              </TourProvider>
            </UIProvider>
          </LoadingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
